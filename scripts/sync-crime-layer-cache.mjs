#!/usr/bin/env node

const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const MAX_CRIME_FEATURES = 250;
const CRIME_LEGEND_COLORS = ['#0A8A4B', '#1F77B4', '#FF7F0E', '#D62728', '#9467BD', '#8C564B', '#17BECF', '#BCBD22'];
const CACHE_TTL_SECONDS = 24 * 60 * 60;
const SNAPSHOT_TOP_CATEGORY_LIMIT = 5;

function readEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function addSeconds(date, seconds) {
  return new Date(date.getTime() + seconds * 1000);
}

function getCentroid(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const centroid = payload.centroid;
  if (!centroid || typeof centroid !== 'object') {
    return null;
  }

  const lat = Number(centroid.lat);
  const lng = Number(centroid.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function createUnavailablePayload(options) {
  return {
    metric: 'crime',
    postcode: options.postcode,
    status: 'unavailable',
    reason: options.reason,
    legend: [],
    features: [],
  };
}

function createLegend(sortedCategories) {
  return sortedCategories.map(([category, count], index) => ({
      id: category,
      label: `${category.replaceAll('-', ' ')} (${count})`,
      color: getLegendColor(index),
      count,
    }));
}

function buildCategoryCounts(crimes) {
  return crimes.reduce((accumulator, crime) => {
    const key = typeof crime?.category === 'string' && crime.category.length > 0
      ? crime.category
      : 'other-crime';
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function humanizeCategory(category) {
  return category.replaceAll('-', ' ');
}

function createFallbackColor(index) {
  const hue = (index * 47) % 360;
  return `hsl(${hue} 68% 42%)`;
}

function getLegendColor(index) {
  return CRIME_LEGEND_COLORS[index] ?? createFallbackColor(index);
}

function normalizeCrimeFeatures(crimes) {
  return crimes
    .map((crime, index) => {
      const lat = Number(crime?.location?.latitude);
      const lng = Number(crime?.location?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      return {
        id: `${crime?.id ?? 'crime'}-${index}`,
        type: 'point',
        lat,
        lng,
        category: typeof crime?.category === 'string' && crime.category.length > 0 ? crime.category : 'other-crime',
      };
    })
    .filter((feature) => feature !== null);
}

function pickTopCrimeFeatures(options) {
  const normalizedFeatures = normalizeCrimeFeatures(options.crimes);
  if (normalizedFeatures.length <= MAX_CRIME_FEATURES) {
    return normalizedFeatures;
  }

  const topCategorySet = new Set(options.topCategoryIds);
  const topCategoryFeatures = normalizedFeatures.filter((feature) => topCategorySet.has(feature.category));
  const otherFeatures = normalizedFeatures.filter((feature) => !topCategorySet.has(feature.category));

  if (topCategoryFeatures.length === 0) {
    return normalizedFeatures.slice(0, MAX_CRIME_FEATURES);
  }

  const byCategory = new Map();
  topCategoryFeatures.forEach((feature) => {
    const queue = byCategory.get(feature.category);
    if (queue) {
      queue.push(feature);
      return;
    }

    byCategory.set(feature.category, [feature]);
  });

  const queues = Array.from(byCategory.values());
  const selected = [];
  let queueIndex = 0;

  while (selected.length < MAX_CRIME_FEATURES && queues.length > 0) {
    const queue = queues[queueIndex];
    const nextFeature = queue.shift();
    if (nextFeature) {
      selected.push(nextFeature);
    }

    if (queue.length === 0) {
      queues.splice(queueIndex, 1);
      if (queues.length === 0) {
        break;
      }
      if (queueIndex >= queues.length) {
        queueIndex = 0;
      }
      continue;
    }

    queueIndex = (queueIndex + 1) % queues.length;
  }

  if (selected.length < MAX_CRIME_FEATURES) {
    for (const feature of otherFeatures) {
      selected.push(feature);
      if (selected.length >= MAX_CRIME_FEATURES) {
        break;
      }
    }
  }

  return selected.slice(0, MAX_CRIME_FEATURES);
}

async function postgrestRequest(options) {
  const response = await fetch(options.url, {
    method: options.method ?? 'GET',
    headers: {
      apikey: options.serviceRoleKey,
      Authorization: `Bearer ${options.serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PostgREST request failed (${response.status}): ${body}`);
  }

  if (options.expectJson === false) {
    return null;
  }

  return await response.json();
}

async function fetchSnapshots(options) {
  return await postgrestRequest({
    url: `${options.supabaseUrl}/rest/v1/snapshots?select=postcode,payload`,
    serviceRoleKey: options.serviceRoleKey,
  });
}

async function insertSyncRun(options) {
  const rows = await postgrestRequest({
    url: `${options.supabaseUrl}/rest/v1/dataset_sync_runs`,
    method: 'POST',
    serviceRoleKey: options.serviceRoleKey,
    headers: {
      Prefer: 'return=representation',
    },
    body: [{
      metric: 'crime',
      status: 'running',
    }],
  });

  return rows[0]?.id;
}

async function updateSyncRun(options) {
  await postgrestRequest({
    url: `${options.supabaseUrl}/rest/v1/dataset_sync_runs?id=eq.${options.id}`,
    method: 'PATCH',
    serviceRoleKey: options.serviceRoleKey,
    headers: {
      Prefer: 'return=minimal',
    },
    body: {
      status: options.status,
      completed_at: options.completedAt.toISOString(),
      records_upserted: options.recordsUpserted,
      rate_limited_count: options.rateLimitedCount,
      error_message: options.errorMessage ?? null,
    },
    expectJson: false,
  });
}

async function upsertDatasetVersion(options) {
  await postgrestRequest({
    url: `${options.supabaseUrl}/rest/v1/dataset_versions?on_conflict=metric`,
    method: 'POST',
    serviceRoleKey: options.serviceRoleKey,
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: [{
      metric: 'crime',
      version: options.version,
      source_name: 'UK Police Data',
      ttl_seconds: CACHE_TTL_SECONDS,
      last_synced_at: options.syncedAt.toISOString(),
      next_sync_after: addSeconds(options.syncedAt, CACHE_TTL_SECONDS).toISOString(),
    }],
    expectJson: false,
  });
}

async function upsertMetricLayer(options) {
  await postgrestRequest({
    url: `${options.supabaseUrl}/rest/v1/metric_layers?on_conflict=postcode,metric`,
    method: 'POST',
    serviceRoleKey: options.serviceRoleKey,
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: [{
      postcode: options.postcode,
      metric: 'crime',
      payload: options.payload,
      source_name: 'UK Police Data',
      dataset_version: options.datasetVersion,
      fetched_at: options.fetchedAt.toISOString(),
      expires_at: options.expiresAt.toISOString(),
      updated_at: options.fetchedAt.toISOString(),
    }],
    expectJson: false,
  });
}

async function updateSnapshotPayload(options) {
  await postgrestRequest({
    url: `${options.supabaseUrl}/rest/v1/snapshots?postcode=eq.${encodeURIComponent(options.postcode)}`,
    method: 'PATCH',
    serviceRoleKey: options.serviceRoleKey,
    headers: {
      Prefer: 'return=minimal',
    },
    body: {
      payload: options.payload,
      updated_at: options.updatedAt.toISOString(),
    },
    expectJson: false,
  });
}

async function fetchCrimeLayer(options) {
  const response = await fetch(
    `https://data.police.uk/api/crimes-street/all-crime?lat=${encodeURIComponent(String(options.lat))}&lng=${encodeURIComponent(String(options.lng))}`,
  );

  if (response.status === 429) {
    return {
      status: 'rate_limited',
      payload: createUnavailablePayload({
        postcode: options.postcode,
        reason: 'Live crime provider rate-limited the sync run. Last cached data may be stale.',
      }),
    };
  }

  if (!response.ok) {
    return {
      status: 'error',
      payload: createUnavailablePayload({
        postcode: options.postcode,
        reason: `Live crime provider is unavailable (HTTP ${response.status}).`,
      }),
    };
  }

  const rawCrimes = await response.json();
  const categoryCounts = buildCategoryCounts(rawCrimes);
  const sortedCategories = Object.entries(categoryCounts)
    .sort((first, second) => second[1] - first[1]);
  const topCategories = sortedCategories
    .slice(0, SNAPSHOT_TOP_CATEGORY_LIMIT)
    .map(([category, count]) => ({
      category: humanizeCategory(category),
      count,
    }));
  const topCategoryIds = sortedCategories
    .slice(0, SNAPSHOT_TOP_CATEGORY_LIMIT)
    .map(([category]) => category);
  const [topCategory] = topCategories;

  const features = pickTopCrimeFeatures({
    crimes: rawCrimes,
    topCategoryIds,
  });

  const legend = createLegend(sortedCategories);
  return {
    status: 'success',
    payload: {
      metric: 'crime',
      postcode: options.postcode,
      status: 'available',
      sourceName: 'UK Police Data',
      lastUpdated: rawCrimes[0]?.month,
      legend,
      features,
    },
    snapshotCrimeMetrics: {
      total_incidents: rawCrimes.length,
      primary_type: topCategory?.category ?? 'Unknown',
      last_updated: typeof rawCrimes[0]?.month === 'string' && rawCrimes[0].month.length > 0
        ? rawCrimes[0].month
        : null,
      top_categories: topCategories,
    },
  };
}

async function main() {
  REQUIRED_ENV_VARS.forEach(readEnv);
  const supabaseUrl = readEnv('SUPABASE_URL');
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  const startedAt = new Date();
  const datasetVersion = `crime-${startedAt.toISOString().slice(0, 10)}`;

  const runId = await insertSyncRun({ supabaseUrl, serviceRoleKey });
  if (!runId) {
    throw new Error('Failed to create sync run row.');
  }

  let recordsUpserted = 0;
  let rateLimitedCount = 0;
  let hasProviderErrors = false;

  try {
    const snapshots = await fetchSnapshots({ supabaseUrl, serviceRoleKey });
    for (const snapshot of snapshots) {
      const postcode = snapshot.postcode;
      const centroid = getCentroid(snapshot.payload);
      const fetchedAt = new Date();
      const expiresAt = addSeconds(fetchedAt, CACHE_TTL_SECONDS);

      if (!centroid) {
        await upsertMetricLayer({
          supabaseUrl,
          serviceRoleKey,
          postcode,
          payload: createUnavailablePayload({
            postcode,
            reason: 'Snapshot centroid is missing. Cannot build crime layer cache.',
          }),
          datasetVersion,
          fetchedAt,
          expiresAt,
        });
        recordsUpserted += 1;
        continue;
      }

      const layerResult = await fetchCrimeLayer({
        postcode,
        lat: centroid.lat,
        lng: centroid.lng,
      });

      if (layerResult.status === 'rate_limited') {
        rateLimitedCount += 1;
      }

      if (layerResult.status === 'error') {
        hasProviderErrors = true;
      }

      await upsertMetricLayer({
        supabaseUrl,
        serviceRoleKey,
        postcode,
        payload: layerResult.payload,
        datasetVersion,
        fetchedAt,
        expiresAt,
      });

      if (layerResult.status === 'success') {
        const currentPayload = snapshot.payload && typeof snapshot.payload === 'object' ? snapshot.payload : {};
        const currentMetrics = currentPayload.metrics && typeof currentPayload.metrics === 'object'
          ? currentPayload.metrics
          : {};
        const currentCrime = currentMetrics.crime && typeof currentMetrics.crime === 'object'
          ? currentMetrics.crime
          : {};

        const nextCrime = {
          ...currentCrime,
          total_incidents: layerResult.snapshotCrimeMetrics.total_incidents,
          primary_type: layerResult.snapshotCrimeMetrics.primary_type,
          top_categories: layerResult.snapshotCrimeMetrics.top_categories,
          ...(layerResult.snapshotCrimeMetrics.last_updated
            ? { last_updated: layerResult.snapshotCrimeMetrics.last_updated }
            : {}),
        };

        const nextPayload = {
          ...currentPayload,
          metrics: {
            ...currentMetrics,
            crime: nextCrime,
          },
        };

        await updateSnapshotPayload({
          supabaseUrl,
          serviceRoleKey,
          postcode,
          payload: nextPayload,
          updatedAt: fetchedAt,
        });
      }
      recordsUpserted += 1;
    }

    const completedAt = new Date();
    const status = rateLimitedCount > 0 || hasProviderErrors ? 'partial' : 'success';
    await upsertDatasetVersion({
      supabaseUrl,
      serviceRoleKey,
      version: datasetVersion,
      syncedAt: completedAt,
    });

    await updateSyncRun({
      supabaseUrl,
      serviceRoleKey,
      id: runId,
      status,
      completedAt,
      recordsUpserted,
      rateLimitedCount,
      errorMessage: null,
    });

    console.log(`Crime layer sync completed with status=${status}.`);
    console.log(`Rows upserted: ${recordsUpserted}; rate limited: ${rateLimitedCount}.`);
  } catch (error) {
    const completedAt = new Date();
    await updateSyncRun({
      supabaseUrl,
      serviceRoleKey,
      id: runId,
      status: 'failed',
      completedAt,
      recordsUpserted,
      rateLimitedCount,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const MAX_CRIME_FEATURES = 250;
const CACHE_TTL_SECONDS = 24 * 60 * 60;
const BASE_COLORS = [
  "#0A8A4B",
  "#1F77B4",
  "#FF7F0E",
  "#D62728",
  "#9467BD",
  "#8C564B",
  "#17BECF",
  "#BCBD22",
];

type RawCrimeRecord = {
  readonly id?: string | number | null;
  readonly month?: string | null;
  readonly category?: string | null;
  readonly location?: {
    readonly latitude?: string | number | null;
    readonly longitude?: string | number | null;
  } | null;
};

type CrimePointFeature = {
  readonly id: string;
  readonly type: "point";
  readonly lat: number;
  readonly lng: number;
  readonly category: string;
};

type LegendBucket = {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly count: number;
};

type SnapshotPayload = {
  readonly postcode: string;
  readonly centroid: { readonly lat: number; readonly lng: number };
  readonly metrics: {
    readonly crime: {
      readonly total_incidents: number;
      readonly trend: string;
      readonly primary_type: string;
      readonly last_updated: string;
      readonly top_categories: ReadonlyArray<{ readonly category: string; readonly count: number }>;
    };
    readonly price: {
      readonly median_value: number;
      readonly trend: string;
      readonly property_type: string;
      readonly last_updated: string;
    };
    readonly flood: {
      readonly risk_level: string;
      readonly primary_source: string;
      readonly last_updated: string;
    };
  };
};

type CrimeLayerPayload = {
  readonly metric: "crime";
  readonly postcode: string;
  readonly status: "available";
  readonly sourceName: string;
  readonly lastUpdated: string;
  readonly legend: readonly LegendBucket[];
  readonly features: readonly CrimePointFeature[];
};

type HydrationFailure = {
  readonly ok: false;
  readonly status: number;
  readonly error: string;
  readonly retryAfterSeconds?: number;
};

type HydrationSuccess = {
  readonly ok: true;
  readonly snapshotPayload: SnapshotPayload;
  readonly layerPayload: CrimeLayerPayload;
  readonly datasetVersion: string;
  readonly fetchedAt: string;
  readonly expiresAt: string;
};

export type HydrationResult = HydrationFailure | HydrationSuccess;

function addSeconds(baseDate: Date, seconds: number): Date {
  return new Date(baseDate.getTime() + seconds * 1000);
}

function normalizeCategory(category: string | null | undefined): string {
  if (!category || typeof category !== "string") {
    return "other-crime";
  }

  const value = category.trim();
  return value.length > 0 ? value : "other-crime";
}

function humanizeCategory(category: string): string {
  return category.replaceAll("-", " ");
}

function buildIsoMonth(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function readRetryAfterSeconds(headerValue: string | null): number | undefined {
  if (!headerValue) {
    return undefined;
  }

  const parsed = Number.parseInt(headerValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function createFallbackColor(index: number): string {
  const hue = (index * 47) % 360;
  return `hsl(${hue} 68% 42%)`;
}

function getColorForIndex(index: number): string {
  return BASE_COLORS[index] ?? createFallbackColor(index);
}

function buildCategoryCounts(crimes: readonly RawCrimeRecord[]): Record<string, number> {
  return crimes.reduce<Record<string, number>>((accumulator, crime) => {
    const category = normalizeCategory(crime.category);
    accumulator[category] = (accumulator[category] ?? 0) + 1;
    return accumulator;
  }, {});
}

function buildSortedCategoryEntries(categoryCounts: Record<string, number>): Array<[string, number]> {
  return Object.entries(categoryCounts).sort((first, second) => second[1] - first[1]);
}

function buildLegend(sortedCategories: ReadonlyArray<[string, number]>): LegendBucket[] {
  return sortedCategories.map(([category, count], index) => ({
    id: category,
    label: `${humanizeCategory(category)} (${count})`,
    color: getColorForIndex(index),
    count,
  }));
}

function normalizeCrimeFeatures(crimes: readonly RawCrimeRecord[]): CrimePointFeature[] {
  return crimes
    .map((crime, index) => {
      const lat = Number(crime.location?.latitude);
      const lng = Number(crime.location?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      return {
        id: `${String(crime.id ?? "crime")}-${index}`,
        type: "point" as const,
        lat,
        lng,
        category: normalizeCategory(crime.category),
      };
    })
    .filter((feature): feature is CrimePointFeature => feature !== null);
}

function pickTopCrimeFeatures(options: {
  readonly crimes: readonly RawCrimeRecord[];
  readonly topCategoryIds: readonly string[];
}): CrimePointFeature[] {
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

  const byCategory = new Map<string, CrimePointFeature[]>();
  topCategoryFeatures.forEach((feature) => {
    const queue = byCategory.get(feature.category);
    if (queue) {
      queue.push(feature);
      return;
    }

    byCategory.set(feature.category, [feature]);
  });

  const queues = Array.from(byCategory.values());
  const selected: CrimePointFeature[] = [];
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

function buildTopCategories(sortedCategories: ReadonlyArray<[string, number]>) {
  return sortedCategories.slice(0, 5).map(([category, count]) => ({
    category: humanizeCategory(category),
    count,
  }));
}

function buildDefaultPriceMetric(month: string) {
  return {
    median_value: 0,
    trend: "stable",
    property_type: "Data unavailable",
    last_updated: month,
  };
}

function buildDefaultFloodMetric(month: string) {
  return {
    risk_level: "Unknown",
    primary_source: "Data unavailable",
    last_updated: month,
  };
}

function toSnapshotPayload(options: {
  readonly postcode: string;
  readonly centroid: { readonly lat: number; readonly lng: number };
  readonly providerMonth: string;
  readonly totalIncidents: number;
  readonly topCategories: ReadonlyArray<{ readonly category: string; readonly count: number }>;
  readonly existingPayload?: unknown;
}): SnapshotPayload {
  const existing = typeof options.existingPayload === "object" && options.existingPayload !== null
    ? options.existingPayload as Record<string, unknown>
    : {};
  const existingMetrics = typeof existing.metrics === "object" && existing.metrics !== null
    ? existing.metrics as Record<string, unknown>
    : {};
  const existingCrime = typeof existingMetrics.crime === "object" && existingMetrics.crime !== null
    ? existingMetrics.crime as Record<string, unknown>
    : {};
  const existingPrice = typeof existingMetrics.price === "object" && existingMetrics.price !== null
    ? existingMetrics.price as Record<string, unknown>
    : {};
  const existingFlood = typeof existingMetrics.flood === "object" && existingMetrics.flood !== null
    ? existingMetrics.flood as Record<string, unknown>
    : {};

  const primaryType = options.topCategories[0]?.category ?? "Unknown";

  return {
    postcode: options.postcode,
    centroid: options.centroid,
    metrics: {
      crime: {
        total_incidents: options.totalIncidents,
        trend: typeof existingCrime.trend === "string" && existingCrime.trend.length > 0
          ? existingCrime.trend
          : "stable",
        primary_type: primaryType,
        last_updated: options.providerMonth,
        top_categories: options.topCategories,
      },
      price: {
        ...buildDefaultPriceMetric(options.providerMonth),
        ...existingPrice,
        last_updated: typeof existingPrice.last_updated === "string" && existingPrice.last_updated.length > 0
          ? existingPrice.last_updated
          : options.providerMonth,
      },
      flood: {
        ...buildDefaultFloodMetric(options.providerMonth),
        ...existingFlood,
        last_updated: typeof existingFlood.last_updated === "string" && existingFlood.last_updated.length > 0
          ? existingFlood.last_updated
          : options.providerMonth,
      },
    },
  };
}

async function fetchPostcodeCentroid(postcode: string) {
  const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
  if (response.status === 404) {
    return {
      ok: false as const,
      status: 404,
      error: "Postcode not found. Please enter a valid UK postcode.",
    };
  }

  if (!response.ok) {
    return {
      ok: false as const,
      status: 502,
      error: `Postcode lookup is unavailable right now (HTTP ${response.status}).`,
    };
  }

  const payload = await response.json() as {
    readonly result?: {
      readonly latitude?: number | null;
      readonly longitude?: number | null;
    } | null;
  };
  const lat = Number(payload.result?.latitude);
  const lng = Number(payload.result?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      ok: false as const,
      status: 502,
      error: "Postcode lookup did not return coordinates.",
    };
  }

  return {
    ok: true as const,
    centroid: { lat, lng },
  };
}

async function fetchCrimeRecords(options: { readonly lat: number; readonly lng: number }) {
  const response = await fetch(
    `https://data.police.uk/api/crimes-street/all-crime?lat=${encodeURIComponent(String(options.lat))}&lng=${encodeURIComponent(String(options.lng))}`,
  );

  if (response.status === 429) {
    const retryAfterSeconds = readRetryAfterSeconds(response.headers.get("Retry-After"));
    return {
      ok: false as const,
      status: 429,
      error: "Live crime data provider is temporarily rate-limiting requests. Please try again shortly.",
      retryAfterSeconds,
    };
  }

  if (!response.ok) {
    return {
      ok: false as const,
      status: 502,
      error: `Live crime data provider is unavailable (HTTP ${response.status}).`,
    };
  }

  const records = await response.json() as RawCrimeRecord[];
  return {
    ok: true as const,
    records: Array.isArray(records) ? records : [],
  };
}

function createSupabaseClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

export function normalizePostcodeInput(postcode: string): string {
  return postcode.toUpperCase().replace(/\s+/g, " ").trim();
}

export async function hydrateSnapshotAndCrimeLayer(options: {
  readonly supabaseUrl: string;
  readonly serviceRoleKey: string;
  readonly postcode: string;
}): Promise<HydrationResult> {
  const postcode = normalizePostcodeInput(options.postcode);
  const now = new Date();
  const supabase = createSupabaseClient(options.supabaseUrl, options.serviceRoleKey);

  const centroidResult = await fetchPostcodeCentroid(postcode);
  if (!centroidResult.ok) {
    return centroidResult;
  }

  const crimeResult = await fetchCrimeRecords({
    lat: centroidResult.centroid.lat,
    lng: centroidResult.centroid.lng,
  });
  if (!crimeResult.ok) {
    return crimeResult;
  }

  const providerMonth = crimeResult.records[0]?.month && typeof crimeResult.records[0].month === "string"
    ? crimeResult.records[0].month
    : buildIsoMonth(now);
  const categoryCounts = buildCategoryCounts(crimeResult.records);
  const sortedCategories = buildSortedCategoryEntries(categoryCounts);
  const topCategories = buildTopCategories(sortedCategories);
  const topCategoryIds = sortedCategories.slice(0, 5).map(([category]) => category);
  const features = pickTopCrimeFeatures({
    crimes: crimeResult.records,
    topCategoryIds,
  });
  const legend = buildLegend(sortedCategories);
  const datasetVersion = `crime-${providerMonth}`;
  const fetchedAt = now.toISOString();
  const expiresAt = addSeconds(now, CACHE_TTL_SECONDS).toISOString();

  const { data: existingSnapshotRow, error: existingSnapshotError } = await supabase
    .from("snapshots")
    .select("payload")
    .eq("postcode", postcode)
    .maybeSingle();

  if (existingSnapshotError) {
    console.error("Failed to read existing snapshot row during hydration:", existingSnapshotError.message);
    return {
      ok: false,
      status: 500,
      error: "Failed to hydrate postcode data.",
    };
  }

  const snapshotPayload = toSnapshotPayload({
    postcode,
    centroid: centroidResult.centroid,
    providerMonth,
    totalIncidents: crimeResult.records.length,
    topCategories,
    existingPayload: existingSnapshotRow?.payload,
  });

  const layerPayload: CrimeLayerPayload = {
    metric: "crime",
    postcode,
    status: "available",
    sourceName: "UK Police Data",
    lastUpdated: providerMonth,
    legend,
    features,
  };

  const { error: snapshotWriteError } = await supabase
    .from("snapshots")
    .upsert(
      {
        postcode,
        payload: snapshotPayload,
        updated_at: fetchedAt,
      },
      { onConflict: "postcode" },
    );

  if (snapshotWriteError) {
    console.error("Failed to upsert snapshot row during hydration:", snapshotWriteError.message);
    return {
      ok: false,
      status: 500,
      error: "Failed to persist snapshot data.",
    };
  }

  const { error: layerWriteError } = await supabase
    .from("metric_layers")
    .upsert(
      {
        postcode,
        metric: "crime",
        payload: layerPayload,
        source_name: "UK Police Data",
        dataset_version: datasetVersion,
        fetched_at: fetchedAt,
        expires_at: expiresAt,
        updated_at: fetchedAt,
      },
      { onConflict: "postcode,metric" },
    );

  if (layerWriteError) {
    console.error("Failed to upsert crime layer row during hydration:", layerWriteError.message);
    return {
      ok: false,
      status: 500,
      error: "Failed to persist crime layer data.",
    };
  }

  return {
    ok: true,
    snapshotPayload,
    layerPayload,
    datasetVersion,
    fetchedAt,
    expiresAt,
  };
}

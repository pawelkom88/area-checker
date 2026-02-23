#!/usr/bin/env node

const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

const SNAPSHOT_SEEDS = [
  {
    postcode: 'SW1A 1AA',
    payload: {
      postcode: 'SW1A 1AA',
      centroid: { lat: 51.501, lng: -0.141 },
      metrics: {
        crime: {
          total_incidents: 142,
          trend: 'down',
          primary_type: 'Anti-social behaviour',
          last_updated: '2023-11',
        },
        price: {
          median_value: 1250000,
          trend: 'up',
          property_type: 'Flat',
          last_updated: '2023-10',
        },
        flood: {
          risk_level: 'Low',
          primary_source: 'Surface Water',
          last_updated: '2024-01',
        },
      },
    },
  },
];

function readEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
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

async function upsertSnapshots(options) {
  await postgrestRequest({
    url: `${options.supabaseUrl}/rest/v1/snapshots?on_conflict=postcode`,
    method: 'POST',
    serviceRoleKey: options.serviceRoleKey,
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: options.rows.map((row) => ({
      postcode: row.postcode,
      payload: row.payload,
      updated_at: new Date().toISOString(),
    })),
    expectJson: false,
  });
}

async function main() {
  REQUIRED_ENV_VARS.forEach(readEnv);
  const supabaseUrl = readEnv('SUPABASE_URL');
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');

  await upsertSnapshots({
    supabaseUrl,
    serviceRoleKey,
    rows: SNAPSHOT_SEEDS,
  });

  console.log(`Seeded ${SNAPSHOT_SEEDS.length} snapshot row(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

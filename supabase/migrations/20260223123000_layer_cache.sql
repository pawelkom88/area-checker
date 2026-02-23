CREATE TABLE public.metric_layers (
    postcode text NOT NULL,
    metric text NOT NULL CHECK (metric IN ('crime', 'price', 'flood')),
    payload jsonb NOT NULL,
    source_name text,
    dataset_version text NOT NULL,
    fetched_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (postcode, metric)
);

CREATE INDEX metric_layers_metric_expires_idx
ON public.metric_layers (metric, expires_at);

ALTER TABLE public.metric_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to metric layers"
ON public.metric_layers
FOR SELECT
TO public
USING (true);

CREATE TABLE public.dataset_versions (
    metric text PRIMARY KEY CHECK (metric IN ('crime', 'price', 'flood')),
    version text NOT NULL,
    source_name text NOT NULL,
    ttl_seconds integer NOT NULL DEFAULT 86400 CHECK (ttl_seconds > 0),
    last_synced_at timestamp with time zone,
    next_sync_after timestamp with time zone
);

CREATE TABLE public.dataset_sync_runs (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    metric text NOT NULL CHECK (metric IN ('crime', 'price', 'flood')),
    status text NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
    started_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at timestamp with time zone,
    records_upserted integer NOT NULL DEFAULT 0,
    rate_limited_count integer NOT NULL DEFAULT 0,
    error_message text
);

INSERT INTO public.dataset_versions (metric, version, source_name, ttl_seconds, last_synced_at, next_sync_after)
VALUES (
    'crime',
    'crime-seed-v1',
    'UK Police Data',
    86400,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()) + interval '1 day'
)
ON CONFLICT (metric) DO UPDATE
SET
    version = EXCLUDED.version,
    source_name = EXCLUDED.source_name,
    ttl_seconds = EXCLUDED.ttl_seconds,
    last_synced_at = EXCLUDED.last_synced_at,
    next_sync_after = EXCLUDED.next_sync_after;

INSERT INTO public.metric_layers (
    postcode,
    metric,
    payload,
    source_name,
    dataset_version,
    fetched_at,
    expires_at
)
VALUES (
    'SW1A 1AA',
    'crime',
    '{
      "metric": "crime",
      "postcode": "SW1A 1AA",
      "status": "available",
      "sourceName": "UK Police Data",
      "lastUpdated": "2025-12",
      "legend": [
        {
          "id": "anti-social-behaviour",
          "label": "anti social behaviour (2)",
          "color": "#0A8A4B"
        },
        {
          "id": "vehicle-crime",
          "label": "vehicle crime (1)",
          "color": "#1F77B4"
        }
      ],
      "features": [
        {
          "id": "crime-seed-1",
          "type": "point",
          "lat": 51.50110,
          "lng": -0.14120,
          "category": "anti-social-behaviour"
        },
        {
          "id": "crime-seed-2",
          "type": "point",
          "lat": 51.50090,
          "lng": -0.14090,
          "category": "anti-social-behaviour"
        },
        {
          "id": "crime-seed-3",
          "type": "point",
          "lat": 51.50070,
          "lng": -0.14150,
          "category": "vehicle-crime"
        }
      ]
    }'::jsonb,
    'UK Police Data',
    'crime-seed-v1',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()) + interval '1 day'
)
ON CONFLICT (postcode, metric) DO UPDATE
SET
    payload = EXCLUDED.payload,
    source_name = EXCLUDED.source_name,
    dataset_version = EXCLUDED.dataset_version,
    fetched_at = EXCLUDED.fetched_at,
    expires_at = EXCLUDED.expires_at,
    updated_at = timezone('utc'::text, now());

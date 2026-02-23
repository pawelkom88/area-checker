-- Create the snapshots table to store our aggregated postcode data
CREATE TABLE public.snapshots (
    postcode text PRIMARY KEY,
    payload jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) but make it readable by everyone for now 
-- (Our Netlify edge function will use the Anon key, or Service Role key)
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to snapshots"
ON public.snapshots
FOR SELECT
TO public
USING (true);

-- Insert our dummy "Hello Snapshot" data so the frontend has something real to query
INSERT INTO public.snapshots (postcode, payload)
VALUES (
    'SW1A 1AA',
    '{
      "postcode": "SW1A 1AA",
      "centroid": { "lat": 51.501, "lng": -0.141 },
      "metrics": {
        "crime": {
          "total_incidents": 142,
          "trend": "down",
          "primary_type": "Anti-social behaviour",
          "last_updated": "2023-11"
        },
        "price": {
          "median_value": 1250000,
          "trend": "up",
          "property_type": "Flat",
          "last_updated": "2023-10"
        },
        "flood": {
          "risk_level": "Low",
          "primary_source": "Surface Water",
          "last_updated": "2024-01"
        }
      }
    }'::jsonb
);

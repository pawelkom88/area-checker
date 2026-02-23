import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

type MetricId = "crime" | "price" | "flood";

type CrimePointFeature = {
  readonly id: string;
  readonly type: "point";
  readonly lat: number;
  readonly lng: number;
  readonly category: string;
};

const METRIC_IDS: readonly MetricId[] = ["crime", "price", "flood"];
const CRIME_LEGEND_COLORS = ["#0A8A4B", "#1F77B4", "#FF7F0E", "#D62728", "#9467BD"];
const MAX_CRIME_FEATURES = 250;

function jsonResponse(payload: unknown, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function normalizePostcodeInput(postcode: string): string {
  return postcode.toUpperCase().replace(/\s+/g, " ").trim();
}

function parseMetric(rawMetric: string | null): MetricId | null {
  if (!rawMetric) {
    return null;
  }

  const nextMetric = rawMetric.toLowerCase() as MetricId;
  return METRIC_IDS.includes(nextMetric) ? nextMetric : null;
}

function getCentroid(payload: unknown): { readonly lat: number; readonly lng: number } | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const centroid = (payload as { centroid?: unknown }).centroid;
  if (typeof centroid !== "object" || centroid === null) {
    return null;
  }

  const lat = Number((centroid as { lat?: unknown }).lat);
  const lng = Number((centroid as { lng?: unknown }).lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function buildUnavailableLayer(metric: MetricId, postcode: string) {
  const reason =
    metric === "price"
      ? "Property-price map layer is not available yet. We need monthly Land Registry ingest first."
      : "Flood-risk map layer is not available yet. We need Environment Agency polygon ingest first.";

  return {
    metric,
    postcode,
    status: "unavailable" as const,
    reason,
    legend: [],
    features: [],
  };
}

async function fetchCrimeLayer(options: {
  readonly postcode: string;
  readonly lat: number;
  readonly lng: number;
}) {
  const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${encodeURIComponent(String(options.lat))}&lng=${encodeURIComponent(String(options.lng))}`;
  const upstreamResponse = await fetch(url);

  if (upstreamResponse.status === 429) {
    const retryAfterHeader = upstreamResponse.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : 60;

    return {
      type: "rate_limited" as const,
      retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 60,
    };
  }

  if (!upstreamResponse.ok) {
    return {
      type: "upstream_error" as const,
      status: upstreamResponse.status,
    };
  }

  const rawCrimes = await upstreamResponse.json() as Array<{
    id?: number | null;
    month?: string;
    category?: string;
    location?: {
      latitude?: string;
      longitude?: string;
    } | null;
  }>;

  const features = rawCrimes
    .map((crime, index): CrimePointFeature | null => {
      const lat = Number(crime.location?.latitude);
      const lng = Number(crime.location?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      return {
        id: `${crime.id ?? "crime"}-${index}`,
        type: "point",
        lat,
        lng,
        category: crime.category ?? "other-crime",
      };
    })
    .filter((feature): feature is CrimePointFeature => feature !== null)
    .slice(0, MAX_CRIME_FEATURES);

  const categoryCounts = features.reduce<Record<string, number>>((accumulator, feature) => {
    accumulator[feature.category] = (accumulator[feature.category] ?? 0) + 1;
    return accumulator;
  }, {});

  const legend = Object.entries(categoryCounts)
    .sort((first, second) => second[1] - first[1])
    .slice(0, CRIME_LEGEND_COLORS.length)
    .map(([category, count], index) => ({
      id: category,
      label: `${category.replaceAll("-", " ")} (${count})`,
      color: CRIME_LEGEND_COLORS[index],
    }));

  return {
    type: "success" as const,
    payload: {
      metric: "crime" as const,
      postcode: options.postcode,
      status: "available" as const,
      sourceName: "UK Police Data",
      lastUpdated: rawCrimes[0]?.month,
      legend,
      features,
    },
  };
}

export default async function handler(req: Request) {
  if (req.method !== "GET") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const url = new URL(req.url);
  const postcodeParam = url.searchParams.get("postcode");
  const metric = parseMetric(url.searchParams.get("metric"));

  if (!postcodeParam) {
    return jsonResponse({ error: "Postcode is required." }, 400);
  }

  if (!metric) {
    return jsonResponse({ error: "Metric must be one of: crime, price, flood." }, 400);
  }

  const normalizedPostcode = normalizePostcodeInput(postcodeParam);

  const supabaseUrl = Netlify.env.get("SUPABASE_URL");
  const supabaseKey = Netlify.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return jsonResponse({ error: "Internal Server Configuration Error" }, 500);
  }

  if (metric !== "crime") {
    return jsonResponse(buildUnavailableLayer(metric, normalizedPostcode), 200, {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from("snapshots")
    .select("payload")
    .eq("postcode", normalizedPostcode)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return jsonResponse({ error: "No snapshot available for this postcode yet." }, 404, {
        "Cache-Control": "public, max-age=300",
      });
    }

    return jsonResponse({ error: "Failed to fetch snapshot data" }, 500);
  }

  const centroid = getCentroid(data.payload);
  if (!centroid) {
    return jsonResponse({ error: "Snapshot centroid is missing. Please try another postcode." }, 422);
  }

  const layerResult = await fetchCrimeLayer({
    postcode: normalizedPostcode,
    lat: centroid.lat,
    lng: centroid.lng,
  });

  if (layerResult.type === "rate_limited") {
    return jsonResponse(
      {
        error: "Live crime data provider is temporarily rate-limiting requests. Please try again shortly.",
        retryAfterSeconds: layerResult.retryAfterSeconds,
      },
      429,
      {
        "Retry-After": String(layerResult.retryAfterSeconds),
        "Cache-Control": "public, max-age=30, s-maxage=30",
      },
    );
  }

  if (layerResult.type === "upstream_error") {
    return jsonResponse(
      { error: "Live crime data is temporarily unavailable. Please try again shortly." },
      502,
      {
        "Cache-Control": "public, max-age=60",
      },
    );
  }

  return jsonResponse(layerResult.payload, 200, {
    "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
  });
}

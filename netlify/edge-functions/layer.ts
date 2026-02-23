import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { hydrateSnapshotAndCrimeLayer, normalizePostcodeInput } from "./_lib/postcode-hydration.ts";

type MetricId = "crime" | "price" | "flood";

const METRIC_IDS: readonly MetricId[] = ["crime", "price", "flood"];

function jsonResponse(payload: unknown, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function parseMetric(rawMetric: string | null): MetricId | null {
  if (!rawMetric) {
    return null;
  }

  const metric = rawMetric.toLowerCase() as MetricId;
  return METRIC_IDS.includes(metric) ? metric : null;
}

function buildUnavailableLayer(options: { readonly metric: MetricId; readonly postcode: string; readonly reason: string }) {
  return {
    metric: options.metric,
    postcode: options.postcode,
    status: "unavailable",
    reason: options.reason,
    legend: [],
    features: [],
  };
}

function buildEtag(options: {
  readonly metric: MetricId;
  readonly postcode: string;
  readonly datasetVersion: string;
  readonly fetchedAt: string;
}): string {
  return `W/"${options.metric}:${options.postcode}:${options.datasetVersion}:${options.fetchedAt}"`;
}

function hasMatchingEtag(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get("if-none-match");
  if (!ifNoneMatch) {
    return false;
  }

  return ifNoneMatch
    .split(",")
    .map((value) => value.trim())
    .includes(etag);
}

function getCacheControl(isStale: boolean): string {
  if (isStale) {
    return "public, max-age=60, s-maxage=60, stale-while-revalidate=300";
  }

  return "public, s-maxage=3600, stale-while-revalidate=86400";
}

function mergePayloadWithCacheMetadata(options: {
  readonly payload: unknown;
  readonly datasetVersion: string;
  readonly fetchedAt: string;
  readonly expiresAt: string;
  readonly isStale: boolean;
}) {
  if (typeof options.payload !== "object" || options.payload === null) {
    return options.payload;
  }

  return {
    ...options.payload as Record<string, unknown>,
    datasetVersion: options.datasetVersion,
    cacheFetchedAt: options.fetchedAt,
    cacheExpiresAt: options.expiresAt,
    cacheStale: options.isStale,
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
  const serviceRoleKey = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return jsonResponse({ error: "Internal Server Configuration Error" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from("metric_layers")
    .select("payload, dataset_version, fetched_at, expires_at")
    .eq("postcode", normalizedPostcode)
    .eq("metric", metric)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      if (metric === "crime" && serviceRoleKey) {
        const hydrationResult = await hydrateSnapshotAndCrimeLayer({
          supabaseUrl,
          serviceRoleKey,
          postcode: normalizedPostcode,
        });

        if (!hydrationResult.ok) {
          return jsonResponse(
            {
              error: hydrationResult.error,
              retryAfterSeconds: hydrationResult.retryAfterSeconds,
            },
            hydrationResult.status,
            hydrationResult.retryAfterSeconds
              ? { "Retry-After": String(hydrationResult.retryAfterSeconds) }
              : undefined,
          );
        }

        const datasetVersion = hydrationResult.datasetVersion;
        const fetchedAt = hydrationResult.fetchedAt;
        const expiresAt = hydrationResult.expiresAt;
        const etag = buildEtag({
          metric,
          postcode: normalizedPostcode,
          datasetVersion,
          fetchedAt,
        });
        const isStale = Date.parse(expiresAt) <= Date.now();
        const cacheControl = getCacheControl(isStale);
        const responsePayload = mergePayloadWithCacheMetadata({
          payload: hydrationResult.layerPayload,
          datasetVersion,
          fetchedAt,
          expiresAt,
          isStale,
        });

        if (hasMatchingEtag(req, etag)) {
          return new Response(null, {
            status: 304,
            headers: {
              "Cache-Control": cacheControl,
              ETag: etag,
              "X-Data-Version": datasetVersion,
              "X-Data-Stale": String(isStale),
            },
          });
        }

        return jsonResponse(responsePayload, 200, {
          "Cache-Control": cacheControl,
          ETag: etag,
          "X-Data-Version": datasetVersion,
          "X-Data-Stale": String(isStale),
          "Last-Modified": fetchedAt,
        });
      }

      return jsonResponse(
        buildUnavailableLayer({
          metric,
          postcode: normalizedPostcode,
          reason: "Layer cache is not ready yet. Please try again later.",
        }),
        200,
        {
          "Cache-Control": "public, max-age=300",
        },
      );
    }

    console.error("Layer cache query failed:", error.message);
    return jsonResponse({ error: "Failed to fetch layer cache data." }, 500);
  }

  const datasetVersion = typeof data.dataset_version === "string" ? data.dataset_version : "unknown";
  const fetchedAt = typeof data.fetched_at === "string" ? data.fetched_at : new Date().toISOString();
  const expiresAt = typeof data.expires_at === "string" ? data.expires_at : fetchedAt;
  const etag = buildEtag({
    metric,
    postcode: normalizedPostcode,
    datasetVersion,
    fetchedAt,
  });
  const isStale = Date.parse(expiresAt) <= Date.now();
  const cacheControl = getCacheControl(isStale);
  const responsePayload = mergePayloadWithCacheMetadata({
    payload: data.payload,
    datasetVersion,
    fetchedAt,
    expiresAt,
    isStale,
  });

  if (hasMatchingEtag(req, etag)) {
    return new Response(null, {
      status: 304,
      headers: {
        "Cache-Control": cacheControl,
        ETag: etag,
        "X-Data-Version": datasetVersion,
        "X-Data-Stale": String(isStale),
      },
    });
  }

  return jsonResponse(responsePayload, 200, {
    "Cache-Control": cacheControl,
    ETag: etag,
    "X-Data-Version": datasetVersion,
    "X-Data-Stale": String(isStale),
    "Last-Modified": fetchedAt,
  });
}

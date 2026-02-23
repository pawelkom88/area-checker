import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { hydrateSnapshotAndCrimeLayer, normalizePostcodeInput } from "./_lib/postcode-hydration.ts";

export default async function handler(req: Request) {
    // Only allow GET requests
    if (req.method !== "GET") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    const url = new URL(req.url);
    const postcodeParam = url.searchParams.get("postcode");

    if (!postcodeParam) {
        return new Response(JSON.stringify({ error: "Postcode is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const normalizedPostcode = normalizePostcodeInput(postcodeParam);

    // Initialize Supabase. 
    // Netlify Edge Functions automatically have access to process.env or Deno.env if configured in Netlify UI.
    // We'll use Netlify.env.get() which is standard for Edge Functions.
    const supabaseUrl = Netlify.env.get("SUPABASE_URL");
    const supabaseKey = Netlify.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase environment variables");
        return new Response(JSON.stringify({ error: "Internal Server Configuration Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { data, error } = await supabase
            .from("snapshots")
            .select("payload")
            .eq("postcode", normalizedPostcode)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                if (!serviceRoleKey) {
                    return new Response(JSON.stringify({ error: "No snapshot available for this postcode yet." }), {
                        status: 404,
                        headers: {
                            "Content-Type": "application/json",
                            "Cache-Control": "public, max-age=3600",
                        },
                    });
                }

                const hydrationResult = await hydrateSnapshotAndCrimeLayer({
                    supabaseUrl,
                    serviceRoleKey,
                    postcode: normalizedPostcode,
                });

                if (!hydrationResult.ok) {
                    return new Response(
                        JSON.stringify({
                            error: hydrationResult.error,
                            retryAfterSeconds: hydrationResult.retryAfterSeconds,
                        }),
                        {
                            status: hydrationResult.status,
                            headers: {
                                "Content-Type": "application/json",
                                ...(hydrationResult.retryAfterSeconds
                                    ? { "Retry-After": String(hydrationResult.retryAfterSeconds) }
                                    : {}),
                            },
                        },
                    );
                }

                return new Response(JSON.stringify(hydrationResult.snapshotPayload), {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
                    },
                });
            }
            throw error;
        }

        // Return the JSON payload with aggressive edge caching
        return new Response(JSON.stringify(data.payload), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                // Cache at the edge for 1 hour, stale-while-revalidate for an additional 24 hours
                "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
            },
        });

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Supabase query failed:", errorMessage);
        return new Response(JSON.stringify({ error: "Failed to fetch snapshot data" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

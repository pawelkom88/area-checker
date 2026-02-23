import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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

    // Normalize postcode: uppercase, strip multiple spaces, trim
    const normalizedPostcode = postcodeParam.toUpperCase().replace(/\s+/g, " ").trim();

    // Initialize Supabase. 
    // Netlify Edge Functions automatically have access to process.env or Deno.env if configured in Netlify UI.
    // We'll use Netlify.env.get() which is standard for Edge Functions.
    const supabaseUrl = Netlify.env.get("SUPABASE_URL");
    const supabaseKey = Netlify.env.get("SUPABASE_ANON_KEY");

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
                // PostgREST 116 = no rows returned from .single()
                return new Response(JSON.stringify({ error: "No snapshot available for this postcode yet." }), {
                    status: 404,
                    headers: {
                        "Content-Type": "application/json",
                        // Cache 404s for 1 hour to prevent hammering the DB for non-existent postcodes
                        "Cache-Control": "public, max-age=3600"
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

    } catch (err: any) {
        console.error("Supabase query failed:", err.message);
        return new Response(JSON.stringify({ error: "Failed to fetch snapshot data" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

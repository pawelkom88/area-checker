# UK Area Snapshot — To-Do List

## Priority Roadmap (P0 / P1 / P2)

### P0 — Must Ship Next (Correctness + Shareability + Stability)
- [ ] Define and document a stable map overlay API contract: `postcode`, `metric`, `bounds`, `zoom`, optional `radius`, and `datasetVersion`.
- [ ] Implement first two real overlays (replace placeholders): `flood` (polygon) and `crime` (points/density).
- [ ] Run initial `crime` cache population (`node scripts/sync-crime-layer-cache.mjs`) after migration in each target environment.
- [ ] Wire overlay state to URL params so deep links are shareable/reloadable (`layers`, `showOnMap`, optional `radius`).
- [ ] Add viewport-aware + debounced map fetching to prevent request storms on pan/zoom.
- [ ] Add graceful unavailable states per layer (no crashes, clear copy in drawer + legend).
- [ ] Add targeted tests: deep-link overlay hydration, toggle-on/toggle-off behavior, and invalid param sanitization.

### P1 — Performance + Caching Hardening
- [ ] Add `ETag` support for snapshot/layer endpoints and conditional requests (`If-None-Match` -> `304`).
- [ ] Version cache keys by dataset version (`datasetVersion`) to make invalidation deterministic.
- [ ] Extend edge caching policy for layer endpoints (`s-maxage` + `stale-while-revalidate`) with per-layer TTLs.
- [ ] Add client-side persistence for recent snapshot/layer payloads (`IndexedDB`) with TTL + size cap.
- [ ] Normalize TanStack Query keys for overlays (`metric`, normalized postcode, viewport bucket, zoom bucket).
- [ ] Prefetch likely next query on metric-details navigation to reduce perceived latency.

### P2 — Scale + Advanced Map Rendering
- [ ] Add render budgets by zoom (max features per layer + fallback aggregation) to keep FPS stable on mobile.
- [ ] Add clustering/simplification pipeline for large point/polygon layers.
- [ ] Add optional heatmap/choropleth mode for density-style layers where aggregation is clearer than raw points.
- [ ] Introduce viewport partitioning strategy (tile/chunk-based payloads) for large geospatial datasets.
- [ ] Add performance instrumentation dashboard (request counts, cache hit ratio, median toggle latency, JS heap guardrails).
- [ ] Add regression checks for drawer/map interactions under heavy overlay load (mobile + desktop).

## Phase 0: Foundations & "Hello Snapshot"
- [x] Initialize Vite React + TypeScript repository.
- [x] Set up global vanilla CSS (`theme.css` / `index.css`) with Apple-like UI variables (colors, fonts, radius).
- [x] Create Supabase project & `snapshot` table (`postcode` PK, `payload` JSONB).
- [ ] Seed Supabase with 3 dummy postcodes (e.g., SW1A 1AA) and sample JSON payloads.
- [x] Set up Netlify deployment & create `/api/snapshot` Edge Function.
- [x] Implement Netlify Edge Function logic to normalization inputs and fetch from Supabase.
- [x] Create React `Layout` and `SearchInput` component with micro-transitions (focus effects, shake on error).
- [x] Create `SkeletonCard` loading states and minimal error states.
- [x] Verify End-to-End: enter dummy postcode -> API call -> render cards (Current: Mocked locally).

## Phase 1: Real Snapshot MVP (Data & Bento UI)
- [x] Define the definitive v1 JSON Payload schema (Metrics, Sources, Timestamps).
- [x] Hand-code the Bento Box UI Grid using pure CSS (`Dashboard.tsx`).
- [x] Create Metric Cards components (Crime, Median Price, Flood) with `border-radius`, 1px subtle borders, hover lift effects.
- [ ] Set up the first GitHub Action ETL script (Node.js/Python).
- [ ] In GitHub Action: Download UK Police & ONS Postcode data (for a subset of postcodes).
- [ ] In GitHub Action: Compute spatial aggregates (e.g., 1km radius).
- [ ] In GitHub Action: `UPSERT` precomputed JSON payloads into Supabase `snapshot` table.
- [x] Test the UI with real data appearing from Supabase.

## Phase 2: Minimalist Map Exploration
- [x] Install `react-leaflet`.
- [x] Implement Map Component adjacent to the Bento UI grid.
- [x] Apply CSS filters to OpenStreetMap tiles (`grayscale`, `contrast`, `brightness` or `invert` for dark mode).
- [ ] Build custom HTML/CSS toggle switch components for data layers.
- [ ] Implement Netlify edge caching for requested GeoJSON files/layers.
- [ ] Overlay custom SVG markers and GeoJSON on the map based on toggles.
- [ ] Implement `IndexedDB` client-side caching for recent postcode snapshots and tiles.

## Phase 2.5: Routing & Shareable UX
- [x] Add TanStack Router with route tree (`/` and `/details`).
- [x] Support URL-driven search hydration via `?postcode=...`.
- [x] Navigate metric cards to deep-linkable details route (`/details?postcode=...&metric=...`).
- [x] Add compact clickable metric cards in summary drawer.
- [x] Add details drawer with Back navigation and map-toggle control.
- [x] Add map legend/placeholder state for unavailable metric layers.
- [x] Add frontend layer interfaces and disabled query stub for next-phase overlay APIs.
- [x] Add router-level tests for URL params, deep links, and map-toggle behavior.

## Phase 3: The Zero-Cost Automated Pipeline
- [ ] Write Python/Node ingest scripts for Schools, GPs, and Broadband datasets.
- [ ] Write Python/Node ingest scripts for Flood Zones and Air Quality.
- [ ] Add daily scheduled sync for crime cache (`scripts/sync-crime-layer-cache.mjs`) once the app is production-ready.
- [ ] Setup GitHub Actions `cron` schedules for each dataset (monthly, quarterly).
- [ ] Implement partial `UPSERT` logic so scripts only update relevant fields in the `snapshot_json` payload.
- [ ] Add error reporting/webhooks for Github Actions pipeline failures (e.g., Slack/Discord).

## Phase 4: Edge Optimization & Polish
- [ ] Configure aggressive Netlify `Cache-Control` (`s-maxage`, `stale-while-revalidate`) in Edge Functions.
- [ ] Implement `ETag` handling for instant UI updates when data refreshes.
- [ ] Refine all CSS micro-transitions (bezier easing, hover states, skeleton loaders).
- [ ] Ensure perfect keyboard navigation and accessibility focus states.
- [ ] Review and fix mobile responsiveness (Bento grid stacking rules).
- [ ] Design attractive "Empty States" for postcodes missing specific metrics.
- [ ] Final Lighthouse audit (target: 95+ performance/accessibility).

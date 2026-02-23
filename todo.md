# UK Area Snapshot — To-Do List

## Phase 0: Foundations & "Hello Snapshot"
- [ ] Initialize Vite React + TypeScript repository.
- [ ] Set up global vanilla CSS (`theme.css`) with Apple-like UI variables (colors, fonts, radius).
- [ ] Create Supabase project & `snapshot` table (`postcode` PK, `payload` JSONB).
- [ ] Seed Supabase with 3 dummy postcodes (e.g., SW1A 1AA) and sample JSON payloads.
- [ ] Set up Netlify deployment & create `/api/snapshot` Edge Function.
- [ ] Implement Netlify Edge Function logic to normalization inputs and fetch from Supabase.
- [ ] Create React `Layout` and `SearchInput` component with micro-transitions (focus effects, shake on error).
- [ ] Create `SkeletonCard` loading states and minimal error states.
- [ ] Verify End-to-End: enter dummy postcode -> API call -> render cards.

## Phase 1: Real Snapshot MVP (Data & Bento UI)
- [ ] Define the definitive v1 JSON Payload schema (Metrics, Sources, Timestamps).
- [ ] Hand-code the Bento Box UI Grid using pure CSS.
- [ ] Create Metric Cards components (Crime, Median Price, Flood) with `border-radius`, 1px subtle borders, hover lift effects.
- [ ] Set up the first GitHub Action ETL script (Node.js/Python).
- [ ] In GitHub Action: Download UK Police & ONS Postcode data (for a subset of postcodes).
- [ ] In GitHub Action: Compute spatial aggregates (e.g., 1km radius).
- [ ] In GitHub Action: `UPSERT` precomputed JSON payloads into Supabase `snapshot` table.
- [ ] Test the UI with real data appearing from Supabase.

## Phase 2: Minimalist Map Exploration
- [ ] Install `react-leaflet`.
- [ ] Implement Map Component adjacent to the Bento UI grid.
- [ ] Apply CSS filters to OpenStreetMap tiles (`grayscale`, `contrast`, `brightness` or `invert` for dark mode).
- [ ] Build custom HTML/CSS toggle switch components for data layers.
- [ ] Implement Netlify edge caching for requested GeoJSON files/layers.
- [ ] Overlay custom SVG markers and GeoJSON on the map based on toggles.
- [ ] Implement `IndexedDB` client-side caching for recent postcode snapshots and tiles.

## Phase 3: The Zero-Cost Automated Pipeline
- [ ] Write Python/Node ingest scripts for Schools, GPs, and Broadband datasets.
- [ ] Write Python/Node ingest scripts for Flood Zones and Air Quality.
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

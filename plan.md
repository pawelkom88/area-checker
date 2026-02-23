# UK Area Snapshot — Phased Development Plan (Apple-like & 100% Free)

## Core System Context & Constraints

- **Design Language**: Apple-like minimalism. Heavy use of whitespace, CSS grid (Bento-box layouts), system fonts (San Francisco/SF Pro/Inter), smooth spring-like micro-transitions, backdrop-filters (glassmorphism), and subtle shadows. **Zero UI libraries.**
- **Tech Stack**: React (Vite), Netlify (Hosting & Edge Functions), Supabase (PostgreSQL + PostGIS, 500MB Free Tier limits), GitHub Actions (Compute/Cron jobs), `react-leaflet` with OpenStreetMap.
- **Data Strategy**: Precomputed aggregates only. We will use GitHub Actions (2000 free minutes/mo) to process heavy datasets in-memory and only push the final `snapshot_json` to Supabase to stay well within the free 500MB limit.
- **Caching**: Extreme reliance on Netlify Edge Caching (`s-maxage`) so Supabase is rarely queried directly.

---

## Phase 0 — Foundations & "Hello Snapshot"

**Goal:** Establish the Vite React app, the custom CSS design system conventions, Netlify Edge routing, and the Supabase database scaffolding. Deliver a beautiful, animated search bar that returns a mocked JSON response.

**User Experience:**
*   A pristine, centered landing screen with a single, large input field.
*   **Micro-transitions**: When the user focuses the input, a subtle box-shadow blooms. On submit, the search bar smooth-scrolls to the top, and beautiful custom CSS skeleton loaders fade in.
*   Invalid postcodes trigger a gentle side-to-side shake animation (no jarring red alerts).

**System Behavior:**
1.  React calls `GET /api/snapshot?postcode=SW1A1AA`.
2.  Netlify Edge Function intercepts, normalizes the string, and queries Supabase.
3.  Calculates and assigns edge caching headers.
4.  Returns dummy data for Phase 0.

**Implementation Steps:**
1.  **Repo Setup:** Initialize Vite (React + TS) and set up vanilla CSS (or CSS modules) with a base `theme.css` defining Apple-style spacing, colors, and layout roots.
2.  **Database:** Initialize Supabase. Create the `snapshot` table (`postcode` PK, `payload` JSONB) and insert 3 dummy rows.
3.  **API:** Write the Netlify Edge Function to query the `snapshot` table.
4.  **UI:** Build the `SearchInput` component, `Layout` container, and `SkeletonCard` components using pure CSS animations.

**Exit Criteria for Phase 0:**
*   Netlify + Supabase linked.
*   User can enter a dummy postcode, see Apple-like transitions, and get a rendered page of dummy metric cards.

---

## Phase 1 — Real Snapshot MVP (Data & Bento UI)

**Goal:** Build the custom UI cards for real metrics and construct the first fully working GitHub Action data pipeline.

**User Experience:**
*   The raw JSON dummy data is replaced by a "Bento Box" grid of custom-built cards.
*   Cards will have Apple-esque details: `border-radius: 20px`, 1px subtle borders, clean typography, and a hover state that slightly lifts the card with a smooth `ease-out` transition.
*   Each card cleanly displays the metric, a source link, and "Updated X days ago".

**System Behavior:**
*   Write a GitHub Action (Node.js/Python) that downloads 2 real datasets (e.g., UK Police API and ONS Postcode centroids).
*   The Action processes spatial proximity mathematically *in the runner* (to save Supabase DB strain) and upserts the precomputed JSON payloads to Supabase.

**Implementation Steps:**
1.  **Frontend:** Hand-code the metric cards (Crime, Median Price, Environment) using CSS Grid. 
2.  **Data Ingestion:** Write the first GitHub Action ETL script to fetch, clean, and push real data for a small subset of postcodes to prove the pipeline.
3.  **Contracts:** Finalize the exact JSON structure the Edge function sends to the React app.

**Exit Criteria for Phase 1:**
*   Cards display real data from Supabase for at least a few test postcodes.
*   Hover states and layouts look premium and cohesive.

---

## Phase 2 — Minimalist Map Exploration

**Goal:** Integrate OpenStreetMap without breaking the premium Apple aesthetic, completely free of charge.

**User Experience:**
*   A map panel appears alongside the Bento grid.
*   **Design Hack**: Standard OSM tiles can look cluttered. We will apply CSS `filter: grayscale(100%) contrast(120%) brightness(110%);` (or a dark-mode invert) to the `<canvas>`/tiles so the map looks like a custom, premium vector map.
*   Custom-designed SVG markers and interactive layering toggles (built like iOS switch components).

**System Behavior:**
*   The snapshot endpoint already returns coordinates.
*   Map layers (e.g., Crime hotspots or Flood zones) are fetched only if toggled, utilizing Netlify edge caching for GeoJSON files.
*   Implement `IndexedDB` caching for the map tiles so repeat visits cost zero bandwidth.

**Implementation Steps:**
1.  Install `react-leaflet`.
2.  Apply CSS filters to the OSM tile layer.
3.  Build custom HTML/CSS toggle switches.
4.  Render spatial data (GeoJSON) directly onto the map context.

**Exit Criteria for Phase 2:**
*   Map renders cleanly with custom aesthetics.
*   User can toggle data layers on/off without lag.

---

## Phase 3 — The Zero-Cost Automated Pipeline

**Goal:** Automate the entire UK dataset refresh cycle exclusively using GitHub Actions cron jobs so you never pay for compute.

**System Behavior:**
*   Separate GitHub Action workflows for different datasets (monthly for Land Registry, quarterly for OFCOM, etc.).
*   Scripts download raw CSVs/APIs, merge them with the existing `snapshot` JSONs in Supabase, and perform partial `UPSERT`s.
*   This ensures your Supabase database stays under 100MB by only storing the final Postcode JSONs, while GitHub handles the gigabytes of raw data ingestion.

**Implementation Steps:**
1.  Write Python/Node ingest scripts for remaining datasets (Schools, GPs, Broadband, Floods).
2.  Set up GitHub Actions schedules (`cron`).
3.  Add basic error reporting (e.g., sending a Slack/Discord webhook if a government URL changes and breaks the pipeline).

**Exit Criteria for Phase 3:**
*   All required datasets have automated ingestion pipelines.
*   Supabase storage limits are respected.

---

## Phase 4 — Edge Optimization & Polish

**Goal:** Maximize Netlify Edge caching and perfect the UI/UX details to make the app feel native.

**User Experience:**
*   Lightning-fast loads.
*   Focus state management for keyboard navigation (Accessibility).
*   Perfectly responsive on Mobile (stacking the Bento grid smoothly).
*   Empty states (when data is missing for a postcode) look intentional and designed, not broken.

**System Behavior:**
*   Netlify Edge function is updated with aggressive `Cache-Control` headers (e.g., Cache for 30 days, revalidate in background).
*   Implement `ETag` versioning so if you force a data refresh, users instantly get the new UI.

**Implementation Steps:**
1.  Tune Edge caching headers natively in Netlify.
2.  Refine all CSS transitions (adjust bezier curves for native feel).
3.  Audit mobile responsiveness and touch targets.

**Exit Criteria for Phase 4:**
*   Performance passes lighthouse score > 95.
*   Mobile layout is flawless.
*   Cache hit rates are highly optimal.

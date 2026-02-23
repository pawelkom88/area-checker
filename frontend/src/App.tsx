import React, { useReducer, useState, useEffect, Activity } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { MapPin, ShieldAlert, Home, Droplets, Menu } from 'lucide-react';
import { motion, useAnimationControls } from 'motion/react';
import type { PanInfo } from 'motion/react';
import { MetricCard } from './components/MetricCard';

// Type definitions
export type SnapshotMetric<T> = Readonly<T>;
export type SnapshotData = {
  readonly postcode: string;
  readonly centroid: { readonly lat: number; readonly lng: number };
  readonly metrics: {
    readonly crime: SnapshotMetric<{ total_12m: number; vs_borough_avg_pct: number }>;
    readonly property: SnapshotMetric<{ median_price_12m: number; sample_size: number }>;
    readonly flood_risk: SnapshotMetric<{ classification: string; details: string }>;
  };
  readonly sources: {
    readonly crime: SnapshotMetric<{ name: string; url: string; last_updated: string }>;
    readonly property: SnapshotMetric<{ name: string; url: string; last_updated: string }>;
    readonly flood_risk: SnapshotMetric<{ name: string; url: string; last_updated: string }>;
  };
};

const MOCK_DATA: Record<string, SnapshotData> = {
  'SW1A 1AA': {
    postcode: 'SW1A 1AA',
    centroid: { lat: 51.501, lng: -0.1416 },
    metrics: {
      crime: { total_12m: 124, vs_borough_avg_pct: -12.5 },
      property: { median_price_12m: 1250000, sample_size: 14 },
      flood_risk: { classification: 'Low', details: 'Very low risk of surface water flooding' },
    },
    sources: {
      crime: { name: 'UK Police API', url: 'https://data.police.uk', last_updated: '2026-01-31' },
      property: { name: 'HM Land Registry', url: 'https://landregistry.gov.uk', last_updated: '2025-12-01' },
      flood_risk: { name: 'Environment Agency', url: 'https://gov.uk/check-long-term-flood-risk', last_updated: '2025-11-15' },
    }
  }
};

const normalizePostcode = (p: string) => p.toUpperCase().replace(/\s+/g, ' ').trim();

function MapViewUpdater({ centroid }: { readonly centroid: { readonly lat: number; readonly lng: number } | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (centroid) {
      // Offset center slightly to account for the side panel on desktop
      const isDesktop = window.innerWidth >= 769;
      if (isDesktop) {
        // Move target to the right side of the screen
        map.flyTo([centroid.lat, centroid.lng - 0.02], 14, { animate: true, duration: 1.5 });
      } else {
        // Move target slightly up to account for bottom sheet limit
        map.flyTo([centroid.lat - 0.01, centroid.lng], 14, { animate: true, duration: 1.5 });
      }
    }
  }, [centroid, map]);
  return null;
}

// State Machine
type SearchState = {
  readonly postcode: string;
  readonly loading: boolean;
  readonly error: string;
  readonly data: SnapshotData | null;
  readonly hasSearched: boolean;
  readonly drawerExpanded: boolean;
};

type SearchAction =
  | { type: 'SET_POSTCODE'; payload: string }
  | { type: 'START_SEARCH' }
  | { type: 'FETCH_SUCCESS'; payload: SnapshotData }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'RESET_SEARCH' }
  | { type: 'TOGGLE_DRAWER'; payload: boolean };

const initialState: SearchState = {
  postcode: '',
  loading: false,
  error: '',
  data: null,
  hasSearched: false,
  drawerExpanded: false,
};

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SET_POSTCODE':
      return { ...state, postcode: action.payload };
    case 'START_SEARCH':
      return { ...state, loading: true, error: '', data: null, hasSearched: true, drawerExpanded: true };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload, error: '', drawerExpanded: true };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error, data: null, drawerExpanded: true };
    case 'TOGGLE_DRAWER':
      return { ...state, drawerExpanded: action.payload };
    case 'RESET_SEARCH':
      return { ...state, postcode: '', loading: false, error: '', data: null, hasSearched: false, drawerExpanded: false };
    default:
      return state;
  }
}

const DEFAULT_CENTER = { lat: 54.5, lng: -2.0 };

export default function App() {
  const [state, dispatch] = useReducer(searchReducer, initialState);

  // Responsive hook
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile(); // initial
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Motion Controls for Bottom Sheet
  const controls = useAnimationControls();

  // Determine if the sheet is "expanded"
  const isExpanded = state.drawerExpanded && (state.loading || state.data !== null || state.error !== '');

  // React to state changes to animate the drawer height automatically on mobile
  useEffect(() => {
    if (isMobile) {
      if (isExpanded) {
        controls.start({ y: 0 }); // Pull up slightly to show content
      } else {
        controls.start({ y: 'calc(100% - 240px)' }); // Rest state
      }
    } else {
      controls.set({ y: 0 }); // Desktop doesn't transform Y
    }
  }, [isExpanded, isMobile, controls]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.postcode.trim()) return;

    dispatch({ type: 'START_SEARCH' });

    setTimeout(() => {
      const normalized = normalizePostcode(state.postcode);
      if (normalized.includes('SW1') || normalized === 'SW1A 1AA') {
        dispatch({ type: 'FETCH_SUCCESS', payload: MOCK_DATA['SW1A 1AA'] });
      } else {
        dispatch({ type: 'FETCH_ERROR', error: 'No snapshot available for this postcode yet.' });
      }
    }, 1200);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isMobile) return;

    // If dragging down hard or far enough, collapse the drawer to preserve state visually
    if (info.velocity.y > 200 || info.offset.y > 100) {
      dispatch({ type: 'TOGGLE_DRAWER', payload: false });
    } else if (info.velocity.y < -200 || info.offset.y < -100) {
      // Swipe up to expand if data exists
      if (state.hasSearched) {
        dispatch({ type: 'TOGGLE_DRAWER', payload: true });
      } else {
        controls.start({ y: 'calc(100% - 240px)' });
      }
    } else {
      // Snap back to current state
      if (isExpanded) {
        controls.start({ y: 0 });
      } else {
        controls.start({ y: 'calc(100% - 240px)' });
      }
    }
  };

  const currentCentroid = state.data?.centroid ?? null;

  return (
    <>
      <div className="map-container">
        <MapContainer
          center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
          zoom={6}
          zoomControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewUpdater centroid={currentCentroid} />
          {currentCentroid && (
            <Marker position={[currentCentroid.lat, currentCentroid.lng]} />
          )}
        </MapContainer>
      </div>

      <div className="top-controls">
        <button className="pill-button" onClick={() => dispatch({ type: 'RESET_SEARCH' })}>
          <Menu size={20} />
          Area Snapshot
        </button>
      </div>

      <motion.div
        className="app-overlay-panel"
        animate={controls}
        initial={isMobile ? { y: 'calc(100% - 240px)' } : { y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        drag={isMobile ? "y" : false}
        dragConstraints={{ top: 0, bottom: window.innerHeight - 240 }}
        dragElastic={0.05}
        onDragEnd={handleDragEnd}
      >
        <div className="bottom-sheet-handle" />
        <div className="bottom-sheet-header">
          <h2 className="bottom-sheet-title">
            {state.data ? state.data.postcode : 'Search Region'}
          </h2>
        </div>

        <form onSubmit={handleSearch} className="input-group">
          <label htmlFor="postcode-search" className="sr-only">UK Postcode</label>
          <div className="input-field">
            <MapPin size={24} color="var(--color-dark-gray)" aria-hidden="true" />
            <input
              id="postcode-search"
              name="postcode-search"
              type="search"
              autoComplete="postal-code"
              placeholder="Enter postcode..."
              value={state.postcode}
              onChange={(e) => dispatch({ type: 'SET_POSTCODE', payload: e.target.value })}
            />
          </div>
          {state.error && <p className="error-text fade-in-up" role="alert">{state.error}</p>}
          <button type="submit" className="btn-primary" disabled={state.loading} aria-busy={state.loading}>
            {state.loading ? 'Searching...' : 'Search Region'}
          </button>
        </form>

        <div className="scroll-area" onPointerDown={(e) => {
          // Stop drag propagation when scrolling the content area on mobile
          if (isMobile) e.stopPropagation();
        }}>
          {/* Use React 19 Activity to keep the search results rendered but dormant when drawer is collapsed */}
          <Activity mode={isExpanded || !isMobile ? 'visible' : 'hidden'}>
            {(state.loading || state.data) && (
              <div className="metric-list">
                {state.loading ? (
                  <>
                    <MetricCard loading title="" value="" description="" icon={ShieldAlert} sourceName="" sourceUrl="" lastUpdated="" />
                    <MetricCard loading title="" value="" description="" icon={Home} sourceName="" sourceUrl="" lastUpdated="" />
                    <MetricCard loading title="" value="" description="" icon={Droplets} sourceName="" sourceUrl="" lastUpdated="" />
                  </>
                ) : state.data ? (
                  <>
                    <MetricCard
                      title="Crime & Safety"
                      value={`${state.data.metrics.crime.total_12m} incidents`}
                      description={`${Math.abs(state.data.metrics.crime.vs_borough_avg_pct)}% ${state.data.metrics.crime.vs_borough_avg_pct < 0 ? 'lower' : 'higher'} than borough average.`}
                      icon={ShieldAlert}
                      sourceName={state.data.sources.crime.name}
                      sourceUrl={state.data.sources.crime.url}
                      lastUpdated={state.data.sources.crime.last_updated}
                    />
                    <MetricCard
                      title="Property Prices"
                      value={`£${state.data.metrics.property.median_price_12m.toLocaleString()}`}
                      description={`Median sold price over the last 12 months (${state.data.metrics.property.sample_size} sales).`}
                      icon={Home}
                      sourceName={state.data.sources.property.name}
                      sourceUrl={state.data.sources.property.url}
                      lastUpdated={state.data.sources.property.last_updated}
                    />
                    <MetricCard
                      title="Flood Risk"
                      value={state.data.metrics.flood_risk.classification}
                      description={state.data.metrics.flood_risk.details}
                      icon={Droplets}
                      sourceName={state.data.sources.flood_risk.name}
                      sourceUrl={state.data.sources.flood_risk.url}
                      lastUpdated={state.data.sources.flood_risk.last_updated}
                    />
                  </>
                ) : null}
              </div>
            )}
          </Activity>
        </div>
      </motion.div>
    </>
  );
}

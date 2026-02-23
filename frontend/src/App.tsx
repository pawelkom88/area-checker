import React, { useReducer } from 'react';
import { MapPin, ShieldAlert, Home, Droplets } from 'lucide-react';
import { MetricCard } from './components/MetricCard';

// Type definitions to remove `any`
export type SnapshotMetric<T> = Readonly<T>;

export type SnapshotData = {
  readonly postcode: string;
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

// State Machine for Search
type SearchState = {
  readonly postcode: string;
  readonly loading: boolean;
  readonly error: string;
  readonly data: SnapshotData | null;
  readonly hasSearched: boolean;
};

type SearchAction =
  | { type: 'SET_POSTCODE'; payload: string }
  | { type: 'START_SEARCH' }
  | { type: 'FETCH_SUCCESS'; payload: SnapshotData }
  | { type: 'FETCH_ERROR'; error: string };

const initialState: SearchState = {
  postcode: '',
  loading: false,
  error: '',
  data: null,
  hasSearched: false,
};

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SET_POSTCODE':
      return { ...state, postcode: action.payload };
    case 'START_SEARCH':
      return { ...state, loading: true, error: '', data: null, hasSearched: true };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload, error: '' };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error, data: null };
    default:
      return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(searchReducer, initialState);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.postcode.trim()) return;

    dispatch({ type: 'START_SEARCH' });

    // Mock network request
    setTimeout(() => {
      const normalized = normalizePostcode(state.postcode);
      if (normalized.includes('SW1') || normalized === 'SW1A 1AA') {
        dispatch({ type: 'FETCH_SUCCESS', payload: MOCK_DATA['SW1A 1AA'] });
      } else {
        dispatch({ type: 'FETCH_ERROR', error: 'No snapshot available for this postcode yet.' });
      }
    }, 1200);
  };

  return (
    <div className="container">
      <div className={`search-container ${!state.hasSearched ? 'centered' : ''}`}>
        {!state.hasSearched && <h1>UK Area Snapshot</h1>}
        <form onSubmit={handleSearch}>
          <div className={`search-input-wrapper glass ${state.error ? 'shake' : ''}`}>
            <MapPin size={24} style={{ color: 'var(--text-secondary)', marginRight: '12px' }} />
            <input
              type="text"
              placeholder="Enter a UK Postcode (e.g. SW1A 1AA)"
              value={state.postcode}
              onChange={(e) => dispatch({ type: 'SET_POSTCODE', payload: e.target.value })}
              aria-label="UK Postcode"
            />
            <button type="submit" disabled={state.loading}>
              {state.loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
        {state.error && <div className="error-text fade-in-up">{state.error}</div>}
      </div>

      {(state.loading || state.data) && (
        <div className="bento-grid">
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
    </div>
  );
}

export default App;

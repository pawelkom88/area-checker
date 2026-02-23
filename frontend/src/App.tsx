import React, { Suspense, useState, useTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { Menu } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { Dashboard } from './pages/Dashboard';
import { toError } from './helpers/error';
import { snapshotQueryKeys, useSnapshotQuery } from './hooks/useSnapshotQuery';
import { parsePostcodeInput } from './utils/postcode';

export type SnapshotMetric<T> = Readonly<T>;
export type SnapshotData = {
  readonly postcode: string;
  readonly centroid: { readonly lat: number; readonly lng: number };
  readonly metrics: {
    readonly crime: SnapshotMetric<{ total_incidents: number; trend: string; primary_type: string; last_updated: string }>;
    readonly price: SnapshotMetric<{ median_value: number; trend: string; property_type: string; last_updated: string }>;
    readonly flood: SnapshotMetric<{ risk_level: string; primary_source: string; last_updated: string }>;
  };
};

const DEFAULT_CENTER = { lat: 54.5, lng: -2.0 };
type DashboardBaseProps = {
  readonly isMobile: boolean;
  readonly drawerExpanded: boolean;
  readonly setDrawerExpanded: (expanded: boolean) => void;
  readonly setIsDesktopSidebarOpen: (open: boolean) => void;
  readonly handleSearch: (event: React.FormEvent<HTMLFormElement>) => void;
};

type SnapshotDashboardProps = DashboardBaseProps & {
  readonly postcode: string;
};

function MapViewUpdater({ centroid }: { readonly centroid: { readonly lat: number; readonly lng: number } | null }) {
  const map = useMap();

  React.useEffect(() => {
    if (!centroid) {
      return;
    }

    map.panTo([centroid.lat, centroid.lng], { animate: true, duration: 1.2 });
  }, [centroid, map]);

  return null;
}

function SnapshotDashboard({
  postcode,
  isMobile,
  drawerExpanded,
  setDrawerExpanded,
  setIsDesktopSidebarOpen,
  handleSearch,
}: SnapshotDashboardProps) {
  const { data } = useSnapshotQuery(postcode);

  return (
    <Dashboard
      isMobile={isMobile}
      data={data}
      isLoading={false}
      error={null}
      drawerExpanded={drawerExpanded}
      setDrawerExpanded={setDrawerExpanded}
      setIsDesktopSidebarOpen={setIsDesktopSidebarOpen}
      handleSearch={handleSearch}
    />
  );
}

export default function App() {
  const queryClient = useQueryClient();
  const [activePostcode, setActivePostcode] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<Error | null>(null);
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [, startSearchTransition] = useTransition();

  const [isMobile] = useState(() => window.innerWidth <= 768);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rawPostcode = formData.get('postcode-search');
    const parsedPostcode = parsePostcodeInput(rawPostcode);

    if (!parsedPostcode.success) {
      setValidationError(new Error(parsedPostcode.error.issues[0]?.message ?? 'Please enter a valid UK postcode.'));
      return;
    }

    setValidationError(null);
    setDrawerExpanded(true);
    setIsDesktopSidebarOpen(true);

    startSearchTransition(() => {
      setActivePostcode(parsedPostcode.data);
    });
  };

  const activeSnapshot =
    activePostcode != null
      ? queryClient.getQueryData<SnapshotData>(snapshotQueryKeys.byPostcode(activePostcode)) ?? null
      : null;

  const currentCentroid = activeSnapshot?.centroid ?? null;

  const dashboardBaseProps: DashboardBaseProps = {
    isMobile,
    drawerExpanded,
    setDrawerExpanded,
    setIsDesktopSidebarOpen,
    handleSearch,
  };

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
          {currentCentroid && <Marker position={[currentCentroid.lat, currentCentroid.lng]} />}
        </MapContainer>
      </div>

      {!isDesktopSidebarOpen && (
        <button
          className="desktop-menu-btn"
          onClick={() => setIsDesktopSidebarOpen(true)}
          aria-label="Open Search Panel"
        >
          <Menu size={24} />
        </button>
      )}

      {isDesktopSidebarOpen && (
        <>
          {!activePostcode && (
            <Dashboard
              {...dashboardBaseProps}
              data={undefined}
              isLoading={false}
              error={validationError}
            />
          )}

          {activePostcode && (
            <ErrorBoundary
              resetKeys={[activePostcode]}
              fallbackRender={({ error }) => (
                <Dashboard
                  {...dashboardBaseProps}
                  data={activeSnapshot ?? undefined}
                  isLoading={false}
                  error={toError(error)}
                />
              )}
            >
              <Suspense
                fallback={
                  <Dashboard
                    {...dashboardBaseProps}
                    data={activeSnapshot ?? undefined}
                    isLoading
                    error={null}
                  />
                }
              >
                <SnapshotDashboard {...dashboardBaseProps} postcode={activePostcode} />
              </Suspense>
            </ErrorBoundary>
          )}
        </>
      )}
    </>
  );
}

import { Suspense, useEffect, useState, useTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createRoute, useNavigate } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import type { MetricId } from '../constants/metrics';
import { toError } from '../helpers/error';
import { snapshotQueryKeys, useSnapshotQuery } from '../hooks/useSnapshotQuery';
import { Dashboard } from '../pages/Dashboard';
import type { SnapshotData } from '../types/snapshot';
import { parsePostcodeInput } from '../utils/postcode';
import { MapShell } from '../components/layout/MapShell';
import { rootRoute } from './root';
import { parseHomeSearch } from './searchParsers';

type HomeDashboardBaseProps = {
  readonly isMobile: boolean;
  readonly defaultPostcode?: string;
  readonly drawerExpanded: boolean;
  readonly setDrawerExpanded: (expanded: boolean) => void;
  readonly setIsDesktopSidebarOpen: (open: boolean) => void;
  readonly handleSearch: (event: React.FormEvent<HTMLFormElement>) => void;
  readonly onMetricSelect: (metric: MetricId) => void;
};

type SnapshotDashboardProps = HomeDashboardBaseProps & {
  readonly postcode: string;
};

function SnapshotDashboard({
  postcode,
  isMobile,
  defaultPostcode,
  drawerExpanded,
  setDrawerExpanded,
  setIsDesktopSidebarOpen,
  handleSearch,
  onMetricSelect,
}: SnapshotDashboardProps) {
  const { data } = useSnapshotQuery(postcode);

  return (
    <Dashboard
      isMobile={isMobile}
      defaultPostcode={defaultPostcode}
      data={data}
      isLoading={false}
      error={null}
      drawerExpanded={drawerExpanded}
      setDrawerExpanded={setDrawerExpanded}
      setIsDesktopSidebarOpen={setIsDesktopSidebarOpen}
      handleSearch={handleSearch}
      onMetricSelect={onMetricSelect}
    />
  );
}

function HomeRouteComponent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: homeRoute.fullPath });
  const search = homeRoute.useSearch();

  const [validationError, setValidationError] = useState<Error | null>(null);
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [, startSearchTransition] = useTransition();

  const [isMobile] = useState(() => window.innerWidth <= 768);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  const parsedRoutePostcode = parsePostcodeInput(search.postcode);
  const activePostcode = parsedRoutePostcode.success ? parsedRoutePostcode.data : null;

  useEffect(() => {
    if (search.postcode && !parsedRoutePostcode.success) {
      navigate({
        to: '/',
        search: {},
        replace: true,
      });
    }
  }, [navigate, parsedRoutePostcode.success, search.postcode]);

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
      navigate({
        to: '/',
        search: { postcode: parsedPostcode.data },
      });
    });
  };

  const handleMetricSelect = (metric: MetricId) => {
    if (!activePostcode) {
      return;
    }

    navigate({
      to: '/details',
      search: {
        postcode: activePostcode,
        metric,
      },
    });
  };

  const activeSnapshot =
    activePostcode != null
      ? queryClient.getQueryData<SnapshotData>(snapshotQueryKeys.byPostcode(activePostcode)) ?? null
      : null;

  const dashboardBaseProps: HomeDashboardBaseProps = {
    isMobile,
    defaultPostcode: activePostcode ?? undefined,
    drawerExpanded,
    setDrawerExpanded,
    setIsDesktopSidebarOpen,
    handleSearch,
    onMetricSelect: handleMetricSelect,
  };

  return (
    <>
      <MapShell centroid={activeSnapshot?.centroid ?? null} isMobile={isMobile} />

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

export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: parseHomeSearch,
  component: HomeRouteComponent,
});

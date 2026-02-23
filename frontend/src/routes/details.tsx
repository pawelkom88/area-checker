import { Suspense, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createRoute, redirect, useNavigate } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { motion } from 'motion/react';
import { ErrorBoundary } from 'react-error-boundary';
import type { MetricId } from '../constants/metrics';
import { toError } from '../helpers/error';
import { useMetricLayerQuery } from '../hooks/useMetricLayerQuery';
import { snapshotQueryKeys, useSnapshotQuery } from '../hooks/useSnapshotQuery';
import type { SnapshotData } from '../types/snapshot';
import { MetricDetailsDrawer } from '../components/details/MetricDetailsDrawer';
import { MapShell } from '../components/layout/MapShell';
import { rootRoute } from './root';
import { parseDetailsSearch } from './searchParsers';

type DetailsDrawerBaseProps = {
  readonly isMobile: boolean;
  readonly metric: MetricId;
  readonly drawerExpanded: boolean;
  readonly setDrawerExpanded: (expanded: boolean) => void;
  readonly isDesktopSidebarOpen: boolean;
  readonly setIsDesktopSidebarOpen: (open: boolean) => void;
  readonly showOnMap: boolean;
  readonly setShowOnMap: (visible: boolean) => void;
  readonly onBack: () => void;
};

type SnapshotDetailsDrawerProps = DetailsDrawerBaseProps & {
  readonly postcode: string;
};

function SnapshotDetailsDrawer({
  postcode,
  isMobile,
  metric,
  drawerExpanded,
  setDrawerExpanded,
  isDesktopSidebarOpen,
  setIsDesktopSidebarOpen,
  showOnMap,
  setShowOnMap,
  onBack,
}: SnapshotDetailsDrawerProps) {
  const { data } = useSnapshotQuery(postcode);

  useMetricLayerQuery({ postcode, metric, enabled: false });

  return (
    <MetricDetailsDrawer
      isMobile={isMobile}
      metric={metric}
      data={data}
      isLoading={false}
      error={null}
      drawerExpanded={drawerExpanded}
      setDrawerExpanded={setDrawerExpanded}
      isDesktopSidebarOpen={isDesktopSidebarOpen}
      setIsDesktopSidebarOpen={setIsDesktopSidebarOpen}
      showOnMap={showOnMap}
      setShowOnMap={setShowOnMap}
      onBack={onBack}
    />
  );
}

function DetailsRouteComponent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: detailsRoute.fullPath });
  const search = detailsRoute.useSearch();

  const postcode = search.postcode as string;
  const metric = search.metric as MetricId;

  const [drawerExpanded, setDrawerExpanded] = useState(true);
  const [showOnMap, setShowOnMap] = useState(false);

  const [isMobile] = useState(() => window.innerWidth <= 768);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  const activeSnapshot =
    queryClient.getQueryData<SnapshotData>(snapshotQueryKeys.byPostcode(postcode)) ?? null;

  const drawerBaseProps: DetailsDrawerBaseProps = {
    isMobile,
    metric,
    drawerExpanded,
    setDrawerExpanded,
    isDesktopSidebarOpen,
    setIsDesktopSidebarOpen,
    showOnMap,
    setShowOnMap,
    onBack: () => navigate({ to: '/', search: { postcode } }),
  };

  return (
    <>
      <MapShell
        centroid={activeSnapshot?.centroid ?? null}
        activeMetric={metric}
        showMapOverlay={showOnMap}
      />

      {!isDesktopSidebarOpen && (
        <motion.button
          layoutId="desktop-panel"
          className="desktop-menu-btn"
          onClick={() => setIsDesktopSidebarOpen(true)}
          transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
          aria-label="Open Details Panel"
        >
          <Menu size={24} />
        </motion.button>
      )}

      {isDesktopSidebarOpen && (
        <ErrorBoundary
          resetKeys={[postcode, metric]}
          fallbackRender={({ error }) => (
            <MetricDetailsDrawer
              {...drawerBaseProps}
              data={activeSnapshot ?? undefined}
              isLoading={false}
              error={toError(error)}
            />
          )}
        >
          <Suspense
            fallback={
              <MetricDetailsDrawer
                {...drawerBaseProps}
                data={activeSnapshot ?? undefined}
                isLoading
                error={null}
              />
            }
          >
            <SnapshotDetailsDrawer {...drawerBaseProps} postcode={postcode} />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
}

export const detailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/details',
  validateSearch: parseDetailsSearch,
  beforeLoad: ({ search }) => {
    if (search.postcode && search.metric) {
      return;
    }

    throw redirect({
      to: '/',
      search: search.postcode ? { postcode: search.postcode } : {},
    });
  },
  component: DetailsRouteComponent,
});

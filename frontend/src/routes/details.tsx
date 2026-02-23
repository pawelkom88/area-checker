import { Suspense, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createRoute, redirect, useNavigate } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { motion } from 'motion/react';
import { ErrorBoundary } from 'react-error-boundary';
import type { MetricId } from '../constants/metrics';
import { metricMeta } from '../constants/metrics';
import { HttpError } from '../api/client';
import { toError } from '../helpers/error';
import { useMetricLayerQuery } from '../hooks/useMetricLayerQuery';
import { snapshotQueryKeys, useSnapshotQuery } from '../hooks/useSnapshotQuery';
import type { MetricLayerResponse } from '../types/layers';
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
  readonly mapStatusMessage: string;
  readonly onBack: () => void;
};

type SnapshotDetailsDrawerProps = DetailsDrawerBaseProps & {
  readonly postcode: string;
};

function getRateLimitMessage(error: HttpError): string {
  const retryAfter = error.retryAfterSeconds;
  if (retryAfter && retryAfter > 0) {
    return `Live provider is temporarily rate-limiting requests. Please try again in about ${retryAfter} seconds.`;
  }

  return 'Live provider is temporarily rate-limiting requests. Please try again in about a minute.';
}

function getMapStatusMessage(options: {
  readonly metric: MetricId;
  readonly showOnMap: boolean;
  readonly layerData?: MetricLayerResponse;
  readonly layerError: Error | null;
  readonly isLayerLoading: boolean;
}): string {
  if (!options.showOnMap) {
    return metricMeta[options.metric].mapPlaceholder;
  }

  if (options.layerError) {
    return options.layerError.message;
  }

  if (options.isLayerLoading) {
    return 'Loading map layer data...';
  }

  if (!options.layerData) {
    return 'Map layer data is unavailable right now.';
  }

  if (options.layerData.status === 'unavailable') {
    return options.layerData.reason ?? metricMeta[options.metric].mapPlaceholder;
  }

  if (options.layerData.features.length === 0) {
    return 'No layer points are available for this postcode yet.';
  }

  return `Showing ${options.layerData.features.length} map points from ${options.layerData.sourceName ?? 'the selected provider'}.`;
}

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
  mapStatusMessage,
  onBack,
}: SnapshotDetailsDrawerProps) {
  const { data } = useSnapshotQuery(postcode);

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
      mapStatusMessage={mapStatusMessage}
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

  const layerQuery = useMetricLayerQuery({ postcode, metric, enabled: showOnMap });
  const layerError = layerQuery.error ? toError(layerQuery.error) : null;
  const mapStatusMessage = getMapStatusMessage({
    metric,
    showOnMap,
    layerData: layerQuery.data,
    layerError:
      layerError instanceof HttpError && layerError.status === 429
        ? new Error(getRateLimitMessage(layerError))
        : layerError,
    isLayerLoading: layerQuery.isFetching,
  });

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
    mapStatusMessage,
    onBack: () => navigate({ to: '/', search: { postcode } }),
  };

  return (
    <>
      <MapShell
        centroid={activeSnapshot?.centroid ?? null}
        activeMetric={metric}
        showMapOverlay={showOnMap}
        mapLayerData={layerQuery.data}
        mapLegendText={mapStatusMessage}
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

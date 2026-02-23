import { Suspense, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createRoute, redirect, useNavigate } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
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

const CRIME_CLUSTER_THRESHOLD = 140;
const CRIME_FALLBACK_COLORS = ['#0A8A4B', '#1F77B4', '#FF7F0E', '#D62728', '#9467BD', '#8C564B', '#17BECF', '#BCBD22', '#6B7280'];
const CRIME_TOP_CATEGORY_LIMIT = 5;

type CrimeCategoryFilter = {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly count: number;
  readonly active: boolean;
};

type CrimeFilterModel = {
  readonly filters: readonly Omit<CrimeCategoryFilter, 'active'>[];
};

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

function getRateLimitMessage(error: HttpError): string {
  const retryAfter = error.retryAfterSeconds;
  if (retryAfter && retryAfter > 0) {
    return `Live provider is temporarily rate-limiting requests. Please try again in about ${retryAfter} seconds.`;
  }

  return 'Live provider is temporarily rate-limiting requests. Please try again in about a minute.';
}

function formatCrimeCategoryLabel(category: string): string {
  return category.replaceAll('-', ' ');
}

function parseLegendCount(label: string): number | null {
  const match = /\((\d+)\)\s*$/.exec(label);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildCrimeFilterModel(options: {
  readonly metric: MetricId;
  readonly layerData?: MetricLayerResponse;
}): CrimeFilterModel | null {
  if (options.metric !== 'crime' || !options.layerData || options.layerData.status !== 'available') {
    return null;
  }

  const categoryCounts = options.layerData.features.reduce<Record<string, number>>((accumulator, feature) => {
    accumulator[feature.category] = (accumulator[feature.category] ?? 0) + 1;
    return accumulator;
  }, {});

  const legendCategories = options.layerData.legend
    .map((bucket, index) => ({
      id: bucket.id,
      label: formatCrimeCategoryLabel(bucket.id),
      count: bucket.count ?? parseLegendCount(bucket.label) ?? categoryCounts[bucket.id] ?? 0,
      color: bucket.color || CRIME_FALLBACK_COLORS[index % CRIME_FALLBACK_COLORS.length],
    }))
    .filter((bucket) => bucket.count > 0);

  if (legendCategories.length > 0) {
    return {
      filters: legendCategories,
    };
  }

  const sortedCategories = Object.entries(categoryCounts)
    .sort((first, second) => second[1] - first[1]);
  const filters = sortedCategories.map(([category, count], index) => ({
    id: category,
    label: formatCrimeCategoryLabel(category),
    count,
    color:
      options.layerData?.legend.find((bucket) => bucket.id === category)?.color
      ?? CRIME_FALLBACK_COLORS[index % CRIME_FALLBACK_COLORS.length],
  }));

  return {
    filters,
  };
}

function getMapStatusMessage(options: {
  readonly metric: MetricId;
  readonly showOnMap: boolean;
  readonly layerData?: MetricLayerResponse;
  readonly layerError: Error | null;
  readonly isLayerLoading: boolean;
  readonly visibleFeatureCount: number;
  readonly isCrimeClustered: boolean;
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

  if (options.visibleFeatureCount === 0) {
    return 'No map points are available for the selected categories.';
  }

  const clusterMessage = options.isCrimeClustered ? ' Cluster mode is active for smoother performance.' : '';
  return `Showing ${options.visibleFeatureCount} map points from ${options.layerData.sourceName ?? 'the selected provider'}.${clusterMessage}`;
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

  const [isMobile] = useState(() => window.innerWidth <= 768);
  const [drawerExpanded, setDrawerExpanded] = useState(() => !isMobile);
  const [showOnMap, setShowOnMap] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [activeCrimeCategoryIds, setActiveCrimeCategoryIds] = useState<readonly string[]>([]);

  const layerQuery = useMetricLayerQuery({ postcode, metric, enabled: showOnMap || metric === 'crime' });
  const layerError = layerQuery.error ? toError(layerQuery.error) : null;
  const crimeFilterModel = useMemo(
    () => buildCrimeFilterModel({ metric, layerData: layerQuery.data }),
    [layerQuery.data, metric],
  );

  useEffect(() => {
    if (!crimeFilterModel) {
      if (activeCrimeCategoryIds.length > 0) {
        setActiveCrimeCategoryIds([]);
      }
      return;
    }

    const allowedIds = crimeFilterModel.filters.map((filter) => filter.id);
    setActiveCrimeCategoryIds((current) => {
      const next = current.filter((categoryId) => allowedIds.includes(categoryId));
      if (next.length === 0) {
        return allowedIds;
      }

      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }

      return next;
    });
  }, [crimeFilterModel, activeCrimeCategoryIds.length]);

  const activeCrimeCategorySet = useMemo(
    () => new Set(activeCrimeCategoryIds),
    [activeCrimeCategoryIds],
  );

  const filteredCrimeFeatures = useMemo(() => {
    if (metric !== 'crime' || !layerQuery.data || layerQuery.data.status !== 'available') {
      return [];
    }

    if (!crimeFilterModel) {
      return layerQuery.data.features;
    }

    return layerQuery.data.features.filter((feature) => activeCrimeCategorySet.has(feature.category));
  }, [activeCrimeCategorySet, crimeFilterModel, layerQuery.data, metric]);

  const isCrimeClustered = metric === 'crime' && filteredCrimeFeatures.length > CRIME_CLUSTER_THRESHOLD;
  const crimeCategoryFilters = useMemo<readonly CrimeCategoryFilter[]>(() => {
    if (!crimeFilterModel) {
      return [];
    }

    return crimeFilterModel.filters.map((filter) => ({
      ...filter,
      active: activeCrimeCategorySet.has(filter.id),
    }));
  }, [activeCrimeCategorySet, crimeFilterModel]);
  const areAllCrimeCategoriesActive =
    crimeFilterModel !== null && activeCrimeCategoryIds.length === crimeFilterModel.filters.length;
  const crimeLegendBuckets = useMemo(() => (
    crimeCategoryFilters
      .filter((filter) => filter.active)
      .map((filter) => ({
        id: filter.id,
        label: `${filter.label} (${filter.count})`,
        color: filter.color,
      }))
  ), [crimeCategoryFilters]);

  const mapStatusMessage = getMapStatusMessage({
    metric,
    showOnMap,
    layerData: layerQuery.data,
    layerError:
      layerError instanceof HttpError && layerError.status === 429
        ? new Error(getRateLimitMessage(layerError))
        : layerError,
    isLayerLoading: layerQuery.isFetching,
    visibleFeatureCount: filteredCrimeFeatures.length,
    isCrimeClustered,
  });

  const activeSnapshot =
    queryClient.getQueryData<SnapshotData>(snapshotQueryKeys.byPostcode(postcode)) ?? null;
  const mapFocusKey =
    showOnMap && metric === 'crime' && layerQuery.data?.status === 'available'
      ? `${postcode}:crime`
      : undefined;

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
        isMobile={isMobile}
        mapFocusKey={mapFocusKey}
        activeMetric={metric}
        showMapOverlay={showOnMap}
        mapLayerData={layerQuery.data}
        mapLegendText={mapStatusMessage}
        crimeFeatures={filteredCrimeFeatures}
        crimeLegendBuckets={crimeLegendBuckets}
        crimeCategoryFilters={crimeCategoryFilters}
        onCrimeCategoryToggle={(categoryId) => {
          setActiveCrimeCategoryIds((current) => {
            if (!current.includes(categoryId)) {
              return [...current, categoryId];
            }

            if (current.length === 1) {
              return current;
            }

            return current.filter((id) => id !== categoryId);
          });
        }}
        onCrimeShowAll={() => {
          if (!crimeFilterModel) {
            return;
          }

          setActiveCrimeCategoryIds(crimeFilterModel.filters.map((filter) => filter.id));
        }}
        onCrimeShowTop={() => {
          if (!crimeFilterModel) {
            return;
          }

          setActiveCrimeCategoryIds(
            crimeFilterModel.filters
              .slice(0, CRIME_TOP_CATEGORY_LIMIT)
              .map((filter) => filter.id),
          );
        }}
        areAllCrimeCategoriesActive={areAllCrimeCategoriesActive}
        isCrimeClustered={isCrimeClustered}
        crimeTotalIncidents={activeSnapshot?.metrics.crime.total_incidents}
        crimeSnapshotMonth={activeSnapshot?.metrics.crime.last_updated}
      />

      {!isDesktopSidebarOpen && (
        <button
          className="desktop-menu-btn"
          onClick={() => setIsDesktopSidebarOpen(true)}
          aria-label="Open Details Panel"
        >
          <Menu size={24} />
        </button>
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

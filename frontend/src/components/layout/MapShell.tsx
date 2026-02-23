import React from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { Eye, EyeOff, ListFilter, X } from 'lucide-react';
import type { MetricId } from '../../constants/metrics';
import { metricMeta } from '../../constants/metrics';
import type { CrimePointFeature, LegendBucket, MetricLayerResponse } from '../../types/layers';

const DEFAULT_CENTER = { lat: 54.5, lng: -2.0 };
const CRIME_HINT_DISMISSED_KEY = 'crime-legend-hint-dismissed-v1';

type LatLng = {
  readonly lat: number;
  readonly lng: number;
};

type MapShellProps = {
  readonly centroid: LatLng | null;
  readonly isMobile: boolean;
  readonly mapFocusKey?: string;
  readonly activeMetric?: MetricId;
  readonly showMapOverlay?: boolean;
  readonly mapLayerData?: MetricLayerResponse;
  readonly mapLegendText?: string;
  readonly crimeFeatures?: readonly CrimePointFeature[];
  readonly crimeLegendBuckets?: readonly LegendBucket[];
  readonly crimeCategoryFilters?: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly color: string;
    readonly count: number;
    readonly active: boolean;
  }>;
  readonly onCrimeCategoryToggle?: (categoryId: string) => void;
  readonly onCrimeShowAll?: () => void;
  readonly onCrimeShowTop?: () => void;
  readonly areAllCrimeCategoriesActive?: boolean;
  readonly isCrimeClustered?: boolean;
  readonly crimeTotalIncidents?: number;
  readonly crimeSnapshotMonth?: string;
};

type ClusterMarker = {
  readonly id: string;
  readonly lat: number;
  readonly lng: number;
  readonly count: number;
  readonly category: string;
};

function MapViewUpdater(options: {
  readonly centroid: LatLng | null;
  readonly mapFocusKey?: string;
}) {
  const map = useMap();
  const focusedKeysRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!options.centroid || !options.mapFocusKey) {
      return;
    }

    if (focusedKeysRef.current.has(options.mapFocusKey)) {
      return;
    }

    focusedKeysRef.current.add(options.mapFocusKey);
    map.panTo([options.centroid.lat, options.centroid.lng], { animate: true, duration: 1.2 });
  }, [map, options.centroid, options.mapFocusKey]);

  return null;
}

function getCrimeCategoryColor(options: {
  readonly category: string;
  readonly mapLayerData?: MetricLayerResponse;
  readonly crimeLegendBuckets?: readonly LegendBucket[];
}): string {
  const legendEntry =
    options.crimeLegendBuckets?.find((bucket) => bucket.id === options.category)
    ?? options.mapLayerData?.legend.find((bucket) => bucket.id === options.category);
  return legendEntry?.color ?? '#0A8A4B';
}

function clusterCrimeFeatures(options: {
  readonly features: readonly CrimePointFeature[];
}): readonly ClusterMarker[] {
  const step = 0.0035;
  const clusters = new Map<string, { latTotal: number; lngTotal: number; count: number; category: string }>();

  options.features.forEach((feature) => {
    const latBucket = Math.round(feature.lat / step);
    const lngBucket = Math.round(feature.lng / step);
    const key = `${latBucket}:${lngBucket}:${feature.category}`;
    const existingCluster = clusters.get(key);

    if (existingCluster) {
      clusters.set(key, {
        latTotal: existingCluster.latTotal + feature.lat,
        lngTotal: existingCluster.lngTotal + feature.lng,
        count: existingCluster.count + 1,
        category: existingCluster.category,
      });
      return;
    }

    clusters.set(key, {
      latTotal: feature.lat,
      lngTotal: feature.lng,
      count: 1,
      category: feature.category,
    });
  });

  return Array.from(clusters.entries()).map(([id, cluster]) => ({
    id,
    lat: cluster.latTotal / cluster.count,
    lng: cluster.lngTotal / cluster.count,
    count: cluster.count,
    category: cluster.category,
  }));
}

export function MapShell({
  centroid,
  isMobile,
  mapFocusKey,
  activeMetric,
  showMapOverlay = false,
  mapLayerData,
  mapLegendText,
  crimeFeatures,
  crimeLegendBuckets,
  crimeCategoryFilters = [],
  onCrimeCategoryToggle,
  onCrimeShowAll,
  onCrimeShowTop,
  areAllCrimeCategoriesActive = false,
  isCrimeClustered = false,
  crimeTotalIncidents,
  crimeSnapshotMonth,
}: MapShellProps) {
  const hasCrimeLayer = activeMetric === 'crime' && mapLayerData?.status === 'available';
  const visibleCrimeFeatures: readonly CrimePointFeature[] = hasCrimeLayer
    ? (crimeFeatures ?? mapLayerData.features)
    : [];

  const clusteredCrimeFeatures = isCrimeClustered
    ? clusterCrimeFeatures({ features: visibleCrimeFeatures })
    : [];

  const legendBuckets = activeMetric === 'crime'
    ? (crimeLegendBuckets ?? mapLayerData?.legend ?? [])
    : (mapLayerData?.legend ?? []);
  const [isLegendOpen, setIsLegendOpen] = React.useState(false);
  const showSimpleCrimeLegend =
    activeMetric === 'crime' &&
    mapLayerData?.status === 'available' &&
    legendBuckets.length > 0;
  const showInteractiveCrimeLegend = showSimpleCrimeLegend && crimeCategoryFilters.length > 0;
  const [showCrimeHint, setShowCrimeHint] = React.useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return window.localStorage.getItem(CRIME_HINT_DISMISSED_KEY) !== '1';
  });
  const [legendToast, setLegendToast] = React.useState<{
    readonly message: string;
    readonly icon: 'shown' | 'hidden';
  } | null>(null);
  const [legendToastExiting, setLegendToastExiting] = React.useState(false);
  const legendDragPointerIdRef = React.useRef<number | null>(null);
  const legendDragStartYRef = React.useRef(0);
  const legendDragStartOffsetRef = React.useRef(0);
  const [legendSheetOffsetY, setLegendSheetOffsetY] = React.useState(0);
  const [legendSheetDragging, setLegendSheetDragging] = React.useState(false);
  const legendTotalIncidents = crimeTotalIncidents ?? crimeCategoryFilters.reduce((sum, filter) => sum + filter.count, 0);
  const legendSnapshotLabel = (() => {
    if (!crimeSnapshotMonth) {
      return '';
    }

    const [year, month] = crimeSnapshotMonth.split('-').map((value) => Number.parseInt(value, 10));
    if (!year || !month || month < 1 || month > 12) {
      return crimeSnapshotMonth;
    }

    const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-GB', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
    return label;
  })();
  const shouldShowLegend = showMapOverlay && activeMetric;
  const shouldRenderLegendPanel = shouldShowLegend && isLegendOpen;

  React.useEffect(() => {
    if (!shouldShowLegend) {
      setIsLegendOpen(false);
    }
  }, [shouldShowLegend]);

  React.useEffect(() => {
    if (isLegendOpen) {
      setLegendSheetOffsetY(0);
      setLegendSheetDragging(false);
    }
  }, [isLegendOpen]);

  React.useEffect(() => {
    if (!legendToast) {
      return;
    }

    setLegendToastExiting(false);
    const exitTimeoutId = window.setTimeout(() => {
      setLegendToastExiting(true);
    }, 900);

    const timeoutId = window.setTimeout(() => {
      setLegendToast(null);
      setLegendToastExiting(false);
    }, 1120);

    return () => {
      window.clearTimeout(exitTimeoutId);
      window.clearTimeout(timeoutId);
    };
  }, [legendToast]);

  const dismissCrimeHint = React.useCallback(() => {
    if (!showCrimeHint) {
      return;
    }
    setShowCrimeHint(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CRIME_HINT_DISMISSED_KEY, '1');
    }
  }, [showCrimeHint]);

  const startLegendSheetDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile) {
      return;
    }

    legendDragPointerIdRef.current = event.pointerId;
    legendDragStartYRef.current = event.clientY;
    legendDragStartOffsetRef.current = legendSheetOffsetY;
    setLegendSheetDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveLegendSheetDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile || legendDragPointerIdRef.current !== event.pointerId) {
      return;
    }

    const deltaY = event.clientY - legendDragStartYRef.current;
    const nextOffset = Math.min(320, Math.max(0, legendDragStartOffsetRef.current + deltaY));
    setLegendSheetOffsetY(nextOffset);
  };

  const endLegendSheetDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (legendDragPointerIdRef.current !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    legendDragPointerIdRef.current = null;
    setLegendSheetDragging(false);

    if (legendSheetOffsetY >= 96) {
      setIsLegendOpen(false);
      setLegendSheetOffsetY(0);
      return;
    }

    setLegendSheetOffsetY(0);
  };

  return (
    <>
      <div className="map-container">
        <MapContainer
          center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
          zoom={9}
          zoomControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewUpdater centroid={centroid} mapFocusKey={mapFocusKey} />
          {centroid && <Marker position={[centroid.lat, centroid.lng]} />}
          {showMapOverlay && hasCrimeLayer && !isCrimeClustered && visibleCrimeFeatures.map((feature) => (
            <CircleMarker
              key={feature.id}
              center={[feature.lat, feature.lng]}
              radius={5}
              pathOptions={{
                color: getCrimeCategoryColor({
                  category: feature.category,
                  mapLayerData,
                  crimeLegendBuckets,
                }),
                fillColor: getCrimeCategoryColor({
                  category: feature.category,
                  mapLayerData,
                  crimeLegendBuckets,
                }),
                fillOpacity: 0.5,
                weight: 1,
              }}
            />
          ))}
          {showMapOverlay && hasCrimeLayer && isCrimeClustered && clusteredCrimeFeatures.map((cluster) => (
            <CircleMarker
              key={cluster.id}
              center={[cluster.lat, cluster.lng]}
              radius={Math.min(14, 5 + Math.log2(cluster.count + 1) * 2)}
              pathOptions={{
                color: getCrimeCategoryColor({
                  category: cluster.category,
                  mapLayerData,
                  crimeLegendBuckets,
                }),
                fillColor: getCrimeCategoryColor({
                  category: cluster.category,
                  mapLayerData,
                  crimeLegendBuckets,
                }),
                fillOpacity: 0.38,
                weight: 1.25,
              }}
            />
          ))}
        </MapContainer>
      </div>

      {shouldShowLegend && (
        <button
          type="button"
          className={`map-legend-fab ${isMobile ? 'map-legend-fab--mobile' : 'map-legend-fab--desktop'} ${isLegendOpen ? 'map-legend-fab--active' : ''}`}
          onClick={() => setIsLegendOpen((current) => !current)}
          aria-label={isLegendOpen ? 'Hide map legend' : 'Show map legend'}
          aria-pressed={isLegendOpen}
        >
          {isLegendOpen ? <X size={18} /> : <ListFilter size={18} />}
          <span>Legend</span>
        </button>
      )}

      {shouldRenderLegendPanel && isMobile && (
        <button
          type="button"
          className="map-legend-mobile-backdrop"
          aria-label="Close legend"
          onClick={() => setIsLegendOpen(false)}
        />
      )}

      {shouldRenderLegendPanel && activeMetric && (
        <aside
          className={`map-legend ${isMobile ? 'map-legend-sheet' : ''} ${isMobile && legendSheetDragging ? 'map-legend-sheet--dragging' : ''} ${showSimpleCrimeLegend ? 'map-legend--compact' : ''}`}
          role={isMobile ? 'dialog' : 'note'}
          aria-modal={isMobile ? 'true' : undefined}
          aria-live="polite"
          style={isMobile ? { transform: `translateY(${legendSheetOffsetY}px)` } : undefined}
        >
          {isMobile && (
            <>
              <div
                className="map-legend-sheet-handle"
                onPointerDown={startLegendSheetDrag}
                onPointerMove={moveLegendSheetDrag}
                onPointerUp={endLegendSheetDrag}
                onPointerCancel={endLegendSheetDrag}
              />
              <div className="map-legend-sheet-header">
                <h3>Crime types</h3>
                <button
                  type="button"
                  className="map-legend-sheet-close"
                  onClick={() => setIsLegendOpen(false)}
                  aria-label="Close legend"
                >
                  <X size={18} />
                </button>
              </div>
            </>
          )}
          {!showSimpleCrimeLegend && (
            <>
              <h3 className="map-legend-title">{metricMeta[activeMetric].title} Map</h3>
              <p className="map-legend-text">
                {mapLegendText ?? metricMeta[activeMetric].mapPlaceholder}
              </p>
              {isCrimeClustered && activeMetric === 'crime' && (
                <p className="map-legend-text">Cluster mode is active to keep map interactions smooth.</p>
              )}
            </>
          )}
          {showInteractiveCrimeLegend && (
            <div className="map-legend-controls" role="group" aria-label="Crime category visibility">
              <button
                type="button"
                className={`map-legend-control-btn ${areAllCrimeCategoriesActive ? 'map-legend-control-btn--active' : ''}`}
                onClick={onCrimeShowAll}
              >
                All types
              </button>
              <button
                type="button"
                className={`map-legend-control-btn ${!areAllCrimeCategoriesActive ? 'map-legend-control-btn--active' : ''}`}
                onClick={onCrimeShowTop}
              >
                Top 5
              </button>
            </div>
          )}
          {showInteractiveCrimeLegend && showCrimeHint && (
            <p className="map-legend-hint">
              Tap a category to show or hide it on the map
            </p>
          )}
          {showInteractiveCrimeLegend && (
            <div className="map-legend-meta">
              <span>{legendTotalIncidents.toLocaleString()} incidents</span>
              {legendSnapshotLabel && <strong>{legendSnapshotLabel}</strong>}
            </div>
          )}
          {showInteractiveCrimeLegend && isMobile && (
            <p className="map-legend-interaction-label">Tap rows to show or hide categories on the map</p>
          )}
          {mapLayerData?.status === 'available' && legendBuckets.length > 0 && !showInteractiveCrimeLegend && (
            <ul className="map-legend-list">
              {legendBuckets.map((bucket) => (
                <li key={bucket.id} className="map-legend-item">
                  <span className="map-legend-swatch" style={{ backgroundColor: bucket.color }} aria-hidden="true" />
                  <span>{bucket.label}</span>
                </li>
              ))}
            </ul>
          )}
          {showInteractiveCrimeLegend && (
            <ul className="map-legend-list">
              {crimeCategoryFilters.map((filter) => (
                <li key={filter.id} className="map-legend-item">
                  <button
                    type="button"
                    className={`map-legend-item-btn ${filter.active ? 'map-legend-item-btn--active' : ''}`}
                    onClick={() => {
                      dismissCrimeHint();
                      setLegendToast({
                        message: `${filter.label} ${filter.active ? 'hidden' : 'shown'}`,
                        icon: filter.active ? 'hidden' : 'shown',
                      });
                      onCrimeCategoryToggle?.(filter.id);
                    }}
                    aria-pressed={filter.active}
                  >
                    <span className="map-legend-swatch" style={{ backgroundColor: filter.color }} aria-hidden="true" />
                    <span className="map-legend-row">
                      <span className="map-legend-row-title">{filter.label}</span>
                      <span className="map-legend-row-metrics">
                        <span className="map-legend-row-track" aria-hidden="true">
                          <span style={{ width: `${Math.max(4, Math.min(100, Math.round((filter.count / Math.max(1, legendTotalIncidents)) * 100)))}%`, backgroundColor: filter.color }} />
                        </span>
                        <span className="map-legend-row-count">{filter.count.toLocaleString()}</span>
                        <span className="map-legend-row-percent">{Math.round((filter.count / Math.max(1, legendTotalIncidents)) * 100)}%</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {legendToast && (
            <p className={`map-legend-toast ${legendToastExiting ? 'map-legend-toast--exit' : ''}`} aria-live="polite">
              {legendToast.icon === 'hidden' ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
              <span>{legendToast.message}</span>
            </p>
          )}
        </aside>
      )}

      {isMobile && legendToast && (
        <p className={`map-legend-toast-hud ${legendToastExiting ? 'map-legend-toast-hud--exit' : ''}`} aria-live="polite">
          {legendToast.icon === 'hidden' ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
          <span>{legendToast.message}</span>
        </p>
      )}
    </>
  );
}

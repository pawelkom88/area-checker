import React from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import type { MetricId } from '../../constants/metrics';
import { metricMeta } from '../../constants/metrics';
import type { CrimePointFeature, MetricLayerResponse } from '../../types/layers';

const DEFAULT_CENTER = { lat: 54.5, lng: -2.0 };

type LatLng = {
  readonly lat: number;
  readonly lng: number;
};

type MapShellProps = {
  readonly centroid: LatLng | null;
  readonly activeMetric?: MetricId;
  readonly showMapOverlay?: boolean;
  readonly mapLayerData?: MetricLayerResponse;
  readonly mapLegendText?: string;
};

function MapViewUpdater({ centroid }: { readonly centroid: LatLng | null }) {
  const map = useMap();

  React.useEffect(() => {
    if (!centroid) {
      return;
    }

    const isDesktop = window.innerWidth >= 769;
    if (isDesktop) {
      map.flyTo([centroid.lat, centroid.lng - 0.02], 14, { animate: true, duration: 1.5 });
      return;
    }

    map.flyTo([centroid.lat - 0.01, centroid.lng], 14, { animate: true, duration: 1.5 });
  }, [centroid, map]);

  return null;
}

function getCrimeCategoryColor(options: {
  readonly category: string;
  readonly mapLayerData?: MetricLayerResponse;
}): string {
  const legendEntry = options.mapLayerData?.legend.find((bucket) => bucket.id === options.category);
  return legendEntry?.color ?? '#0A8A4B';
}

export function MapShell({
  centroid,
  activeMetric,
  showMapOverlay = false,
  mapLayerData,
  mapLegendText,
}: MapShellProps) {
  const hasCrimeLayer = activeMetric === 'crime' && mapLayerData?.status === 'available';
  const crimeFeatures: readonly CrimePointFeature[] = hasCrimeLayer ? mapLayerData.features : [];

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
          <MapViewUpdater centroid={centroid} />
          {centroid && <Marker position={[centroid.lat, centroid.lng]} />}
          {showMapOverlay && hasCrimeLayer && crimeFeatures.map((feature) => (
            <CircleMarker
              key={feature.id}
              center={[feature.lat, feature.lng]}
              radius={5}
              pathOptions={{
                color: getCrimeCategoryColor({ category: feature.category, mapLayerData }),
                fillColor: getCrimeCategoryColor({ category: feature.category, mapLayerData }),
                fillOpacity: 0.5,
                weight: 1,
              }}
            />
          ))}
        </MapContainer>
      </div>

      {showMapOverlay && activeMetric && (
        <aside className="map-legend" role="note" aria-live="polite">
          <h3 className="map-legend-title">{metricMeta[activeMetric].title} Map</h3>
          <p className="map-legend-text">
            {mapLegendText ?? metricMeta[activeMetric].mapPlaceholder}
          </p>
          {mapLayerData?.status === 'available' && mapLayerData.legend.length > 0 && (
            <ul className="map-legend-list">
              {mapLayerData.legend.map((bucket) => (
                <li key={bucket.id} className="map-legend-item">
                  <span className="map-legend-swatch" style={{ backgroundColor: bucket.color }} aria-hidden="true" />
                  <span>{bucket.label}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </>
  );
}

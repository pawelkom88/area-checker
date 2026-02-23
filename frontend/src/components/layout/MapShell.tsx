import React from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import type { MetricId } from '../../constants/metrics';
import { metricMeta } from '../../constants/metrics';

const DEFAULT_CENTER = { lat: 54.5, lng: -2.0 };

type LatLng = {
  readonly lat: number;
  readonly lng: number;
};

type MapShellProps = {
  readonly centroid: LatLng | null;
  readonly activeMetric?: MetricId;
  readonly showMapOverlay?: boolean;
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

export function MapShell({ centroid, activeMetric, showMapOverlay = false }: MapShellProps) {
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
        </MapContainer>
      </div>

      {showMapOverlay && activeMetric && (
        <aside className="map-legend" role="note" aria-live="polite">
          <h3 className="map-legend-title">{metricMeta[activeMetric].title} Map</h3>
          <p className="map-legend-text">{metricMeta[activeMetric].mapPlaceholder}</p>
        </aside>
      )}
    </>
  );
}

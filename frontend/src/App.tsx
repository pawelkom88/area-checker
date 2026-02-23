import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { Menu } from 'lucide-react';
import { motion, useAnimationControls } from 'motion/react';
import { Dashboard } from './pages/Dashboard';
import { useSnapshotQuery } from './hooks/useSnapshotQuery';

// Type definitions
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

function MapViewUpdater({ centroid }: { readonly centroid: { readonly lat: number; readonly lng: number } | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (centroid) {
      const isDesktop = window.innerWidth >= 769;
      if (isDesktop) {
        // Offset center right so the marker stays on the right side of the screen consistently
        map.flyTo([centroid.lat, centroid.lng - 0.02], 14, { animate: true, duration: 1.5 });
      } else {
        // Offset center up for bottom sheet
        map.flyTo([centroid.lat - 0.01, centroid.lng], 14, { animate: true, duration: 1.5 });
      }
    }
  }, [centroid, map]);
  return null;
}

export default function App() {
  const [searchInput, setSearchInput] = useState('');
  const [activePostcode, setActivePostcode] = useState<string | null>(null);
  const [drawerExpanded, setDrawerExpanded] = useState(false);

  // React Query handles loading/error/data states automatically
  const { data, isLoading, error } = useSnapshotQuery(activePostcode);

  // Responsive hook
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  useEffect(() => {
    const checkResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setWindowHeight(window.innerHeight);
    };
    checkResize();
    window.addEventListener('resize', checkResize);
    return () => window.removeEventListener('resize', checkResize);
  }, []);

  // Use motion controls to smoothly drive the mobile drawer y position
  const mobileDrawerControls = useAnimationControls();

  // Desktop Sidebar State
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  // Dynamic values to handle the open vs closed states of the swipeable bottom sheet
  const hasContent = data !== undefined || isLoading || error !== null;

  // calculate exactly how many pixels down the drawer must translate to hide its content
  const closedYValue = hasContent ? windowHeight - 240 : 0;

  // Sync drawer Expanded state with animations
  useEffect(() => {
    if (isMobile) {
      if (drawerExpanded && hasContent) {
        mobileDrawerControls.start({ y: 0, transition: { type: 'spring', damping: 25, stiffness: 220, mass: 0.8 } });
      } else {
        mobileDrawerControls.start({ y: closedYValue, transition: { type: 'spring', damping: 22, stiffness: 260, mass: 0.8 } });
      }
    } else {
      mobileDrawerControls.set({ y: 0 });
    }
  }, [drawerExpanded, hasContent, isMobile, mobileDrawerControls, closedYValue]);

  // Sync the `drawerExpanded` internal state if Desktop side panel is closed
  useEffect(() => {
    if (!isMobile) {
      if (data || isLoading) {
        setIsDesktopSidebarOpen(true);
      }
    }
  }, [data, isLoading, isMobile]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setDrawerExpanded(true);
    // Setting the active postcode automatically triggers the React Query
    setActivePostcode(searchInput);
  };

  const currentCentroid = data?.centroid ?? null;

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

      {/* DESKTOP CLOSED STATE (Floating Button) */}
      {!isMobile && !isDesktopSidebarOpen && (
        <motion.button
          layoutId="desktop-panel"
          className="desktop-menu-btn"
          onClick={() => setIsDesktopSidebarOpen(true)}
          transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
          aria-label="Open Search Panel"
        >
          <Menu size={24} />
        </motion.button>
      )}

      {(!isMobile ? isDesktopSidebarOpen : true) && (
        <Dashboard
          isMobile={isMobile}
          windowHeight={windowHeight}
          data={data}
          isLoading={isLoading}
          error={error}
          drawerExpanded={drawerExpanded}
          setDrawerExpanded={setDrawerExpanded}
          isDesktopSidebarOpen={isDesktopSidebarOpen}
          setIsDesktopSidebarOpen={setIsDesktopSidebarOpen}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          handleSearch={handleSearch}
        />
      )}
    </>
  );
}

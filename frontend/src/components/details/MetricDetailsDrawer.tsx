import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { motion, useAnimationControls } from 'motion/react';
import type { PanInfo } from 'motion/react';
import type { MetricId } from '../../constants/metrics';
import { metricMeta } from '../../constants/metrics';
import { MetricCard } from '../MetricCard';
import type { SnapshotData } from '../../types/snapshot';

type MetricDetailsDrawerProps = {
  readonly isMobile: boolean;
  readonly metric: MetricId;
  readonly data: SnapshotData | undefined;
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly drawerExpanded: boolean;
  readonly setDrawerExpanded: (expanded: boolean) => void;
  readonly isDesktopSidebarOpen: boolean;
  readonly setIsDesktopSidebarOpen: (open: boolean) => void;
  readonly showOnMap: boolean;
  readonly setShowOnMap: (visible: boolean) => void;
  readonly onBack: () => void;
};

export function MetricDetailsDrawer({
  isMobile,
  metric,
  data,
  isLoading,
  error,
  drawerExpanded,
  setDrawerExpanded,
  isDesktopSidebarOpen,
  setIsDesktopSidebarOpen,
  showOnMap,
  setShowOnMap,
  onBack,
}: MetricDetailsDrawerProps) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [panelHeight, setPanelHeight] = React.useState(0);
  const controls = useAnimationControls();
  const hasContent = data !== undefined || isLoading || error !== null;
  const closedYValue = hasContent ? Math.max(panelHeight - 240, 0) : 0;

  React.useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const syncPanelHeight = () => {
      setPanelHeight(panel.offsetHeight);
    };

    syncPanelHeight();

    if (typeof ResizeObserver !== 'function') {
      return;
    }

    const observer = new ResizeObserver(syncPanelHeight);
    observer.observe(panel);

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!isMobile) {
      controls.set({ y: 0 });
      return;
    }

    if (drawerExpanded && hasContent) {
      controls.start({ y: 0, transition: { type: 'spring', damping: 25, stiffness: 220, mass: 0.8 } });
      return;
    }

    controls.start({ y: closedYValue, transition: { type: 'spring', damping: 22, stiffness: 260, mass: 0.8 } });
  }, [closedYValue, controls, drawerExpanded, hasContent, isMobile]);

  const cardContent = data ? (
    metric === 'crime' ? (
      <MetricCard
        title="Crime & Safety"
        value={`${data.metrics.crime.total_incidents} incidents`}
        description={`Primary type: ${data.metrics.crime.primary_type}. Trend: ${data.metrics.crime.trend}.`}
        icon={metricMeta.crime.icon}
        sourceName="UK Police Data"
        sourceUrl="https://data.police.uk"
        lastUpdated={data.metrics.crime.last_updated}
      />
    ) : metric === 'price' ? (
      <MetricCard
        title="Property Prices"
        value={`£${data.metrics.price.median_value.toLocaleString()}`}
        description={`Median solid price for ${data.metrics.price.property_type}s. Trend: ${data.metrics.price.trend}.`}
        icon={metricMeta.price.icon}
        sourceName="HM Land Registry"
        sourceUrl="https://landregistry.gov.uk"
        lastUpdated={data.metrics.price.last_updated}
      />
    ) : (
      <MetricCard
        title="Flood Risk"
        value={data.metrics.flood.risk_level}
        description={`Primary source: ${data.metrics.flood.primary_source}.`}
        icon={metricMeta.flood.icon}
        sourceName="Environment Agency"
        sourceUrl="https://gov.uk/check-long-term-flood-risk"
        lastUpdated={data.metrics.flood.last_updated}
      />
    )
  ) : null;

  return (
    <motion.div
      ref={panelRef}
      layoutId={!isMobile ? 'desktop-panel' : undefined}
      className="app-overlay-panel"
      animate={controls}
      initial={false}
      drag={isMobile ? 'y' : false}
      dragConstraints={{ top: 0 }}
      dragElastic={0.15}
      onDragEnd={(_event, info: PanInfo) => {
        if (!isMobile) {
          return;
        }

        const projectedY = info.offset.y + info.velocity.y * 0.1;
        if (projectedY > 50 && hasContent) {
          setDrawerExpanded(false);
          return;
        }

        if (projectedY < -50 && hasContent) {
          setDrawerExpanded(true);
          return;
        }

        if (!hasContent) {
          return;
        }

        controls.start({
          y: drawerExpanded ? 0 : closedYValue,
          transition: drawerExpanded
            ? { type: 'spring', damping: 25, stiffness: 220, mass: 0.8 }
            : { type: 'spring', damping: 22, stiffness: 260, mass: 0.8 },
        });
      }}
      transition={{ type: 'spring', damping: 22, stiffness: 260, mass: 0.8 }}
    >
      <div className="bottom-sheet-handle" />

      <div className="bottom-sheet-header">
        <button className="panel-back-btn" onClick={onBack} aria-label="Back to summary">
          <ArrowLeft size={18} />
          Back
        </button>
        <h2 className="bottom-sheet-title">{metricMeta[metric].title}</h2>
        {isDesktopSidebarOpen ? (
          <button
            className="desktop-close-btn"
            onClick={() => setIsDesktopSidebarOpen(false)}
            aria-label="Close panel"
          >
            <X size={24} />
          </button>
        ) : (
          <span className="panel-back-spacer" aria-hidden="true" />
        )}
      </div>

      <div className="details-controls">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowOnMap(!showOnMap)}
        >
          {showOnMap ? 'Hide on map' : 'Show on map'}
        </button>
      </div>

      {error ? <p className="error-text fade-in-up" role="alert">{error.message}</p> : null}

      <div className="scroll-area" onPointerDown={(event) => { if (isMobile) event.stopPropagation(); }}>
        <div className="metric-list">
          {isLoading ? (
            <MetricCard loading title="" value="" description="" icon={metricMeta[metric].icon} sourceName="" sourceUrl="" lastUpdated="" />
          ) : cardContent}
          <section className="details-placeholder" aria-live="polite">
            <h3>Map Layer Availability</h3>
            <p>{metricMeta[metric].mapPlaceholder}</p>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

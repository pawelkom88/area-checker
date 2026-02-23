import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import type { MetricId } from '../../constants/metrics';
import { metricMeta } from '../../constants/metrics';
import { MetricCard } from '../MetricCard';
import { CrimeAnalyticsCard } from '../CrimeAnalyticsCard';
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
  const dragPointerIdRef = React.useRef<number | null>(null);
  const dragStartYRef = React.useRef(0);
  const dragStartTranslateRef = React.useRef(0);
  const [dragTranslateY, setDragTranslateY] = React.useState<number | null>(null);
  const [panelHeight, setPanelHeight] = React.useState(0);
  const hasContent = data !== undefined || isLoading || error !== null;
  const mobilePeekHeight = 210;
  const closedYValue = hasContent ? Math.max(panelHeight - mobilePeekHeight, 0) : 0;
  const baseTranslateY = drawerExpanded ? 0 : closedYValue;
  const effectiveTranslateY = dragTranslateY ?? baseTranslateY;

  const clampTranslateY = (value: number) => Math.min(Math.max(value, 0), closedYValue);

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
    setDragTranslateY(null);
  }, [closedYValue]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile || !hasContent) {
      return;
    }
    dragPointerIdRef.current = event.pointerId;
    dragStartYRef.current = event.clientY;
    dragStartTranslateRef.current = baseTranslateY;
    setDragTranslateY(baseTranslateY);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile || dragPointerIdRef.current !== event.pointerId) {
      return;
    }
    const deltaY = event.clientY - dragStartYRef.current;
    setDragTranslateY(clampTranslateY(dragStartTranslateRef.current + deltaY));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) {
      return;
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragPointerIdRef.current = null;

    const finalY = clampTranslateY(dragTranslateY ?? baseTranslateY);
    const shouldExpand = finalY < closedYValue * 0.7;
    setDrawerExpanded(shouldExpand);
    setDragTranslateY(null);
  };

  const cardContent = data ? (
    metric === 'crime' ? (
      <CrimeAnalyticsCard
        incidents={data.metrics.crime.total_incidents}
        trend={data.metrics.crime.trend}
        primaryType={data.metrics.crime.primary_type}
        leadingCategory={data.metrics.crime.top_categories?.[0]?.category}
        leadingCount={data.metrics.crime.top_categories?.[0]?.count}
        sourceName="UK Police Data"
        sourceUrl="https://data.police.uk"
        snapshotLabel={`Snapshot ${data.metrics.crime.last_updated}`}
      />
    ) : metric === 'price' ? (
      <MetricCard
        title="Property Prices"
        value={`£${data.metrics.price.median_value.toLocaleString()}`}
        description={`Median solid price for ${data.metrics.price.property_type}s. Trend: ${data.metrics.price.trend}.`}
        icon={metricMeta.price.icon}
        sourceName="HM Land Registry"
        sourceUrl="https://landregistry.gov.uk"
        lastUpdated={`Snapshot ${data.metrics.price.last_updated}`}
      />
    ) : (
      <MetricCard
        title="Flood Risk"
        value={data.metrics.flood.risk_level}
        description={`Primary source: ${data.metrics.flood.primary_source}.`}
        icon={metricMeta.flood.icon}
        sourceName="Environment Agency"
        sourceUrl="https://gov.uk/check-long-term-flood-risk"
        lastUpdated={`Snapshot ${data.metrics.flood.last_updated}`}
      />
    )
  ) : null;

  return (
    <div
      ref={panelRef}
      className="app-overlay-panel"
      style={isMobile ? { transform: `translateY(${effectiveTranslateY}px)` } : undefined}
    >
      <div
        className="bottom-sheet-handle"
        onPointerDown={startDrag}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />

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
        <div className="map-cta-toggle" role="group" aria-label="Map visibility">
          <button
            type="button"
            className={`map-cta-segment ${showOnMap ? 'map-cta-segment--active' : ''}`}
            onClick={() => setShowOnMap(true)}
            aria-pressed={showOnMap}
          >
            Map On
          </button>
          <button
            type="button"
            className={`map-cta-segment ${!showOnMap ? 'map-cta-segment--active' : ''}`}
            onClick={() => setShowOnMap(false)}
            aria-pressed={!showOnMap}
          >
            Map Off
          </button>
        </div>
      </div>

      {error ? <p className="error-text" role="alert">{error.message}</p> : null}

      <div className="scroll-area" onPointerDown={(event) => { if (isMobile) event.stopPropagation(); }}>
        <div className="metric-list">
          {isLoading ? (
            <MetricCard loading title="" value="" description="" icon={metricMeta[metric].icon} sourceName="" sourceUrl="" lastUpdated="" />
          ) : cardContent}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { MapPin, ShieldAlert, Home, Droplets, X } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { SummaryAnalyticsCard } from '../components/SummaryAnalyticsCard';
import type { MetricId } from '../constants/metrics';
import type { SnapshotData } from '../types/snapshot';

interface DashboardProps {
    isMobile: boolean;
    defaultPostcode?: string;
    data: SnapshotData | undefined;
    isLoading: boolean;
    error: Error | null;
    drawerExpanded: boolean;
    setDrawerExpanded: (expanded: boolean) => void;
    setIsDesktopSidebarOpen: (open: boolean) => void;
    handleSearch: (e: React.FormEvent<HTMLFormElement>) => void;
    onMetricSelect?: (metric: MetricId) => void;
}

export function Dashboard({
    isMobile,
    defaultPostcode,
    data,
    isLoading,
    error,
    drawerExpanded,
    setDrawerExpanded,
    setIsDesktopSidebarOpen,
    handleSearch,
    onMetricSelect,
}: DashboardProps) {
    const panelRef = React.useRef<HTMLDivElement | null>(null);
    const dragPointerIdRef = React.useRef<number | null>(null);
    const dragStartYRef = React.useRef(0);
    const dragStartTranslateRef = React.useRef(0);
    const [dragTranslateY, setDragTranslateY] = React.useState<number | null>(null);
    const [panelHeight, setPanelHeight] = React.useState(0);
    const hasContent = data !== undefined || isLoading || error !== null;
    const closedYValue = hasContent ? Math.max(panelHeight - 240, 0) : 0;
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
                <h2 className="bottom-sheet-title">
                    {data?.postcode ?? defaultPostcode ?? 'Search Region'}
                </h2>
                <button
                    className="desktop-close-btn"
                    onClick={() => setIsDesktopSidebarOpen(false)}
                    aria-label="Close panel"
                >
                    <X size={24} />
                </button>
            </div>

            <form onSubmit={handleSearch} className="input-group">
                <label htmlFor="postcode-search" className="sr-only">UK Postcode</label>
                <div className="input-field">
                    <MapPin size={24} color="var(--color-dark-gray)" aria-hidden="true" />
                    <input
                        key={defaultPostcode ?? 'empty'}
                        id="postcode-search"
                        name="postcode-search"
                        type="search"
                        autoComplete="postal-code"
                        placeholder="Enter postcode..."
                        defaultValue={defaultPostcode ?? ''}
                    />
                </div>
                <div className="form-feedback-slot" aria-live="polite">
                    {error ? <p className="error-text" role="alert">{error.message}</p> : null}
                </div>
                <button type="submit" className="btn-primary" disabled={isLoading} aria-busy={isLoading}>
                    {isLoading ? 'Searching...' : 'Search Region'}
                </button>
            </form>

            <div className="scroll-area" onPointerDown={(e) => { if (isMobile) e.stopPropagation(); }}>
                {(isLoading || data) && (
                    <div className="metric-list">
                        {isLoading ? (
                            <>
                                <MetricCard loading title="" value="" description="" icon={ShieldAlert} sourceName="" sourceUrl="" lastUpdated="" />
                                <MetricCard loading title="" value="" description="" icon={Home} sourceName="" sourceUrl="" lastUpdated="" />
                                <MetricCard loading title="" value="" description="" icon={Droplets} sourceName="" sourceUrl="" lastUpdated="" />
                            </>
                        ) : data ? (
                            <>
                                <SummaryAnalyticsCard
                                    title="Crime & Safety"
                                    value={`${data.metrics.crime.total_incidents} incidents`}
                                    primaryChip={data.metrics.crime.primary_type}
                                    trend={data.metrics.crime.trend}
                                    icon={ShieldAlert}
                                    sourceName="UK Police Data"
                                    sourceUrl="https://data.police.uk"
                                    lastUpdated={`Snapshot ${data.metrics.crime.last_updated}`}
                                    onClick={onMetricSelect ? () => onMetricSelect('crime') : undefined}
                                />
                                <SummaryAnalyticsCard
                                    title="Property Prices"
                                    value={`£${data.metrics.price.median_value.toLocaleString()}`}
                                    primaryChip={`${data.metrics.price.property_type}s`}
                                    trend={data.metrics.price.trend}
                                    icon={Home}
                                    sourceName="HM Land Registry"
                                    sourceUrl="https://landregistry.gov.uk"
                                    lastUpdated={`Snapshot ${data.metrics.price.last_updated}`}
                                    onClick={onMetricSelect ? () => onMetricSelect('price') : undefined}
                                />
                                <SummaryAnalyticsCard
                                    title="Flood Risk"
                                    value={data.metrics.flood.risk_level}
                                    primaryChip={data.metrics.flood.primary_source}
                                    icon={Droplets}
                                    sourceName="Environment Agency"
                                    sourceUrl="https://gov.uk/check-long-term-flood-risk"
                                    lastUpdated={`Snapshot ${data.metrics.flood.last_updated}`}
                                    onClick={onMetricSelect ? () => onMetricSelect('flood') : undefined}
                                />
                            </>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}

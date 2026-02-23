import React from 'react';
import { motion, useAnimationControls } from 'motion/react';
import type { PanInfo } from 'motion/react';
import { MapPin, ShieldAlert, Home, Droplets, X } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import type { SnapshotData } from '../App';

interface DashboardProps {
    isMobile: boolean;
    data: SnapshotData | undefined;
    isLoading: boolean;
    error: Error | null;
    drawerExpanded: boolean;
    setDrawerExpanded: (expanded: boolean) => void;
    setIsDesktopSidebarOpen: (open: boolean) => void;
    handleSearch: (e: React.SubmitEvent<HTMLFormElement>) => void;
}

export function Dashboard({
    isMobile,
    data,
    isLoading,
    error,
    drawerExpanded,
    setDrawerExpanded,
    setIsDesktopSidebarOpen,
    handleSearch
}: DashboardProps) {
    const panelRef = React.useRef<HTMLDivElement | null>(null);
    const [panelHeight, setPanelHeight] = React.useState(0);
    const mobileDrawerControls = useAnimationControls();
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
            mobileDrawerControls.set({ y: 0 });
            return;
        }

        if (drawerExpanded && hasContent) {
            mobileDrawerControls.start({ y: 0, transition: { type: 'spring', damping: 25, stiffness: 220, mass: 0.8 } });
            return;
        }

        mobileDrawerControls.start({ y: closedYValue, transition: { type: 'spring', damping: 22, stiffness: 260, mass: 0.8 } });
    }, [drawerExpanded, hasContent, isMobile, mobileDrawerControls, closedYValue]);

    return (
        <motion.div
            ref={panelRef}
            layoutId={!isMobile ? "desktop-panel" : undefined}
            className="app-overlay-panel"
            animate={mobileDrawerControls}
            initial={false}
            drag={isMobile ? "y" : false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(_e, info: PanInfo) => {
                if (!isMobile) return;
                const projectedY = info.offset.y + info.velocity.y * 0.1;
                if (projectedY > 50 && hasContent) {
                    setDrawerExpanded(false);
                } else if (projectedY < -50 && hasContent) {
                    setDrawerExpanded(true);
                } else if (hasContent) {
                    mobileDrawerControls.start({
                        y: drawerExpanded ? 0 : closedYValue,
                        transition: drawerExpanded
                            ? { type: 'spring', damping: 25, stiffness: 220, mass: 0.8 }
                            : { type: 'spring', damping: 22, stiffness: 260, mass: 0.8 }
                    });
                }
            }}
            transition={{ type: 'spring', damping: 22, stiffness: 260, mass: 0.8 }}
        >
            <div className="bottom-sheet-handle" />

            <div className="bottom-sheet-header">
                <h2 className="bottom-sheet-title">
                    {data ? data.postcode : 'Search Region'}
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
                        id="postcode-search"
                        name="postcode-search"
                        type="search"
                        autoComplete="postal-code"
                        placeholder="Enter postcode..."
                    />
                </div>
                <div className="form-feedback-slot" aria-live="polite">
                    {error ? <p className="error-text fade-in-up" role="alert">{error.message}</p> : null}
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
                                <MetricCard
                                    title="Crime & Safety"
                                    value={`${data.metrics.crime.total_incidents} incidents`}
                                    description={`Primary type: ${data.metrics.crime.primary_type}. Trend: ${data.metrics.crime.trend}.`}
                                    icon={ShieldAlert}
                                    sourceName="UK Police Data"
                                    sourceUrl="https://data.police.uk"
                                    lastUpdated={data.metrics.crime.last_updated}
                                />
                                <MetricCard
                                    title="Property Prices"
                                    value={`£${data.metrics.price.median_value.toLocaleString()}`}
                                    description={`Median solid price for ${data.metrics.price.property_type}s. Trend: ${data.metrics.price.trend}.`}
                                    icon={Home}
                                    sourceName="HM Land Registry"
                                    sourceUrl="https://landregistry.gov.uk"
                                    lastUpdated={data.metrics.price.last_updated}
                                />
                                <MetricCard
                                    title="Flood Risk"
                                    value={data.metrics.flood.risk_level}
                                    description={`Primary source: ${data.metrics.flood.primary_source}.`}
                                    icon={Droplets}
                                    sourceName="Environment Agency"
                                    sourceUrl="https://gov.uk/check-long-term-flood-risk"
                                    lastUpdated={data.metrics.flood.last_updated}
                                />
                            </>
                        ) : null}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

type TrendTone = 'positive' | 'negative' | 'neutral';

type TrendMeta = {
  readonly label: 'Down' | 'Up' | 'Stable';
  readonly tone: TrendTone;
  readonly icon: LucideIcon;
};

type SummaryAnalyticsCardProps = {
  readonly title: string;
  readonly value: string;
  readonly icon: LucideIcon;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly lastUpdated: string;
  readonly primaryChip: string;
  readonly trend?: string;
  readonly onClick?: () => void;
};

function getTrendMeta(trend: string): TrendMeta {
  const normalizedTrend = trend.trim().toLowerCase();

  if (normalizedTrend === 'down') {
    return { label: 'Down', tone: 'negative', icon: ArrowDownRight };
  }

  if (normalizedTrend === 'up') {
    return { label: 'Up', tone: 'positive', icon: ArrowUpRight };
  }

  return { label: 'Stable', tone: 'neutral', icon: Minus };
}

export function SummaryAnalyticsCard({
  title,
  value,
  icon: Icon,
  sourceName,
  sourceUrl,
  lastUpdated,
  primaryChip,
  trend,
  onClick,
}: SummaryAnalyticsCardProps) {
  const trendMeta = trend ? getTrendMeta(trend) : null;
  const TrendIcon = trendMeta?.icon;

  const content = (
    <>
      <header className="summary-analytics-header">
        <h3 className="summary-analytics-title">{title}</h3>
        <Icon className="metric-card-icon" size={18} aria-hidden="true" />
      </header>

      <p className="summary-analytics-kpi">{value}</p>

      <div className="summary-analytics-strip">
        {trendMeta && TrendIcon ? (
          <span className={`summary-pill summary-pill--${trendMeta.tone}`}>
            <TrendIcon size={13} aria-hidden="true" />
            <span>Trend {trendMeta.label}</span>
          </span>
        ) : null}
        <span className="summary-pill summary-pill--type" title={primaryChip}>
          {primaryChip}
        </span>
      </div>

      <footer className="summary-analytics-footer">
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
          Source: {sourceName}
        </a>
        <span>{lastUpdated}</span>
      </footer>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="summary-analytics-card summary-analytics-card--interactive"
        onClick={onClick}
        aria-label={`Open ${title} details`}
      >
        {content}
      </button>
    );
  }

  return <article className="summary-analytics-card">{content}</article>;
}

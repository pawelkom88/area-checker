import { BriefcaseBusiness, ShieldAlert } from 'lucide-react';
import { getCrimeTrendMeta } from '../utils/crimeTrend';

type CrimeAnalyticsCardProps = {
  readonly incidents: number;
  readonly trend: string;
  readonly primaryType: string;
  readonly leadingCategory?: string;
  readonly leadingCount?: number;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly snapshotLabel: string;
};

export function CrimeAnalyticsCard({
  incidents,
  trend,
  primaryType,
  leadingCategory,
  leadingCount,
  sourceName,
  sourceUrl,
  snapshotLabel,
}: CrimeAnalyticsCardProps) {
  const trendMeta = getCrimeTrendMeta(trend);
  const TrendIcon = trendMeta.icon;
  const topCategory = leadingCategory ?? primaryType;
  const safeLeadingCount = typeof leadingCount === 'number' ? leadingCount : 0;
  const topCategoryPercent = incidents > 0 ? Math.round((safeLeadingCount / incidents) * 100) : 0;

  return (
    <article className="crime-analytics-card">
      <header className="crime-analytics-header">
        <h3 className="crime-analytics-title">Crime &amp; Safety</h3>
        <ShieldAlert className="metric-card-icon" size={20} aria-hidden="true" />
      </header>

      <p className="crime-analytics-kpi">{incidents} incidents</p>

      <div className="crime-analytics-strip">
        <span
          className={`crime-pill crime-pill--${trendMeta.tone}`}
          aria-label={trendMeta.a11yLabel}
        >
          <TrendIcon size={14} aria-hidden="true" />
          <span>Trending {trendMeta.label.toLowerCase()}</span>
        </span>
      </div>

      <section className="crime-top-type" aria-label="Most common crime category">
        <div className="crime-top-type-icon" aria-hidden="true">
          <BriefcaseBusiness size={20} />
        </div>
        <div className="crime-top-type-content">
          <p className="crime-top-type-label">Most common</p>
          <p className="crime-top-type-title">{topCategory.toUpperCase()}</p>
          <div className="crime-top-type-stats">
            <div className="crime-top-type-track" aria-hidden="true">
              <span style={{ width: `${Math.max(4, Math.min(100, topCategoryPercent))}%` }} />
            </div>
            <span>{topCategoryPercent}% of incidents</span>
          </div>
        </div>
      </section>

      <footer className="crime-analytics-footer">
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
          Source: {sourceName}
        </a>
        <span>{snapshotLabel}</span>
      </footer>
    </article>
  );
}

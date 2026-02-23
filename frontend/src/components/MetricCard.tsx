import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type MetricCardProps = {
    readonly title: string;
    readonly value: string;
    readonly description: string;
    readonly icon: LucideIcon;
    readonly sourceName: string;
    readonly sourceUrl: string;
    readonly lastUpdated: string;
    readonly loading?: boolean;
    readonly compact?: boolean;
    readonly onClick?: () => void;
    readonly showSourceLink?: boolean;
};

export const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    description,
    icon: Icon,
    sourceName,
    sourceUrl,
    lastUpdated,
    loading = false,
    compact = false,
    onClick,
    showSourceLink = true,
}) => {
    if (loading) {
        return (
            <div className="metric-card skeleton fade-in-up" style={{ minHeight: '160px' }}>
            </div>
        );
    }

    const cardClassName = [
        'metric-card',
        'fade-in-up',
        compact ? 'metric-card--compact' : '',
        onClick ? 'metric-card--interactive' : '',
    ]
        .filter(Boolean)
        .join(' ');

    const sourceContent = showSourceLink ? (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
            Source: {sourceName}
        </a>
    ) : (
        <span>Source: {sourceName}</span>
    );

    const content = (
        <>
            <div className="metric-card-header">
                <h3 className="metric-card-title">{title}</h3>
                <Icon className="metric-card-icon" size={20} />
            </div>
            <div className="metric-card-value">{value}</div>
            <div className="metric-card-description">{description}</div>
            <div className="metric-card-footer">
                {sourceContent}
                <span>{lastUpdated}</span>
            </div>
        </>
    );

    if (onClick) {
        return (
            <button
                type="button"
                className={cardClassName}
                onClick={onClick}
                aria-label={`Open ${title} details`}
            >
                {content}
            </button>
        );
    }

    return (
        <article className={cardClassName}>
            {content}
        </article>
    );
};

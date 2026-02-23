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
}) => {
    if (loading) {
        return (
            <div className="metric-card skeleton fade-in-up" style={{ minHeight: '160px' }}>
            </div>
        );
    }

    return (
        <div className="metric-card fade-in-up">
            <div className="metric-card-header">
                <h3 className="metric-card-title">{title}</h3>
                <Icon className="metric-card-icon" size={20} />
            </div>
            <div className="metric-card-value">{value}</div>
            <div className="metric-card-description">{description}</div>
            <div className="metric-card-footer">
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                    Source: {sourceName}
                </a>
                <span>{lastUpdated}</span>
            </div>
        </div>
    );
};

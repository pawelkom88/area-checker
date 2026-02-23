import React from 'react';
import type { LucideIcon } from 'lucide-react';

type MetricCardProps = {
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
            <div className="metric-card glass skeleton" style={{ minHeight: '220px' }}>
            </div>
        );
    }

    return (
        <div className="metric-card glass fade-in-up">
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
                <span className="metric-card-date">{lastUpdated}</span>
            </div>
        </div>
    );
};

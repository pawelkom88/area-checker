import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricCard } from './MetricCard';
import { Home } from 'lucide-react';

describe('MetricCard', () => {
    it('renders correctly with given props', () => {
        render(
            <MetricCard
                title="Test Metric"
                value="100"
                description="A simple test metric"
                icon={Home}
                sourceName="Test Source"
                sourceUrl="http://test.com"
                lastUpdated="2026-02-23"
            />
        );

        expect(screen.getByText('Test Metric')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('A simple test metric')).toBeInTheDocument();

        const sourceLink = screen.getByRole('link', { name: /Source: Test Source/i });
        expect(sourceLink).toHaveAttribute('href', 'http://test.com');
        expect(screen.getByText('2026-02-23')).toBeInTheDocument();
    });

    it('renders skeleton when loading is true', () => {
        const { container } = render(
            <MetricCard
                title="Test"
                value="100"
                description="desc"
                icon={Home}
                sourceName="Src"
                sourceUrl="url"
                lastUpdated="date"
                loading={true}
            />
        );
        expect(container.querySelector('.skeleton')).toBeInTheDocument();
        expect(screen.queryByText('Test Metric')).not.toBeInTheDocument();
    });
});

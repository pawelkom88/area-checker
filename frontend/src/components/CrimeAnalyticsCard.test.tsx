import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CrimeAnalyticsCard } from './CrimeAnalyticsCard';

describe('CrimeAnalyticsCard', () => {
  it('renders compact analytics content with source and snapshot date', () => {
    render(
      <CrimeAnalyticsCard
        incidents={142}
        trend="down"
        primaryType="Anti-social behaviour"
        leadingCategory="Theft from the person"
        leadingCount={47}
        sourceName="UK Police Data"
        sourceUrl="https://data.police.uk"
        snapshotLabel="Snapshot 2023-11"
      />,
    );

    expect(screen.getByText('Crime & Safety')).toBeInTheDocument();
    expect(screen.getByText('142 incidents')).toBeInTheDocument();
    expect(screen.getByText('Trending down')).toBeInTheDocument();
    expect(screen.getByText('Most common')).toBeInTheDocument();
    expect(screen.getByText(/theft from the person/i)).toBeInTheDocument();
    expect(screen.getByText('33% of incidents')).toBeInTheDocument();

    const sourceLink = screen.getByRole('link', { name: /Source: UK Police Data/i });
    expect(sourceLink).toHaveAttribute('href', 'https://data.police.uk');
    expect(screen.getByText('Snapshot 2023-11')).toBeInTheDocument();
  });
});

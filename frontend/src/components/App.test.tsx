import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from './ErrorFallback';
import { createAppRouter } from '../router';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const mockPayload = {
  postcode: 'SW1A 1AA',
  centroid: { lat: 51.501, lng: -0.141 },
  metrics: {
    crime: {
      total_incidents: 142,
      trend: 'down',
      primary_type: 'Anti-social behaviour',
      last_updated: '2023-11',
    },
    price: {
      median_value: 1250000,
      trend: 'up',
      property_type: 'Flat',
      last_updated: '2023-10',
    },
    flood: {
      risk_level: 'Low',
      primary_source: 'Surface Water',
      last_updated: '2024-01',
    },
  },
};

async function renderAppAt(path: string) {
  window.history.pushState({}, '', path);

  const queryClient = createTestQueryClient();
  const router = createAppRouter();

  render(
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>,
  );

  await act(async () => {
    await router.load();
  });
}

describe('App Router Search + Details Flow', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 844 });
  });

  it('hydrates from postcode URL param and loads cards', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockPayload,
    });

    await renderAppAt('/?postcode=SW1A%201AA');

    await waitFor(() => {
      expect(screen.getByText(/Property Prices/i)).toBeInTheDocument();
      expect(screen.getByText(/Crime & Safety/i)).toBeInTheDocument();
      expect(screen.getByText(/Flood Risk/i)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/snapshot?postcode=SW1A%201AA');
  });

  it('ignores invalid postcode URL param without crashing or fetching', async () => {
    await renderAppAt('/?postcode=!!!');

    expect(screen.getByPlaceholderText('Enter postcode...')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submitting search updates URL query param and fetches', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockPayload,
    });

    await renderAppAt('/');

    const input = screen.getByPlaceholderText('Enter postcode...');
    fireEvent.change(input, { target: { value: 'sw1a 1aa' } });
    fireEvent.click(screen.getByRole('button', { name: /search region/i }));

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(window.location.pathname).toBe('/');
      expect(params.get('postcode')).toBe('SW1A 1AA');
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/snapshot?postcode=SW1A%201AA');
  });

  it('navigates to metric details route when a summary card is clicked', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockPayload,
    });

    await renderAppAt('/?postcode=SW1A%201AA');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Open Crime & Safety details/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Open Crime & Safety details/i }));

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(window.location.pathname).toBe('/details');
      expect(params.get('postcode')).toBe('SW1A 1AA');
      expect(params.get('metric')).toBe('crime');
      expect(screen.getByRole('button', { name: /Back to summary/i })).toBeInTheDocument();
    });
  });

  it('supports direct details deep-link and map toggle placeholder', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockPayload,
    });

    await renderAppAt('/details?postcode=SW1A%201AA&metric=flood');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Back to summary/i })).toBeInTheDocument();
      expect(screen.getByText('Map Layer Availability')).toBeInTheDocument();
    });

    expect(screen.queryByRole('heading', { name: /Flood Risk Map/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show on map/i }));

    await waitFor(() => {
      const legend = screen.getByRole('note');
      expect(within(legend).getByRole('heading', { name: /Flood Risk Map/i })).toBeInTheDocument();
      expect(within(legend).getByText(/Detailed flood-risk map layer is not available yet/i)).toBeInTheDocument();
    });
  });
});

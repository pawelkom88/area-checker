import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

// Setup fresh QueryClient per test
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false, // turn off retries to prevent tests timing out
        },
    },
});

// Mock the backend API payload
const mockPayload = {
    postcode: 'SW1A 1AA',
    centroid: { lat: 51.501, lng: -0.141 },
    metrics: {
        crime: {
            total_incidents: 142,
            trend: "down",
            primary_type: "Anti-social behaviour",
            last_updated: "2023-11"
        },
        price: {
            median_value: 1250000,
            trend: "up",
            property_type: "Flat",
            last_updated: "2023-10"
        },
        flood: {
            risk_level: "Low",
            primary_source: "Surface Water",
            last_updated: "2024-01"
        }
    }
};

describe('App Search Flow (Mobile First)', () => {
    beforeEach(() => {
        // Reset fetch mock before each test
        global.fetch = vi.fn();

        // Default DOM layout mocks useful for Framer Motion / react-leaflet
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 390 });
        Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 844 });
    });

    it('shows results for valid search', async () => {
        const testQueryClient = createTestQueryClient();

        // Mock the successful fetch response
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => mockPayload
        });

        render(
            <QueryClientProvider client={testQueryClient}>
                <App />
            </QueryClientProvider>
        );

        const input = screen.getByPlaceholderText('Enter postcode...');
        fireEvent.change(input, { target: { value: 'sw1a 1aa' } });

        const button = screen.getByRole('button', { name: /search region/i });
        fireEvent.click(button);

        await waitFor(() => {
            // Input should remain but wait for UI to update
            expect(screen.getByPlaceholderText('Enter postcode...')).toBeInTheDocument();
        });

        expect(global.fetch).toHaveBeenCalledWith('/api/snapshot?postcode=SW1A%201AA');

        // Cards should appear
        await waitFor(() => {
            expect(screen.getByText(/Property Prices/i)).toBeInTheDocument();
            expect(screen.getByText(/Crime & Safety/i)).toBeInTheDocument();
            expect(screen.getByText(/Flood Risk/i)).toBeInTheDocument();
        });
    });

    it('shows error on invalid search', async () => {
        const testQueryClient = createTestQueryClient();

        // Mock a 404 fetch response
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'No snapshot available for this postcode yet.' })
        });

        render(
            <QueryClientProvider client={testQueryClient}>
                <App />
            </QueryClientProvider>
        );

        const input = screen.getByPlaceholderText('Enter postcode...');
        fireEvent.change(input, { target: { value: 'XX99 9XX' } });

        const button = screen.getByRole('button', { name: /search region/i });
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText('No snapshot available for this postcode yet.')).toBeInTheDocument();
        });
    });

    it('shows validation error and skips request for invalid postcode format', async () => {
        const testQueryClient = createTestQueryClient();

        render(
            <QueryClientProvider client={testQueryClient}>
                <App />
            </QueryClientProvider>
        );

        const input = screen.getByPlaceholderText('Enter postcode...');
        fireEvent.change(input, { target: { value: 'not-a-postcode' } });

        const button = screen.getByRole('button', { name: /search region/i });
        fireEvent.click(button);

        expect(await screen.findByText('Please enter a valid UK postcode.')).toBeInTheDocument();
        expect(global.fetch).not.toHaveBeenCalled();
    });
});

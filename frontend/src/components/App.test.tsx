import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App Search Flow (Mobile First)', () => {
    it('renders default empty state', () => {
        render(<App />);
        expect(screen.getByRole('heading', { name: /Search Region/i })).toBeInTheDocument();
        expect(screen.getByRole('searchbox', { name: /UK Postcode/i })).toBeInTheDocument();
    });

    it('shows error on invalid search', async () => {
        render(<App />);
        const input = screen.getByRole('searchbox', { name: /UK Postcode/i });
        const button = screen.getByRole('button', { name: /Search Region/i });

        fireEvent.change(input, { target: { value: 'INVALID' } });
        fireEvent.click(button);

        // Wait for the mock async function to reject or finish
        await act(async () => {
            await new Promise(r => setTimeout(r, 1300));
        });

        expect(screen.getByText(/No snapshot available/i)).toBeInTheDocument();
    });

    it('shows results for valid search', async () => {
        render(<App />);
        const input = screen.getByRole('searchbox', { name: /UK Postcode/i });
        const button = screen.getByRole('button', { name: /Search Region/i });

        fireEvent.change(input, { target: { value: 'SW1A 1AA' } });
        fireEvent.click(button);

        await act(async () => {
            await new Promise(r => setTimeout(r, 1300));
        });

        // Cards should appear
        expect(screen.getByText(/Property Prices/i)).toBeInTheDocument();
        expect(screen.getByText(/Crime & Safety/i)).toBeInTheDocument();
        expect(screen.getByText(/Flood Risk/i)).toBeInTheDocument();
    });
});

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App Search Flow', () => {
    it('renders default empty state', () => {
        render(<App />);
        expect(screen.getByRole('heading', { name: /UK Area Snapshot/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Enter a UK Postcode/i)).toBeInTheDocument();
        expect(screen.queryByText(/Crime & Safety/i)).not.toBeInTheDocument();
    });

    it('shows error on invalid search', async () => {
        render(<App />);
        const input = screen.getByPlaceholderText(/Enter a UK Postcode/i);
        const button = screen.getByRole('button', { name: /Search/i });

        fireEvent.change(input, { target: { value: 'INVALID' } });
        fireEvent.click(button);

        // Wait for the mock async function to reject or finish
        // For now the mock in App.tsx just checks if it includes SW1
        await act(async () => {
            await new Promise(r => setTimeout(r, 1300));
        });

        expect(screen.getByText(/No snapshot available/i)).toBeInTheDocument();
        expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
    });

    it('shows results for valid search', async () => {
        render(<App />);
        const input = screen.getByPlaceholderText(/Enter a UK Postcode/i);
        const button = screen.getByRole('button', { name: /Search/i });

        fireEvent.change(input, { target: { value: 'SW1A 1AA' } });
        fireEvent.click(button);

        // Loading state right after click
        expect(screen.getByText('Searching...')).toBeInTheDocument();

        await act(async () => {
            await new Promise(r => setTimeout(r, 1300));
        });

        // Cards should appear
        expect(screen.getByText(/Property Prices/i)).toBeInTheDocument();
        expect(screen.getByText(/Crime & Safety/i)).toBeInTheDocument();
        expect(screen.getByText(/Flood Risk/i)).toBeInTheDocument();
    });
});

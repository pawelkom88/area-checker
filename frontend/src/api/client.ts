import type { SnapshotData } from '../App';

/**
 * Fetches the snapshot payload from the Netlify edge API.
 */
export async function fetchSnapshot(postcode: string): Promise<SnapshotData> {
    const normalized = postcode.toUpperCase().replace(/\s+/g, ' ').trim();

    const response = await fetch(`/api/snapshot?postcode=${encodeURIComponent(normalized)}`);

    if (!response.ok) {
        let errorMsg = 'Failed to fetch snapshot data.';
        try {
            const errBody = await response.json();
            if (errBody.error) errorMsg = errBody.error;
        } catch { /* ignore fallback */ }
        throw new Error(errorMsg);
    }

    const payload: SnapshotData = await response.json();
    return payload;
}

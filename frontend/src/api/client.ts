import type { SnapshotData } from '../types/snapshot';
import { normalizePostcodeInput } from '../utils/postcode';

export async function fetchSnapshot(postcode: string): Promise<SnapshotData> {
    const normalized = normalizePostcodeInput(postcode);

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

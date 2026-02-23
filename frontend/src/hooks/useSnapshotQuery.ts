import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchSnapshot } from '../api/client';
import type { SnapshotData } from '../App';

export const snapshotQueryKeys = {
    all: ['snapshot'] as const,
    byPostcode: (postcode: string) => ['snapshot', postcode] as const,
};

export function useSnapshotQuery(postcode: string) {
    return useSuspenseQuery<SnapshotData, Error>({
        queryKey: snapshotQueryKeys.byPostcode(postcode),
        queryFn: () => fetchSnapshot(postcode),
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: (failureCount, error) => {
            if (error.message.includes('No snapshot available')) return false;
            return failureCount < 2;
        },
    });
}

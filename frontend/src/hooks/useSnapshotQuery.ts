import { useQuery } from '@tanstack/react-query';
import { fetchSnapshot } from '../api/client';
import type { SnapshotData } from '../App';

export function useSnapshotQuery(postcode: string | null) {
    return useQuery<SnapshotData, Error>({
        queryKey: ['snapshot', postcode],
        queryFn: () => fetchSnapshot(postcode as string),
        // Only execute the query if a valid postcode has been provided
        enabled: !!postcode && postcode.trim().length > 0,
        // Keep data fresh for 5 minutes
        staleTime: 1000 * 60 * 5,
        // Keep cached data in memory for 30 minutes
        gcTime: 1000 * 60 * 30,
        // Don't retry 404s infinitely
        retry: (failureCount, error) => {
            if (error.message.includes('No snapshot available')) return false;
            return failureCount < 2;
        }
    });
}

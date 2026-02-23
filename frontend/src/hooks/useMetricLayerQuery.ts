import { useQuery } from '@tanstack/react-query';
import type { MetricId } from '../constants/metrics';
import type { MetricLayerResponse } from '../types/layers';
import { fetchMetricLayer, HttpError } from '../api/client';

type UseMetricLayerQueryParams = {
  readonly postcode: string;
  readonly metric: MetricId;
  readonly enabled?: boolean;
};

export function useMetricLayerQuery({ postcode, metric, enabled = false }: UseMetricLayerQueryParams) {
  return useQuery<MetricLayerResponse>({
    queryKey: ['metric-layer', metric, postcode],
    queryFn: () => fetchMetricLayer({ postcode, metric }),
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: (failureCount, error) => {
      if (error instanceof HttpError && error.status === 429) {
        return false;
      }

      return failureCount < 1;
    },
  });
}

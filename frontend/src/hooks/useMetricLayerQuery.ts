import { useQuery } from '@tanstack/react-query';
import type { MetricId } from '../constants/metrics';
import type { MetricLayerResponse } from '../types/layers';

type UseMetricLayerQueryParams = {
  readonly postcode: string;
  readonly metric: MetricId;
  readonly enabled?: boolean;
};

export function useMetricLayerQuery({ postcode, metric, enabled = false }: UseMetricLayerQueryParams) {
  return useQuery<MetricLayerResponse>({
    queryKey: ['metric-layer', metric, postcode],
    // TODO: replace with real endpoint once layer data is available.
    queryFn: async () => ({
      metric,
      postcode,
      status: 'unavailable',
      reason: 'Detailed map layer data is not available yet.',
      legend: [],
      features: [],
    }),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

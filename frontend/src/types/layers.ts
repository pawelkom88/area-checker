import type { MetricId } from '../constants/metrics';

export interface LegendBucket {
  readonly id: string;
  readonly label: string;
  readonly color: string;
}

export interface MetricLayerResponse {
  readonly metric: MetricId;
  readonly postcode: string;
  readonly status: 'unavailable';
  readonly reason: string;
  readonly legend: readonly LegendBucket[];
  readonly features: readonly unknown[];
}

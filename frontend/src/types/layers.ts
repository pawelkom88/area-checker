import type { MetricId } from '../constants/metrics';

export interface LegendBucket {
  readonly id: string;
  readonly label: string;
  readonly color: string;
}

export interface CrimePointFeature {
  readonly id: string;
  readonly type: 'point';
  readonly lat: number;
  readonly lng: number;
  readonly category: string;
}

export interface MetricLayerResponse {
  readonly metric: MetricId;
  readonly postcode: string;
  readonly status: 'available' | 'unavailable';
  readonly reason?: string;
  readonly sourceName?: string;
  readonly lastUpdated?: string;
  readonly legend: readonly LegendBucket[];
  readonly features: readonly CrimePointFeature[];
}

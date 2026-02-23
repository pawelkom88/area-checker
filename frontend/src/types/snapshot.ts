export type SnapshotMetric<T> = Readonly<T>;

export type SnapshotData = {
  readonly postcode: string;
  readonly centroid: { readonly lat: number; readonly lng: number };
  readonly metrics: {
    readonly crime: SnapshotMetric<{
      total_incidents: number;
      trend: string;
      primary_type: string;
      last_updated: string;
    }>;
    readonly price: SnapshotMetric<{
      median_value: number;
      trend: string;
      property_type: string;
      last_updated: string;
    }>;
    readonly flood: SnapshotMetric<{
      risk_level: string;
      primary_source: string;
      last_updated: string;
    }>;
  };
};

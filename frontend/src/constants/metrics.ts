import { Droplets, Home, ShieldAlert } from 'lucide-react';
import { z } from 'zod';

export const metricIdSchema = z.enum(['crime', 'price', 'flood']);

export type MetricId = z.infer<typeof metricIdSchema>;

export const metricMeta: Record<
  MetricId,
  {
    readonly title: string;
    readonly mapPlaceholder: string;
    readonly icon: typeof ShieldAlert;
  }
> = {
  crime: {
    title: 'Crime & Safety',
    mapPlaceholder: 'Detailed crime layer is not available yet for this postcode.',
    icon: ShieldAlert,
  },
  price: {
    title: 'Property Prices',
    mapPlaceholder: 'Detailed property-price map layer is not available yet for this postcode.',
    icon: Home,
  },
  flood: {
    title: 'Flood Risk',
    mapPlaceholder: 'Detailed flood-risk map layer is not available yet for this postcode.',
    icon: Droplets,
  },
};

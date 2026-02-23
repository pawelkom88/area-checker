import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CrimeTrendTone = 'positive' | 'negative' | 'neutral';

export type CrimeTrendMeta = {
  readonly label: 'Down' | 'Up' | 'Stable';
  readonly tone: CrimeTrendTone;
  readonly icon: LucideIcon;
  readonly a11yLabel: string;
};

export function getCrimeTrendMeta(trend: string): CrimeTrendMeta {
  const normalizedTrend = trend.trim().toLowerCase();

  if (normalizedTrend === 'down') {
    return {
      label: 'Down',
      tone: 'positive',
      icon: ArrowDownRight,
      a11yLabel: 'Trend down, improving crime outlook.',
    };
  }

  if (normalizedTrend === 'up') {
    return {
      label: 'Up',
      tone: 'negative',
      icon: ArrowUpRight,
      a11yLabel: 'Trend up, worsening crime outlook.',
    };
  }

  return {
    label: 'Stable',
    tone: 'neutral',
    icon: Minus,
    a11yLabel: 'Trend stable, no clear directional change in crime outlook.',
  };
}

import { describe, expect, it } from 'vitest';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { getCrimeTrendMeta } from './crimeTrend';

describe('getCrimeTrendMeta', () => {
  it('maps down to positive trend metadata', () => {
    const result = getCrimeTrendMeta('down');

    expect(result.label).toBe('Down');
    expect(result.tone).toBe('positive');
    expect(result.icon).toBe(ArrowDownRight);
    expect(result.a11yLabel).toContain('improving');
  });

  it('maps up to negative trend metadata', () => {
    const result = getCrimeTrendMeta('up');

    expect(result.label).toBe('Up');
    expect(result.tone).toBe('negative');
    expect(result.icon).toBe(ArrowUpRight);
    expect(result.a11yLabel).toContain('worsening');
  });

  it('maps unknown trend to neutral metadata', () => {
    const result = getCrimeTrendMeta('not-available');

    expect(result.label).toBe('Stable');
    expect(result.tone).toBe('neutral');
    expect(result.icon).toBe(Minus);
  });
});

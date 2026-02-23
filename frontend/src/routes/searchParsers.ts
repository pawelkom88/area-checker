import type { MetricId } from '../constants/metrics';
import { metricIdSchema } from '../constants/metrics';
import { parsePostcodeInput } from '../utils/postcode';

export type HomeSearch = {
  readonly postcode?: string;
};

export type DetailsSearch = {
  readonly postcode?: string;
  readonly metric?: MetricId;
};

function getSearchString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function parseHomeSearch(rawSearch: Record<string, unknown>): HomeSearch {
  const postcodeRaw = getSearchString(rawSearch['postcode']);
  if (!postcodeRaw) {
    return {};
  }

  const parsedPostcode = parsePostcodeInput(postcodeRaw);
  if (!parsedPostcode.success) {
    return {};
  }

  return { postcode: parsedPostcode.data };
}

export function parseDetailsSearch(rawSearch: Record<string, unknown>): DetailsSearch {
  const postcodeRaw = getSearchString(rawSearch['postcode']);
  const metricRaw = getSearchString(rawSearch['metric']);

  const parsedPostcode = postcodeRaw ? parsePostcodeInput(postcodeRaw) : null;
  const parsedMetric = metricRaw ? metricIdSchema.safeParse(metricRaw) : null;

  return {
    postcode: parsedPostcode?.success ? parsedPostcode.data : undefined,
    metric: parsedMetric?.success ? parsedMetric.data : undefined,
  };
}

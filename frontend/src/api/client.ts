import type { SnapshotData } from '../types/snapshot';
import type { MetricId } from '../constants/metrics';
import type { MetricLayerResponse } from '../types/layers';
import { normalizePostcodeInput } from '../utils/postcode';

type ApiErrorResponse = {
  readonly error?: string;
  readonly retryAfterSeconds?: number;
};

export class HttpError extends Error {
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(options: { readonly status: number; readonly message: string; readonly retryAfterSeconds?: number }) {
    super(options.message);
    this.name = 'HttpError';
    this.status = options.status;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

async function readErrorResponse(response: Response): Promise<ApiErrorResponse> {
  try {
    return await response.json() as ApiErrorResponse;
  } catch {
    return {};
  }
}

function getDefaultErrorMessage(status: number): string {
  if (status === 429) {
    return 'Data provider is receiving too many requests right now. Please wait a minute and try again.';
  }

  return 'Failed to fetch data.';
}

async function throwForNonOkResponse(response: Response): Promise<never> {
  const errorPayload = await readErrorResponse(response);
  const headerRetryAfter = response.headers.get('Retry-After');
  const retryAfterSeconds = errorPayload.retryAfterSeconds
    ?? (headerRetryAfter ? Number.parseInt(headerRetryAfter, 10) : undefined);
  const message = errorPayload.error ?? getDefaultErrorMessage(response.status);

  throw new HttpError({
    status: response.status,
    message,
    retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
  });
}

export async function fetchSnapshot(postcode: string): Promise<SnapshotData> {
  const normalized = normalizePostcodeInput(postcode);

  const response = await fetch(`/api/snapshot?postcode=${encodeURIComponent(normalized)}`);

  if (!response.ok) {
    await throwForNonOkResponse(response);
  }

  return await response.json() as SnapshotData;
}

export async function fetchMetricLayer(options: {
  readonly postcode: string;
  readonly metric: MetricId;
}): Promise<MetricLayerResponse> {
  const normalizedPostcode = normalizePostcodeInput(options.postcode);
  const response = await fetch(
    `/api/layer?postcode=${encodeURIComponent(normalizedPostcode)}&metric=${encodeURIComponent(options.metric)}`,
  );

  if (!response.ok) {
    await throwForNonOkResponse(response);
  }

  return await response.json() as MetricLayerResponse;
}

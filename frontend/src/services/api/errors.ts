import { ErrorEnvelopeSchema } from './types';

/** Normalized codes the UI switches on -- never a raw backend error_code or Python exception name. */
export type AppErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'VALIDATION_ERROR'
  | 'TRIP_NOT_FOUND'
  | 'ROUTE_ERROR'
  | 'CONDITION_CHANGE_ERROR'
  | 'EXPLANATION_ERROR'
  | 'SPEECH_UNAVAILABLE'
  | 'SPEECH_ERROR'
  | 'UNKNOWN_ERROR';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status?: number;
  readonly requestId?: string;

  constructor(code: AppErrorCode, message: string, status?: number, requestId?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

/** backend/app/domain/common/errors.py's taxonomy -> a normalized frontend code + a
 * human-readable fallback message (the backend's own `message` is used when present -- this
 * fallback only covers the case where the body couldn't be parsed as an ErrorEnvelope at all). */
const BACKEND_ERROR_CODE_MAP: Record<string, { code: AppErrorCode; fallbackMessage: string }> = {
  ValidationError: { code: 'VALIDATION_ERROR', fallbackMessage: 'That trip request was invalid.' },
  TripNotFoundError: { code: 'TRIP_NOT_FOUND', fallbackMessage: 'This trip no longer exists on the server.' },
  RouteNotFoundError: { code: 'ROUTE_ERROR', fallbackMessage: 'No route could be found for one or more modes.' },
  RoutingUnavailableError: { code: 'ROUTE_ERROR', fallbackMessage: 'The routing service is unavailable right now.' },
  EnrichmentUnavailableError: { code: 'ROUTE_ERROR', fallbackMessage: 'Cost/carbon data is unavailable right now.' },
  DecisionFailureError: { code: 'CONDITION_CHANGE_ERROR', fallbackMessage: 'The decision engine could not produce a result.' },
  ExplanationProviderFailureError: { code: 'EXPLANATION_ERROR', fallbackMessage: 'The explanation service failed.' },
  SpeechUnavailableError: { code: 'SPEECH_UNAVAILABLE', fallbackMessage: 'Voice narration is not enabled on this server.' },
  SpeechProviderFailureError: { code: 'SPEECH_ERROR', fallbackMessage: 'Voice narration is temporarily unavailable.' },
};

/** Converts a non-2xx fetch Response into a typed AppError, per the backend's ErrorEnvelope
 * shape ({error_code, message, request_id}) -- never surfaces a stack trace or raw exception. */
export async function toAppErrorFromResponse(response: Response): Promise<AppError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return new AppError('UNKNOWN_ERROR', 'The server returned an unexpected error.', response.status);
  }

  const parsed = ErrorEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return new AppError('UNKNOWN_ERROR', 'The server returned an unexpected error.', response.status);
  }

  const mapped = BACKEND_ERROR_CODE_MAP[parsed.data.error_code];
  return new AppError(
    mapped?.code ?? 'UNKNOWN_ERROR',
    parsed.data.message || mapped?.fallbackMessage || 'Something went wrong.',
    response.status,
    parsed.data.request_id ?? undefined,
  );
}

export function toAppErrorFromException(exc: unknown): AppError {
  if (exc instanceof AppError) return exc;
  if (exc instanceof DOMException && exc.name === 'AbortError') {
    return new AppError('TIMEOUT_ERROR', 'The request took too long to respond.');
  }
  if (exc instanceof TypeError) {
    // fetch() rejects with TypeError on network failure (DNS, connection refused, CORS, etc.)
    return new AppError('NETWORK_ERROR', 'Could not reach the GreenRoute server.');
  }
  return new AppError('UNKNOWN_ERROR', 'An unexpected error occurred.');
}

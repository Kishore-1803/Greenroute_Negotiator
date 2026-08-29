import type { ZodType } from 'zod';
import { toAppErrorFromException, toAppErrorFromResponse } from './errors';
import { getToken } from '@/lib/auth';

// A relative default is essential for LAN demos: a browser at another machine must call the
// machine serving the frontend, not that browser's own localhost. Vite proxies /api in
// development; production can set VITE_API_BASE_URL to an explicit API origin if needed.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 60_000;

interface RequestOptions<T> {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  schema: ZodType<T>;
}

/**
 * The single fetch() call site for the whole app (Section 3's directive: "components should
 * never directly call fetch"). Centralizes the base URL, JSON headers, timeout, HTTP error
 * normalization, and response-shape validation.
 */
export async function apiRequest<T>({ method, path, body, schema }: RequestOptions<T>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (exc) {
    throw toAppErrorFromException(exc);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw await toAppErrorFromResponse(response);
  }

  const json = await response.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    // A backend contract drift, not a runtime failure -- fail loudly rather than rendering
    // `undefined` deep in a component (Section 5's directive).
    console.error('GreenRoute API contract mismatch', { path, issues: parsed.error.issues });
    throw toAppErrorFromException(new Error('API response did not match the expected contract'));
  }
  return parsed.data;
}

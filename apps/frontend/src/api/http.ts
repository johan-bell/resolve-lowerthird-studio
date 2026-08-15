import type { ApiResult } from '@lower-thirds/shared';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Nest's validation pipe returns { message: string[] } — surface it usefully. */
const readError = async (response: Response): Promise<string> => {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const { message } = body as { message: unknown };
      if (Array.isArray(message)) return message.join('; ');
      if (typeof message === 'string') return message;
    }
  } catch {
    // fall through to the status text
  }
  return response.statusText;
};

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        error: { code: `HTTP_${String(response.status)}`, message: await readError(response) },
      };
    }

    return (await response.json()) as ApiResult<T>;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, error: { code: 'ABORTED', message: 'Request was cancelled.' } };
    }
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'The backend is unreachable.',
      },
    };
  }
}

/** The single place the app talks HTTP; always resolves to an ApiResult. */
export const apiGet = <T>(path: string, signal?: AbortSignal): Promise<ApiResult<T>> =>
  request<T>('GET', path, undefined, signal);

export const apiPost = <T>(path: string, body?: unknown): Promise<ApiResult<T>> =>
  request<T>('POST', path, body);

export const apiPatch = <T>(path: string, body?: unknown): Promise<ApiResult<T>> =>
  request<T>('PATCH', path, body);

export const apiDelete = <T>(path: string): Promise<ApiResult<T>> =>
  request<T>('DELETE', path);

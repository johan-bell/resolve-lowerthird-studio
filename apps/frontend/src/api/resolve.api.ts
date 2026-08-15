import type { ApiResult, ResolveStatus } from '@lower-thirds/shared';
import { apiGet } from './http';

/** Forces a fresh subprocess check — use sparingly, it costs a Python spawn. */
export const fetchResolveStatus = (signal?: AbortSignal): Promise<ApiResult<ResolveStatus>> =>
  apiGet<ResolveStatus>('/resolve/status', signal);

/** Reads the backend's cached view — instant, good for first paint. */
export const fetchCachedResolveStatus = (
  signal?: AbortSignal,
): Promise<ApiResult<ResolveStatus>> => apiGet<ResolveStatus>('/resolve/status/cached', signal);

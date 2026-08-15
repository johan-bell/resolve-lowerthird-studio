import type { ApiResult, ImportFormat, QueueItem, QueueList } from '@lower-thirds/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from './http';

export interface ImportResult {
  list: QueueList;
  imported: number;
  warnings: string[];
}

export const listQueues = (signal?: AbortSignal): Promise<ApiResult<QueueList[]>> =>
  apiGet<QueueList[]>('/queue/lists', signal);

export const getQueue = (id: string): Promise<ApiResult<QueueList>> =>
  apiGet<QueueList>(`/queue/lists/${id}`);

export const createQueue = (label: string): Promise<ApiResult<QueueList>> =>
  apiPost<QueueList>('/queue/lists', { label });

export const renameQueue = (id: string, label: string): Promise<ApiResult<QueueList>> =>
  apiPatch<QueueList>(`/queue/lists/${id}`, { label });

export const deleteQueue = (id: string): Promise<ApiResult<{ deleted: true }>> =>
  apiDelete<{ deleted: true }>(`/queue/lists/${id}`);

export const addQueueItem = (
  listId: string,
  item: { name: string; title?: string },
): Promise<ApiResult<QueueItem>> => apiPost<QueueItem>(`/queue/lists/${listId}/items`, item);

export const updateQueueItem = (
  id: string,
  patch: { name?: string; title?: string; order?: number },
): Promise<ApiResult<QueueItem>> => apiPatch<QueueItem>(`/queue/items/${id}`, patch);

export const deleteQueueItem = (id: string): Promise<ApiResult<{ deleted: true }>> =>
  apiDelete<{ deleted: true }>(`/queue/items/${id}`);

export const reorderQueue = (
  listId: string,
  items: { id: string; order: number }[],
): Promise<ApiResult<QueueList>> => apiPatch<QueueList>(`/queue/lists/${listId}/order`, { items });

export const importQueue = (
  format: ImportFormat,
  content: string,
  label?: string,
): Promise<ApiResult<ImportResult>> =>
  apiPost<ImportResult>('/queue/import', { format, content, label });

export const exportQueue = (
  id: string,
  format: ImportFormat,
): Promise<ApiResult<{ content: string; format: ImportFormat }>> =>
  apiGet<{ content: string; format: ImportFormat }>(`/queue/lists/${id}/export?format=${format}`);

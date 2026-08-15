import type { ApiResult, LowerThirdStyle } from '@lower-thirds/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from './http';

export interface StylePreset extends LowerThirdStyle {
  id: string;
  name: string;
  createdAt: string;
}

export const listPresets = (signal?: AbortSignal): Promise<ApiResult<StylePreset[]>> =>
  apiGet<StylePreset[]>('/presets', signal);

export const createPreset = (
  preset: LowerThirdStyle & { name: string },
): Promise<ApiResult<StylePreset>> => apiPost<StylePreset>('/presets', preset);

export const updatePreset = (
  id: string,
  patch: Partial<LowerThirdStyle & { name: string }>,
): Promise<ApiResult<StylePreset>> => apiPatch<StylePreset>(`/presets/${id}`, patch);

export const deletePreset = (id: string): Promise<ApiResult<{ deleted: true }>> =>
  apiDelete<{ deleted: true }>(`/presets/${id}`);

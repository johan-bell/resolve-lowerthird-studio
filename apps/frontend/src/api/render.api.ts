import type {
  ApiResult,
  AnimationTiming,
  LowerThirdStyle,
  RenderFormat,
  RenderJobResult,
} from '@lower-thirds/shared';
import { apiGet, apiPost } from './http';

export interface RenderCapability {
  available: boolean;
  outputDir: string;
  reason: string | null;
}

export interface StartRenderBody {
  itemIds: string[];
  targets?: { name: string; subtitle: string }[];
  style: LowerThirdStyle;
  timing: AnimationTiming;
  format: RenderFormat;
  width: number;
  height: number;
}

export const renderCapability = (): Promise<ApiResult<RenderCapability>> =>
  apiGet<RenderCapability>('/render/capability');

export const startRender = (
  body: StartRenderBody,
): Promise<ApiResult<RenderJobResult & { jobId: string }>> =>
  apiPost<RenderJobResult & { jobId: string }>('/render', body);

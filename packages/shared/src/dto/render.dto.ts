import type { AnimationTiming } from '../layout/animation';
import type { LowerThirdStyle } from './lower-third-style.dto';

export type RenderFormat = 'prores4444';

export interface RenderTarget {
  name: string;
  subtitle: string;
}

export interface RenderRequest {
  /** Queue item ids to render; empty means "the one supplied inline". */
  itemIds: string[];
  style: LowerThirdStyle;
  timing: AnimationTiming;
  format: RenderFormat;
  /** Frame size; lower-third coordinates are expressed in these pixels. */
  width: number;
  height: number;
}

export interface RenderedFile {
  itemId: string;
  name: string;
  fileName: string;
  /** Absolute path on the machine running the backend. */
  path: string;
  bytes: number;
  frames: number;
  durationSeconds: number;
}

export interface RenderJobResult {
  files: RenderedFile[];
  outputDir: string;
  failed: { itemId: string; name: string; error: string }[];
}

export interface RenderProgressPayload {
  jobId: string;
  itemId: string;
  name: string;
  /** 0→1 across the whole job, not just the current file. */
  progress: number;
  stage: 'rendering' | 'encoding' | 'done';
  index: number;
  total: number;
}

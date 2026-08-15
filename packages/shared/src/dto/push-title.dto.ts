import type { LowerThirdStyle } from './lower-third-style.dto';

export interface PushTitleRequest {
  queueItemId: string;
  name: string;
  subtitle: string;
  style: LowerThirdStyle;
  /** Video track to insert into; 1-based, matching the Resolve API. */
  trackIndex: number;
}

export interface PushTitleResult {
  ok: boolean;
  timecode: string | null;
  trackIndex: number;
}

import type { ResolveStatus } from './resolve-status';
import type { RenderJobResult, RenderProgressPayload } from '../dto/render.dto';

export interface PushProgressPayload {
  queueItemId: string;
  step: 'validating' | 'locating-timeline' | 'inserting' | 'styling';
}

export interface PushDonePayload {
  queueItemId: string;
  ok: boolean;
  timecode: string | null;
  error: string | null;
}

export interface ServerToClientEvents {
  'resolve:status': (status: ResolveStatus) => void;
  'render:progress': (payload: RenderProgressPayload) => void;
  'render:done': (payload: { jobId: string; result: RenderJobResult }) => void;
  'push:progress': (payload: PushProgressPayload) => void;
  'push:done': (payload: PushDonePayload) => void;
}

export interface ClientToServerEvents {
  'resolve:refresh': () => void;
}

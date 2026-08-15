/** Lifecycle of the link between this app and DaVinci Resolve. */
export type ResolveConnectionState =
  | 'connected' // Resolve running, project + timeline open
  | 'no-project' // Resolve running, but nothing open to push into
  | 'launching' // Handshake in progress
  | 'disconnected'; // Resolve not running or scripting API unreachable

export interface ResolveStatus {
  state: ResolveConnectionState;
  projectName: string | null;
  timelineName: string | null;
  /** Playhead as timecode, e.g. "01:00:12:04". */
  playhead: string | null;
  /** Populated when state is 'disconnected' and a reason is known. */
  detail: string | null;
}

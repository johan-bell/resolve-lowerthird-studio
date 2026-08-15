import { Injectable, Logger } from '@nestjs/common';
import type { ResolveStatus } from '@lower-thirds/shared';
import { PythonRunnerService } from './python-runner.service';

const DISCONNECTED: ResolveStatus = {
  state: 'disconnected',
  projectName: null,
  timelineName: null,
  playhead: null,
  detail: null,
};

/**
 * Owns everything the rest of the app knows about DaVinci Resolve.
 *
 * Holds the last observed status so a page load and a new socket connection can
 * both be answered instantly, without waiting on a fresh subprocess.
 */
@Injectable()
export class ResolveService {
  private readonly logger = new Logger(ResolveService.name);
  private last: ResolveStatus = DISCONNECTED;

  constructor(private readonly runner: PythonRunnerService) {}

  /** Last known status; never null, so callers always have something to render. */
  getLastStatus(): ResolveStatus {
    return this.last;
  }

  /** Ask the bridge for the current status and update the cache. */
  async fetchStatus(): Promise<ResolveStatus> {
    const result = await this.runner.run<ResolveStatus>('status');

    if (!result.ok) {
      // The bridge itself failed (python missing, timeout, malformed output).
      // That is still a legitimate "disconnected", just with a different cause.
      this.logger.warn(`Status bridge failed [${result.error.code}]: ${result.error.message}`);
      this.last = { ...DISCONNECTED, detail: result.error.message };
      return this.last;
    }

    this.last = result.data;
    return this.last;
  }
}

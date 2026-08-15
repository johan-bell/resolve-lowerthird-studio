import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ResolveStatus } from '@lower-thirds/shared';
import type { AppConfig } from '../../config/configuration';
import { ResolveService } from './resolve.service';
import { ResolveGateway } from './resolve.gateway';

/** Compare the fields the UI actually renders. */
const isSameStatus = (a: ResolveStatus, b: ResolveStatus): boolean =>
  a.state === b.state &&
  a.projectName === b.projectName &&
  a.timelineName === b.timelineName &&
  a.playhead === b.playhead &&
  a.detail === b.detail;

/**
 * Polls the Resolve bridge on a timer and broadcasts only genuine changes.
 *
 * Ticks never overlap: each one is scheduled after the previous completes, so a
 * slow or hung subprocess can't pile up work behind it.
 */
@Injectable()
export class StatusPollerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StatusPollerService.name);
  private timer: NodeJS.Timeout | null = null;
  private stopped = false;

  constructor(
    private readonly resolve: ResolveService,
    private readonly gateway: ResolveGateway,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.config.get('statusPollMs', { infer: true });
    this.logger.log(`Polling the DaVinci Resolve link every ${String(intervalMs)}ms`);
    void this.tick(intervalMs);
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  private async tick(intervalMs: number): Promise<void> {
    if (this.stopped) return;

    const previous = this.resolve.getLastStatus();
    try {
      const current = await this.resolve.fetchStatus();
      if (!isSameStatus(previous, current)) {
        this.logger.log(`Resolve link: ${previous.state} → ${current.state}`);
        this.gateway.broadcastStatus(current);
      }
    } catch (err) {
      // fetchStatus already swallows bridge failures; this is belt and braces so
      // one bad tick can never kill the polling loop.
      this.logger.error(`Unexpected polling failure: ${String(err)}`);
    }

    if (!this.stopped) {
      this.timer = setTimeout(() => void this.tick(intervalMs), intervalMs);
    }
  }
}

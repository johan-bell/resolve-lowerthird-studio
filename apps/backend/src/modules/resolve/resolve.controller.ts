import { Controller, Get } from '@nestjs/common';
import type { ApiResult, ResolveStatus } from '@lower-thirds/shared';
import { ResolveService } from './resolve.service';

@Controller('resolve')
export class ResolveController {
  constructor(private readonly resolve: ResolveService) {}

  /** Fresh read — used for the first paint before the socket connects. */
  @Get('status')
  async status(): Promise<ApiResult<ResolveStatus>> {
    return { ok: true, data: await this.resolve.fetchStatus() };
  }

  /** Cached read — cheap enough to call as often as you like. */
  @Get('status/cached')
  cached(): ApiResult<ResolveStatus> {
    return { ok: true, data: this.resolve.getLastStatus() };
  }
}

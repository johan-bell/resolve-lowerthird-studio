import { Controller, Get } from '@nestjs/common';
import type { ApiResult } from '@lower-thirds/shared';

interface HealthPayload {
  status: 'ok';
  service: string;
}

@Controller('health')
export class HealthController {
  @Get()
  check(): ApiResult<HealthPayload> {
    return { ok: true, data: { status: 'ok', service: 'lower-third-studio' } };
  }
}

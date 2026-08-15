import { Body, Controller, Get, Post } from '@nestjs/common';
import type { ApiResult, RenderJobResult } from '@lower-thirds/shared';
import { RenderService } from './render.service';
import { RenderGateway } from './render.gateway';
import { RenderRequestDto } from './dto/render.dto';

interface RenderCapability {
  available: boolean;
  outputDir: string;
  reason: string | null;
}

@Controller('render')
export class RenderController {
  constructor(
    private readonly render: RenderService,
    private readonly gateway: RenderGateway,
  ) {}

  /** Lets the UI disable the render button with a real explanation. */
  @Get('capability')
  capability(): ApiResult<RenderCapability> {
    const available = this.render.isAvailable();
    return {
      ok: true,
      data: {
        available,
        outputDir: this.render.outputDir,
        reason: available ? null : 'The bundled ffmpeg binary is missing — re-run ./scripts/setup.sh',
      },
    };
  }

  /**
   * Render synchronously but report progress over the socket as it goes.
   *
   * The request stays open until the batch finishes, so the caller gets the
   * full result; the socket is what keeps the UI honest in the meantime.
   */
  @Post()
  async start(@Body() dto: RenderRequestDto): Promise<ApiResult<RenderJobResult & { jobId: string }>> {
    const jobId = this.render.newJobId();

    const result = await this.render.render(
      {
        itemIds: dto.itemIds,
        style: dto.style,
        timing: dto.timing,
        format: dto.format,
        width: dto.width,
        height: dto.height,
      },
      dto.targets ?? [],
      (payload) => this.gateway.progress({ jobId, ...payload }),
    );

    this.gateway.done(jobId, result);
    return { ok: true, data: { ...result, jobId } };
  }
}

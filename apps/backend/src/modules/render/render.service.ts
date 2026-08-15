import { mkdirSync, statSync } from 'node:fs';
import { join, resolve as resolvePath, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  totalFrames as framesFor,
  totalSeconds,
  type RenderJobResult,
  type RenderRequest,
  type RenderTarget,
  type RenderedFile,
} from '@lower-thirds/shared';
import type { AppConfig } from '../../config/configuration';
import { FrameRendererService } from './frame-renderer.service';
import { EncoderService } from './encoder.service';
import { QueueService } from '../queue/queue.service';

export interface RenderProgressHandler {
  (payload: {
    itemId: string;
    name: string;
    index: number;
    total: number;
    progress: number;
    stage: 'rendering' | 'encoding' | 'done';
  }): void;
}

/** Filesystem-safe name derived from the person's name. */
const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .toLowerCase() || 'lower-third';

@Injectable()
export class RenderService {
  private readonly logger = new Logger(RenderService.name);

  constructor(
    private readonly frames: FrameRendererService,
    private readonly encoder: EncoderService,
    private readonly queue: QueueService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  get outputDir(): string {
    const configured = this.config.get('renderOutputDir', { infer: true });
    return isAbsolute(configured) ? configured : resolvePath(process.cwd(), configured);
  }

  /** True when rendering is actually available on this machine. */
  isAvailable(): boolean {
    return this.encoder.binaryPath !== null;
  }

  /**
   * Render one or more lower-thirds to ProRes 4444.
   *
   * Failures are per-item: one bad entry is reported and the rest of the batch
   * still completes, which matters when someone queues thirty names and walks
   * away.
   */
  async render(
    request: RenderRequest,
    inlineTargets: RenderTarget[] = [],
    onProgress?: RenderProgressHandler,
  ): Promise<RenderJobResult> {
    const targets = await this.resolveTargets(request, inlineTargets);
    const dir = this.outputDir;
    mkdirSync(dir, { recursive: true });

    const perItemFrames = framesFor(request.timing);
    const duration = totalSeconds(request.timing);
    const files: RenderedFile[] = [];
    const failed: RenderJobResult['failed'] = [];

    for (const [index, target] of targets.entries()) {
      const fileName = `${String(index + 1).padStart(2, '0')}-${slugify(target.name)}.mov`;
      const outputPath = join(dir, fileName);

      onProgress?.({
        itemId: target.id,
        name: target.name,
        index,
        total: targets.length,
        progress: index / targets.length,
        stage: 'rendering',
      });

      const spec = {
        name: target.name,
        subtitle: target.subtitle,
        style: request.style,
        timing: request.timing,
        width: request.width,
        height: request.height,
      };
      // Geometry is constant across the clip — measure once, not 78 times.
      const layout = this.frames.layoutFor(spec);

      try {
        await this.encoder.encode({
          outputPath,
          timing: request.timing,
          totalFrames: perItemFrames,
          frame: (frameIndex) => this.frames.renderFrame(spec, frameIndex, layout),
          onFrame: (frameIndex) => {
            // Report every 5 frames — enough for a smooth bar, few enough to
            // avoid flooding the socket on a long batch.
            if (frameIndex % 5 !== 0) return;
            onProgress?.({
              itemId: target.id,
              name: target.name,
              index,
              total: targets.length,
              progress: (index + frameIndex / perItemFrames) / targets.length,
              stage: 'encoding',
            });
          },
        });

        files.push({
          itemId: target.id,
          name: target.name,
          fileName,
          path: outputPath,
          bytes: statSync(outputPath).size,
          frames: perItemFrames,
          durationSeconds: duration,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Render failed for "${target.name}": ${message}`);
        failed.push({ itemId: target.id, name: target.name, error: message });
      }
    }

    onProgress?.({
      itemId: '',
      name: '',
      index: targets.length,
      total: targets.length,
      progress: 1,
      stage: 'done',
    });

    return { files, outputDir: dir, failed };
  }

  newJobId(): string {
    return randomUUID();
  }

  /** Queue ids win; inline targets are the fallback for ad-hoc renders. */
  private async resolveTargets(
    request: RenderRequest,
    inline: RenderTarget[],
  ): Promise<{ id: string; name: string; subtitle: string }[]> {
    if (request.itemIds.length === 0) {
      return inline.map((target, index) => ({
        id: `inline-${String(index)}`,
        name: target.name,
        subtitle: target.subtitle,
      }));
    }

    const lists = await this.queue.findAllLists();
    const byId = new Map(
      lists.flatMap((list) => list.items.map((item) => [item.id, item] as const)),
    );

    return request.itemIds
      .map((id) => byId.get(id))
      .filter((item): item is NonNullable<typeof item> => item !== undefined)
      .map((item) => ({ id: item.id, name: item.name, subtitle: item.title }));
  }
}

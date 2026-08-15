import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { Injectable, Logger } from '@nestjs/common';
import ffmpegPath from 'ffmpeg-static';
import type { AnimationTiming } from '@lower-thirds/shared';

export interface EncodeOptions {
  outputPath: string;
  timing: AnimationTiming;
  /** Called once per frame; must return the PNG bytes for that frame. */
  frame: (index: number) => Buffer;
  totalFrames: number;
  /** Invoked as frames are fed in, for progress reporting. */
  onFrame?: (index: number) => void;
}

/**
 * Encodes a PNG frame stream into ProRes 4444 with a real alpha channel.
 *
 * ProRes 4444 is the format broadcast tooling expects for graphics with
 * transparency: one file per title, and Resolve, Premiere and Final Cut all
 * import it with the alpha intact.
 */
@Injectable()
export class EncoderService {
  private readonly logger = new Logger(EncoderService.name);

  /** Absolute path to the bundled ffmpeg, or null if it is unavailable. */
  get binaryPath(): string | null {
    return typeof ffmpegPath === 'string' ? ffmpegPath : null;
  }

  async encode(options: EncodeOptions): Promise<void> {
    const binary = this.binaryPath;
    if (binary === null) {
      throw new Error(
        'The bundled ffmpeg binary is missing. Re-run ./scripts/setup.sh to download it.',
      );
    }

    const args = [
      '-y',
      '-f',
      'image2pipe',
      '-vcodec',
      'png',
      '-framerate',
      String(options.timing.fps),
      '-i',
      'pipe:0',
      '-c:v',
      'prores_ks',
      '-profile:v',
      '4444',
      // yuva* is the part that matters: without it the alpha is silently dropped.
      '-pix_fmt',
      'yuva444p10le',
      '-alpha_bits',
      '16',
      '-vendor',
      'ap4h',
      options.outputPath,
    ];

    const child = spawn(binary, args, { stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
      // ffmpeg is chatty; keep only the tail for diagnostics.
      if (stderr.length > 8000) stderr = stderr.slice(-4000);
    });

    const failure = new Promise<never>((_, reject) => {
      child.on('error', (err: Error) =>
        reject(new Error(`Could not start ffmpeg: ${err.message}`)),
      );
    });

    const writeFrames = (async () => {
      for (let index = 0; index < options.totalFrames; index += 1) {
        const png = options.frame(index);
        if (!child.stdin.write(png)) {
          // Respect backpressure so a long render can't balloon memory.
          await once(child.stdin, 'drain');
        }
        options.onFrame?.(index);
      }
      child.stdin.end();
    })();

    const exitCode = await Promise.race([
      failure,
      (async () => {
        await writeFrames;
        const [code] = (await once(child, 'close')) as [number | null];
        return code;
      })(),
    ]);

    if (exitCode !== 0) {
      this.logger.error(`ffmpeg exited ${String(exitCode)}: ${stderr.slice(-1000)}`);
      throw new Error(`ffmpeg failed (exit ${String(exitCode)}). ${stderr.slice(-300)}`);
    }
  }
}

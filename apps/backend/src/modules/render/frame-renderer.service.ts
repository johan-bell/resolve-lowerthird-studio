import { Injectable } from '@nestjs/common';
import { createCanvas } from '@napi-rs/canvas';
import {
  buildPlan,
  drawPlan,
  frameStateAt,
  placeBlock,
  type AnimationTiming,
  type Ctx2D,
  type LowerThirdPlan,
  type LowerThirdStyle,
  type MeasureFn,
} from '@lower-thirds/shared';

export interface FrameSpec {
  name: string;
  subtitle: string;
  style: LowerThirdStyle;
  timing: AnimationTiming;
  width: number;
  height: number;
}

@Injectable()
export class FrameRendererService {
  /**
   * Build the drawing plan once per clip.
   *
   * Measurement goes through Skia here and through the browser's text engine in
   * the preview; both feed the same shared plan builder, so the geometry agrees.
   */
  planFor(spec: FrameSpec): LowerThirdPlan {
    const canvas = createCanvas(8, 8);
    const ctx = canvas.getContext('2d');
    const measure: MeasureFn = (text, size, weight) => {
      ctx.font = `${String(weight)} ${String(size)}px "${spec.style.fontFamily}", sans-serif`;
      const m = ctx.measureText(text);
      const ink =
        m.actualBoundingBoxRight === undefined
          ? m.width
          : (m.actualBoundingBoxLeft ?? 0) + m.actualBoundingBoxRight;
      return Math.max(m.width, ink);
    };
    return buildPlan(spec.name, spec.subtitle, spec.style, measure);
  }

  /** Draw one frame as a transparent PNG. */
  renderFrame(spec: FrameSpec, frameIndex: number, plan?: LowerThirdPlan): Buffer {
    const { width, height, timing, style } = spec;
    const drawing = plan ?? this.planFor(spec);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const state = frameStateAt(frameIndex / timing.fps, timing);

    // An untouched canvas is fully transparent — that is the alpha channel.
    if (state.barProgress <= 0) return canvas.toBuffer('image/png');

    const { originX, originY } = placeBlock(drawing, width, height, style);
    drawPlan(ctx as unknown as Ctx2D, drawing, state, {
      originX,
      originY,
      scale: 1,
      fontFamily: style.fontFamily,
    });

    return canvas.toBuffer('image/png');
  }
}

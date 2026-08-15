import { Injectable } from '@nestjs/common';
import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import {
  frameStateAt,
  layoutLowerThird,
  LINE_HEIGHT_RATIO,
  STACK_GAP,
  type AnimationTiming,
  type LowerThirdLayout,
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

/** Left inset and height above frame bottom, as fractions of frame size. */
const SAFE_LEFT = 0.1;
const BOTTOM_INSET = 0.18;

const fontString = (style: LowerThirdStyle, size: number, weight: number): string =>
  `${String(weight)} ${String(size)}px "${style.fontFamily}", sans-serif`;

@Injectable()
export class FrameRendererService {
  /**
   * Lay out once per clip rather than per frame — the geometry is identical
   * across frames, only the animation state changes.
   */
  layoutFor(spec: FrameSpec): LowerThirdLayout {
    const canvas = createCanvas(8, 8);
    const ctx = canvas.getContext('2d');
    const measure: MeasureFn = (text, size, weight) => {
      ctx.font = fontString(spec.style, size, weight);
      return ctx.measureText(text).width;
    };
    return layoutLowerThird(spec.name, spec.subtitle, spec.style, measure);
  }

  /**
   * Draw one frame as a transparent PNG.
   *
   * Motion comes from the shared frameStateAt and geometry from the shared
   * layoutLowerThird, so a rendered file and the browser preview agree by
   * construction rather than by parallel maintenance.
   */
  renderFrame(spec: FrameSpec, frameIndex: number, layout?: LowerThirdLayout): Buffer {
    const { width, height, style, timing } = spec;
    const box = layout ?? this.layoutFor(spec);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const state = frameStateAt(frameIndex / timing.fps, timing);

    const boxLeft = Math.round(width * SAFE_LEFT);
    const boxTop = Math.round(height - height * BOTTOM_INSET - box.height);

    // Nothing drawn yet: an untouched canvas is fully transparent.
    if (state.barProgress <= 0) return canvas.toBuffer('image/png');

    const revealed = Math.round(box.width * state.barProgress);

    ctx.save();
    ctx.beginPath();
    ctx.rect(boxLeft, boxTop, revealed, box.height);
    ctx.clip();

    ctx.fillStyle = style.backgroundHex;
    ctx.fillRect(boxLeft, boxTop, box.width, box.height);

    if (state.textOpacity > 0) {
      // Text shares the bar's clip so no glyph ever precedes the wipe edge.
      this.drawText(ctx, spec, box, boxLeft, boxTop, state.textOffsetY, state.textOpacity);
    }

    ctx.restore();
    return canvas.toBuffer('image/png');
  }

  private drawText(
    ctx: SKRSContext2D,
    spec: FrameSpec,
    box: LowerThirdLayout,
    boxLeft: number,
    boxTop: number,
    offsetY: number,
    opacity: number,
  ): void {
    const { style } = spec;
    const textLeft = boxLeft + style.padding.x;

    ctx.textBaseline = 'top';
    ctx.fillStyle = style.foregroundHex;

    let cursorY = boxTop + style.padding.y + offsetY;

    ctx.globalAlpha = opacity;
    ctx.font = fontString(style, style.fontSize, 600);
    for (const line of box.nameLines) {
      ctx.fillText(line, textLeft, cursorY);
      cursorY += style.fontSize * LINE_HEIGHT_RATIO;
    }

    if (box.subtitleLines.length === 0) return;

    cursorY += STACK_GAP;
    ctx.globalAlpha = opacity * 0.72;
    ctx.font = fontString(style, style.subtitleFontSize, 400);
    for (const line of box.subtitleLines) {
      ctx.fillText(line, textLeft, cursorY);
      cursorY += style.subtitleFontSize * LINE_HEIGHT_RATIO;
    }
  }
}

import type { LowerThirdStyle } from '../dto/lower-third-style.dto';
import type { FrameState } from './animation';
import { LINE_HEIGHT_RATIO, STACK_GAP, approximateMeasure, type MeasureFn } from './auto-scale';

/** The named looks a lower-third can take. */
export type LayoutVariant =
  | 'solid-bar'
  | 'accent-stripe'
  | 'two-tone'
  | 'minimal'
  | 'underline'
  | 'offset-block';

export const LAYOUT_VARIANTS: { id: LayoutVariant; label: string; note: string }[] = [
  { id: 'solid-bar', label: 'Solid bar', note: 'One filled box, name over role' },
  { id: 'accent-stripe', label: 'Accent stripe', note: 'Colour rule leads a translucent panel' },
  { id: 'two-tone', label: 'Two-tone', note: 'Role gets its own accent band' },
  { id: 'minimal', label: 'Minimal', note: 'No panel — shadow carries legibility' },
  { id: 'underline', label: 'Underline', note: 'Soft slab, accent rule under the name' },
  { id: 'offset-block', label: 'Offset block', note: 'Solid plate with an outlined role card' },
];

/**
 * Selectable weights, coarse enough to be a real choice rather than a slider.
 *
 * Stops at 700 deliberately: above that most families have no real face, and
 * the text engine fakes one at paint time in a way measurement cannot see — the
 * box then comes out too narrow for the glyphs actually drawn.
 */
export const FONT_WEIGHTS: { value: number; label: string }[] = [
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semibold' },
  { value: 700, label: 'Bold' },
];

/**
 * Drawing primitives, in project pixels, relative to the block's top-left.
 *
 * `layer` separates the panel (revealed by the wipe) from the text (which also
 * fades and rises), so the animation can treat them differently without each
 * layout having to know about the animation at all.
 */
export type DrawOp =
  | {
      kind: 'rect';
      layer: 'panel';
      x: number;
      y: number;
      w: number;
      h: number;
      fill: string;
      alpha?: number;
      radius?: number;
      stroke?: string;
      strokeAlpha?: number;
    }
  | {
      kind: 'text';
      layer: 'text';
      /**
       * The column the line is centred within. Centring happens at draw time,
       * where real glyph metrics are available — advance width and the em box
       * both misplace text by a few pixels because of side bearings and
       * descenders.
       */
      columnLeft: number;
      columnWidth: number;
      /** Top of the line's box; the cap band is centred inside `lineHeight`. */
      y: number;
      lineHeight: number;
      text: string;
      fontSize: number;
      weight: number;
      fill: string;
      alpha?: number;
      /** Soft drop shadow, for panel-less layouts. */
      shadow?: boolean;
    };

export interface LowerThirdPlan {
  /** Bounding width — the wipe reveals this much. */
  width: number;
  /** Bounding height. */
  height: number;
  ops: DrawOp[];
  wrapped: boolean;
}

/** Greedy word wrap against a real measurer. */
function wrap(text: string, maxWidth: number, measure: (t: string) => number): string[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];
  if (maxWidth <= 0) return [trimmed];

  const lines: string[] = [];
  let current = '';
  for (const word of trimmed.split(/\s+/)) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (current.length === 0 || measure(candidate) <= maxWidth) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

/** Subtitles sit a step lighter than the name, but never heavier. */
const subtitleWeight = (style: LowerThirdStyle): number => Math.min(400, style.fontWeight);

/**
 * Build the drawing plan for a lower-third.
 *
 * This is the single definition of every layout. The browser preview and the
 * offline renderer both consume the plan, so a look can never drift between
 * what you see and what you export.
 *
 * Text is centred both ways: each line is centred horizontally in its column,
 * and drawn on a middle baseline inside its own line box, so the block sits
 * optically centred in the panel rather than riding high.
 */
export function buildPlan(
  name: string,
  subtitle: string,
  style: LowerThirdStyle,
  measure: MeasureFn = approximateMeasure,
): LowerThirdPlan {
  const { padding, fontSize, subtitleFontSize } = style;
  const accent = style.accentHex || '#E8483F';
  const radius = Math.max(0, style.cornerRadius);
  const nameWeight = style.fontWeight;
  const subWeight = subtitleWeight(style);

  const mName = (t: string): number => measure(t, fontSize, nameWeight);
  const mSub = (t: string): number => measure(t, subtitleFontSize, subWeight);
  const mSubCaps = (t: string): number => measure(t.toUpperCase(), subtitleFontSize, subWeight);

  const maxContent = Math.max(0, padding.maxWidth - padding.x * 2);
  const nameLines = wrap(name, maxContent, mName);
  const subLines = wrap(subtitle, maxContent, mSub);
  const wrapped = nameLines.length > 1 || subLines.length > 1;

  const nameBlockH = nameLines.length * fontSize * LINE_HEIGHT_RATIO;
  const subBlockH = subLines.length * subtitleFontSize * LINE_HEIGHT_RATIO;
  const widestName = Math.max(0, ...nameLines.map(mName));
  const widestSub = Math.max(0, ...subLines.map(mSub));

  const clampWidth = (raw: number): number =>
    Math.round(Math.min(padding.maxWidth, Math.max(padding.minWidth, raw)));

  const ops: DrawOp[] = [];

  /** Push lines centred within [columnLeft, columnLeft + columnWidth]. */
  const pushLines = (
    lines: string[],
    columnLeft: number,
    columnWidth: number,
    startY: number,
    size: number,
    weight: number,
    alpha: number,
    options: { uppercase?: boolean; shadow?: boolean } = {},
  ): number => {
    const lineHeight = size * LINE_HEIGHT_RATIO;
    let y = startY;
    for (const line of lines) {
      const text = options.uppercase === true ? line.toUpperCase() : line;
      ops.push({
        kind: 'text',
        layer: 'text',
        columnLeft,
        columnWidth,
        y,
        lineHeight,
        text,
        fontSize: size,
        weight,
        fill: style.foregroundHex,
        alpha,
        shadow: options.shadow,
      });
      y += lineHeight;
    }
    return y;
  };

  switch (style.layout) {
    case 'accent-stripe': {
      const stripe = Math.max(4, Math.round(fontSize * 0.12));
      const width = clampWidth(Math.max(widestName, widestSub) + padding.x * 2 + stripe);
      const height = Math.round(
        nameBlockH + (subLines.length ? subBlockH + STACK_GAP : 0) + padding.y * 2,
      );
      ops.push({
        kind: 'rect',
        layer: 'panel',
        x: 0,
        y: 0,
        w: width,
        h: height,
        fill: style.backgroundHex,
        alpha: 0.82,
        radius,
      });
      ops.push({
        kind: 'rect',
        layer: 'panel',
        x: 0,
        y: 0,
        w: stripe,
        h: height,
        fill: accent,
        radius: radius > 0 ? Math.min(radius, stripe) : 0,
      });
      const colLeft = stripe + padding.x;
      const colWidth = width - stripe - padding.x * 2;
      const afterName = pushLines(nameLines, colLeft, colWidth, padding.y, fontSize, nameWeight, 1);
      if (subLines.length) {
        pushLines(
          subLines,
          colLeft,
          colWidth,
          afterName + STACK_GAP,
          subtitleFontSize,
          subWeight,
          0.72,
        );
      }
      return { width, height, ops, wrapped };
    }

    case 'two-tone': {
      const nameH = Math.round(nameBlockH + padding.y * 2);
      const bandH = subLines.length
        ? Math.round(subBlockH + padding.y * 1.2)
        : 0;
      const nameW = clampWidth(widestName + padding.x * 2);
      const bandW = subLines.length
        ? clampWidth(Math.max(0, ...subLines.map(mSubCaps)) + padding.x * 2)
        : 0;
      const width = Math.max(nameW, bandW);
      const height = nameH + bandH;

      ops.push({
        kind: 'rect',
        layer: 'panel',
        x: 0,
        y: 0,
        w: nameW,
        h: nameH,
        fill: style.backgroundHex,
        radius,
      });
      if (bandH > 0) {
        ops.push({
          kind: 'rect',
          layer: 'panel',
          x: 0,
          y: nameH,
          w: bandW,
          h: bandH,
          fill: accent,
          radius,
        });
      }
      pushLines(nameLines, padding.x, nameW - padding.x * 2, padding.y, fontSize, nameWeight, 1);
      if (subLines.length) {
        pushLines(
          subLines,
          padding.x,
          bandW - padding.x * 2,
          nameH + (bandH - subBlockH) / 2,
          subtitleFontSize,
          subWeight,
          1,
          { uppercase: true },
        );
      }
      return { width, height, ops, wrapped };
    }

    case 'minimal': {
      const width = clampWidth(Math.max(widestName, widestSub));
      const height = Math.round(nameBlockH + (subLines.length ? subBlockH + STACK_GAP : 0));
      const afterName = pushLines(nameLines, 0, width, 0, fontSize, nameWeight, 1, {
        shadow: true,
      });
      if (subLines.length) {
        pushLines(subLines, 0, width, afterName + STACK_GAP, subtitleFontSize, subWeight, 0.85, {
          shadow: true,
        });
      }
      return { width, height, ops, wrapped };
    }

    case 'underline': {
      const rule = Math.max(2, Math.round(fontSize * 0.06));
      const gap = Math.round(fontSize * 0.18);
      const width = clampWidth(Math.max(widestName, widestSub) + padding.x * 2);
      const height = Math.round(
        nameBlockH + rule + gap * 2 + (subLines.length ? subBlockH : 0) + padding.y * 2,
      );
      ops.push({
        kind: 'rect',
        layer: 'panel',
        x: 0,
        y: 0,
        w: width,
        h: height,
        fill: '#000000',
        alpha: 0.55,
        radius: radius > 0 ? radius : 4,
      });
      const colWidth = width - padding.x * 2;
      const afterName = pushLines(
        nameLines,
        padding.x,
        colWidth,
        padding.y,
        fontSize,
        nameWeight,
        1,
      );
      const ruleWidth = Math.round(widestName * 0.45);
      ops.push({
        kind: 'rect',
        layer: 'panel',
        x: padding.x + (colWidth - ruleWidth) / 2,
        y: Math.round(afterName + gap * 0.5),
        w: ruleWidth,
        h: rule,
        fill: accent,
        radius: Math.min(radius, rule / 2),
      });
      if (subLines.length) {
        pushLines(
          subLines,
          padding.x,
          colWidth,
          afterName + gap * 0.5 + rule + gap,
          subtitleFontSize,
          subWeight,
          0.8,
        );
      }
      return { width, height, ops, wrapped };
    }

    case 'offset-block': {
      const indent = Math.round(padding.x * 0.9);
      const nameH = Math.round(nameBlockH + padding.y * 1.6);
      const cardH = subLines.length ? Math.round(subBlockH + padding.y) : 0;
      const nameW = clampWidth(widestName + padding.x * 2);
      const cardW = subLines.length ? clampWidth(widestSub + padding.x * 2) : 0;
      const width = Math.max(nameW, indent + cardW);
      const height = nameH + (cardH > 0 ? cardH + 6 : 0);

      ops.push({
        kind: 'rect',
        layer: 'panel',
        x: 0,
        y: 0,
        w: nameW,
        h: nameH,
        fill: style.backgroundHex,
        radius,
      });
      if (cardH > 0) {
        ops.push({
          kind: 'rect',
          layer: 'panel',
          x: indent,
          y: nameH + 6,
          w: cardW,
          h: cardH,
          fill: style.backgroundHex,
          alpha: 0.6,
          stroke: style.foregroundHex,
          strokeAlpha: 0.35,
          radius,
        });
      }
      pushLines(
        nameLines,
        padding.x,
        nameW - padding.x * 2,
        (nameH - nameBlockH) / 2,
        fontSize,
        nameWeight,
        1,
      );
      if (subLines.length) {
        pushLines(
          subLines,
          indent + padding.x,
          cardW - padding.x * 2,
          nameH + 6 + (cardH - subBlockH) / 2,
          subtitleFontSize,
          subWeight,
          0.85,
        );
      }
      return { width, height, ops, wrapped };
    }

    case 'solid-bar':
    default: {
      const width = clampWidth(Math.max(widestName, widestSub) + padding.x * 2);
      const height = Math.round(
        nameBlockH + (subLines.length ? subBlockH + STACK_GAP : 0) + padding.y * 2,
      );
      ops.push({
        kind: 'rect',
        layer: 'panel',
        x: 0,
        y: 0,
        w: width,
        h: height,
        fill: style.backgroundHex,
        radius,
      });
      const colWidth = width - padding.x * 2;
      const afterName = pushLines(
        nameLines,
        padding.x,
        colWidth,
        padding.y,
        fontSize,
        nameWeight,
        1,
      );
      if (subLines.length) {
        pushLines(
          subLines,
          padding.x,
          colWidth,
          afterName + STACK_GAP,
          subtitleFontSize,
          subWeight,
          0.72,
        );
      }
      return { width, height, ops, wrapped };
    }
  }
}

/**
 * The slice of the Canvas 2D API a plan needs.
 *
 * Declared structurally so the same draw routine runs against the browser's
 * CanvasRenderingContext2D and Skia's context in Node.
 */
export interface Ctx2D {
  save(): void;
  restore(): void;
  beginPath(): void;
  rect(x: number, y: number, w: number, h: number): void;
  moveTo(x: number, y: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void;
  closePath(): void;
  clip(): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): {
    width: number;
    actualBoundingBoxLeft?: number;
    actualBoundingBoxRight?: number;
    actualBoundingBoxAscent?: number;
  };
  fillStyle: string;
  strokeStyle: string;
  font: string;
  globalAlpha: number;
  textBaseline: string;
  lineWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetY: number;
}

const roundRectPath = (
  ctx: Ctx2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

export interface DrawOptions {
  /** Where the block's top-left sits, in destination pixels. */
  originX: number;
  originY: number;
  /** Destination pixels per project pixel. */
  scale: number;
  fontFamily: string;
}

/**
 * Draw a plan at a given animation state.
 *
 * Used unchanged by the preview and the renderer — the wipe is a clip on the
 * panel, and the text additionally fades and rises within it.
 */
export function drawPlan(
  ctx: Ctx2D,
  plan: LowerThirdPlan,
  state: FrameState,
  options: DrawOptions,
): void {
  if (state.barProgress <= 0) return;

  const { originX, originY, scale, fontFamily } = options;
  const px = (v: number): number => v * scale;

  ctx.save();
  ctx.beginPath();
  ctx.rect(originX, originY, px(plan.width) * state.barProgress, px(plan.height));
  ctx.clip();

  for (const op of plan.ops) {
    if (op.kind === 'rect') {
      ctx.globalAlpha = op.alpha ?? 1;
      ctx.fillStyle = op.fill;
      if (op.radius && op.radius > 0) {
        roundRectPath(
          ctx,
          originX + px(op.x),
          originY + px(op.y),
          px(op.w),
          px(op.h),
          px(op.radius),
        );
        ctx.fill();
        if (op.stroke) {
          ctx.globalAlpha = op.strokeAlpha ?? 1;
          ctx.strokeStyle = op.stroke;
          ctx.lineWidth = Math.max(1, scale * 1.5);
          ctx.stroke();
        }
      } else {
        ctx.fillRect(originX + px(op.x), originY + px(op.y), px(op.w), px(op.h));
        if (op.stroke) {
          ctx.globalAlpha = op.strokeAlpha ?? 1;
          ctx.strokeStyle = op.stroke;
          ctx.lineWidth = Math.max(1, scale * 1.5);
          ctx.strokeRect(originX + px(op.x), originY + px(op.y), px(op.w), px(op.h));
        }
      }
      ctx.globalAlpha = 1;
      continue;
    }

    if (state.textOpacity <= 0) continue;

    ctx.save();
    if (op.shadow === true) {
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = px(18);
      ctx.shadowOffsetY = px(2);
    }
    ctx.globalAlpha = (op.alpha ?? 1) * state.textOpacity;
    ctx.fillStyle = op.fill;
    ctx.textBaseline = 'alphabetic';
    ctx.font = `${String(op.weight)} ${String(px(op.fontSize))}px "${fontFamily}", sans-serif`;

    // Horizontal: centre the glyphs' actual ink, not the advance width — the
    // difference is the left and right side bearings, a few pixels either way.
    const metrics = ctx.measureText(op.text);
    const bearingLeft = metrics.actualBoundingBoxLeft ?? 0;
    const inkWidth =
      metrics.actualBoundingBoxRight === undefined
        ? metrics.width
        : bearingLeft + metrics.actualBoundingBoxRight;
    const anchorX =
      originX + px(op.columnLeft) + (px(op.columnWidth) - inkWidth) / 2 + bearingLeft;

    // Vertical: centre the cap band. Centring the em box or the ink instead
    // makes a name with a descender (a 'j', a 'y') sit visibly low.
    const capHeight = ctx.measureText('H').actualBoundingBoxAscent ?? px(op.fontSize) * 0.72;
    const lineCentreY =
      originY + px(op.y) + px(op.lineHeight) / 2 + px(state.textOffsetY);

    ctx.fillText(op.text, anchorX, lineCentreY + capHeight / 2);
    ctx.restore();
  }

  ctx.restore();
}

/** Where the block is pinned within the frame. */
export type Anchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export const ANCHORS: Anchor[] = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

/**
 * Place a block in the frame.
 *
 * The anchor decides which part of the block is pinned and which frame edge it
 * measures from, so a right-anchored title stays put as its text grows instead
 * of sliding off frame. Offsets are fractions of the frame, so a placement
 * survives a change of resolution.
 */
/**
 * Split an anchor into its vertical and horizontal parts.
 *
 * 'center' is the one name that isn't hyphenated, so it needs expanding before
 * the split — otherwise the horizontal half comes back undefined and the block
 * silently lands top-left.
 */
const anchorParts = (anchor: Anchor): { vertical: string; horizontal: string } => {
  const normalised = anchor === 'center' ? 'middle-center' : anchor;
  const [vertical = 'bottom', horizontal = 'left'] = normalised.split('-');
  return { vertical, horizontal };
};

export function placeBlock(
  plan: { width: number; height: number },
  frameWidth: number,
  frameHeight: number,
  style: Pick<LowerThirdStyle, 'anchor' | 'offsetX' | 'offsetY'>,
): { originX: number; originY: number } {
  const { anchor, offsetX, offsetY } = style;
  const { vertical, horizontal } = anchorParts(anchor);

  let originX: number;
  if (horizontal === 'right') originX = frameWidth - plan.width - offsetX * frameWidth;
  else if (horizontal === 'center') originX = (frameWidth - plan.width) / 2 + offsetX * frameWidth;
  else originX = offsetX * frameWidth;

  let originY: number;
  if (vertical === 'bottom') originY = frameHeight - plan.height - offsetY * frameHeight;
  else if (vertical === 'middle') originY = (frameHeight - plan.height) / 2 + offsetY * frameHeight;
  else originY = offsetY * frameHeight;

  return { originX: Math.round(originX), originY: Math.round(originY) };
}

/** Convert a drag in frame fractions into an offset change for the anchor. */
export function offsetDelta(
  anchor: Anchor,
  deltaXFraction: number,
  deltaYFraction: number,
): { offsetX: number; offsetY: number } {
  const { vertical, horizontal } = anchorParts(anchor);
  return {
    // Right/bottom anchors measure inward, so dragging that way reduces the offset.
    offsetX: horizontal === 'right' ? -deltaXFraction : deltaXFraction,
    offsetY: vertical === 'bottom' ? -deltaYFraction : deltaYFraction,
  };
}

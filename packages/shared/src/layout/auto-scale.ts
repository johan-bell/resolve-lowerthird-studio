import type { LowerThirdStyle } from '../dto/lower-third-style.dto';

/**
 * Measures a run of text at a given size and weight.
 *
 * Injected rather than assumed: the browser preview and the offline renderer
 * each supply a measurer backed by their own text engine, so both lay out with
 * metrics that are true for the surface actually drawing the glyphs.
 */
export type MeasureFn = (text: string, fontSize: number, weight: number) => number;

/** Line height as a multiple of font size. */
export const LINE_HEIGHT_RATIO = 1.25;
/** Vertical gap between the name block and the subtitle block. */
export const STACK_GAP = 6;
/** Average glyph width as a fraction of font size, for the fallback measurer. */
export const AVG_GLYPH_RATIO = 0.52;

/**
 * Crude fallback used only where no text engine is available (tests, SSR).
 * Real surfaces should pass their own measurer — see MeasureFn.
 */
export const approximateMeasure: MeasureFn = (text, fontSize) =>
  text.length * fontSize * AVG_GLYPH_RATIO;

export interface LowerThirdLayout {
  /** Background width in project pixels, after clamping. */
  width: number;
  /** Background height in project pixels — always tall enough for the text. */
  height: number;
  /** The name, already broken into the lines that will be drawn. */
  nameLines: string[];
  /** The subtitle, already broken into lines; empty when there is no subtitle. */
  subtitleLines: string[];
  /** True when anything had to wrap. */
  wrapped: boolean;
}

/** Greedy word wrap. A single word longer than the limit is allowed to overflow. */
function wrapText(text: string, maxWidth: number, measure: (t: string) => number): string[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];
  if (maxWidth <= 0) return [trimmed];

  const lines: string[] = [];
  let current = '';

  for (const word of trimmed.split(/\s+/)) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (current.length === 0 || measure(candidate) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

/**
 * Lay out a lower-third: how wide the background box is, how tall, and exactly
 * which lines of text go inside it.
 *
 * Height is derived from the wrapped line counts rather than assumed, so the
 * box can never be too short for its own contents — the failure mode that
 * silently swallows a subtitle.
 */
export function layoutLowerThird(
  name: string,
  subtitle: string,
  style: LowerThirdStyle,
  measure: MeasureFn = approximateMeasure,
): LowerThirdLayout {
  const { padding } = style;
  const maxContentWidth = Math.max(0, padding.maxWidth - padding.x * 2);

  const measureName = (text: string): number => measure(text, style.fontSize, 600);
  const measureSubtitle = (text: string): number => measure(text, style.subtitleFontSize, 400);

  const nameLines = wrapText(name, maxContentWidth, measureName);
  const subtitleLines = wrapText(subtitle, maxContentWidth, measureSubtitle);

  const widest = Math.max(
    0,
    ...nameLines.map(measureName),
    ...subtitleLines.map(measureSubtitle),
  );

  const width = Math.round(
    Math.min(padding.maxWidth, Math.max(padding.minWidth, widest + padding.x * 2)),
  );

  const nameHeight = nameLines.length * style.fontSize * LINE_HEIGHT_RATIO;
  const subtitleHeight =
    subtitleLines.length > 0
      ? subtitleLines.length * style.subtitleFontSize * LINE_HEIGHT_RATIO + STACK_GAP
      : 0;
  const height = Math.round(nameHeight + subtitleHeight + padding.y * 2);

  return {
    width,
    height,
    nameLines,
    subtitleLines,
    wrapped: nameLines.length > 1 || subtitleLines.length > 1,
  };
}

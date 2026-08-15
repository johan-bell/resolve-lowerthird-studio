import { computed, type ComputedRef, type Ref } from 'vue';
import {
  layoutLowerThird,
  type LowerThirdLayout,
  type LowerThirdStyle,
  type MeasureFn,
} from '@lower-thirds/shared';

/**
 * One offscreen canvas for the whole app.
 *
 * Measuring through the browser's own text engine — rather than estimating —
 * is what lets the preview agree with the offline renderer, which measures the
 * same way through Skia.
 */
let measureCanvas: HTMLCanvasElement | null = null;

function measurerFor(style: LowerThirdStyle): MeasureFn {
  measureCanvas ??= document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');

  return (text, fontSize, weight) => {
    if (!ctx) return text.length * fontSize * 0.52;
    ctx.font = `${String(weight)} ${String(fontSize)}px "${style.fontFamily}", sans-serif`;
    return ctx.measureText(text).width;
  };
}

export interface AutoScaleInput {
  name: Ref<string>;
  subtitle: Ref<string>;
  style: Ref<LowerThirdStyle>;
}

/**
 * Reactive lower-third geometry: box size plus the exact lines to draw.
 *
 * Delegates to the shared layoutLowerThird, so this composable is only about
 * reactivity — the layout rules live in one place used by both surfaces.
 */
export function useAutoScale({
  name,
  subtitle,
  style,
}: AutoScaleInput): ComputedRef<LowerThirdLayout> {
  return computed(() =>
    layoutLowerThird(name.value, subtitle.value, style.value, measurerFor(style.value)),
  );
}

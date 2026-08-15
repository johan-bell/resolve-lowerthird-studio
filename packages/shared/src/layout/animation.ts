/** How long each phase of the wipe lasts. */
export interface AnimationTiming {
  fps: number;
  /** Seconds for the bar to wipe on and the text to settle. */
  inSeconds: number;
  /** Seconds fully on screen. */
  holdSeconds: number;
  /** Seconds for the bar to wipe off. */
  outSeconds: number;
}

export const DEFAULT_TIMING: AnimationTiming = {
  fps: 25,
  inSeconds: 0.6,
  holdSeconds: 3,
  outSeconds: 0.5,
};

/** Everything a renderer needs to draw one moment of the animation. */
export interface FrameState {
  /** 0→1 horizontal reveal of the background bar. */
  barProgress: number;
  /** 0→1 opacity of the text. */
  textOpacity: number;
  /** Vertical offset of the text in project pixels; eases to 0. */
  textOffsetY: number;
}

/** Standard ease-out cubic — fast start, gentle settle. */
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
/** Ease-in cubic, used on the way out so the exit accelerates. */
export const easeInCubic = (t: number): number => t * t * t;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const totalSeconds = (timing: AnimationTiming): number =>
  timing.inSeconds + timing.holdSeconds + timing.outSeconds;

export const totalFrames = (timing: AnimationTiming): number =>
  Math.max(1, Math.round(totalSeconds(timing) * timing.fps));

/**
 * Animation state at a given time.
 *
 * The text trails the bar deliberately: the bar leads, and the text fades and
 * rises into the space it opens. That lag is what makes the classic broadcast
 * wipe read as one movement rather than two things happening at once.
 */
export function frameStateAt(timeSeconds: number, timing: AnimationTiming): FrameState {
  const { inSeconds, holdSeconds, outSeconds } = timing;

  // Wipe on
  if (timeSeconds < inSeconds) {
    const t = clamp01(inSeconds === 0 ? 1 : timeSeconds / inSeconds);
    const bar = easeOutCubic(t);
    // Text starts once the bar is ~35% across, then catches up.
    const textT = clamp01((t - 0.35) / 0.65);
    return {
      barProgress: bar,
      textOpacity: easeOutCubic(textT),
      textOffsetY: (1 - easeOutCubic(textT)) * 12,
    };
  }

  // Hold
  if (timeSeconds < inSeconds + holdSeconds) {
    return { barProgress: 1, textOpacity: 1, textOffsetY: 0 };
  }

  // Wipe off — text clears first so the bar isn't left with orphaned glyphs.
  const t = clamp01(
    outSeconds === 0 ? 1 : (timeSeconds - inSeconds - holdSeconds) / outSeconds,
  );
  const textT = clamp01(t / 0.5);
  return {
    barProgress: 1 - easeInCubic(t),
    textOpacity: 1 - textT,
    textOffsetY: 0,
  };
}

import { onBeforeUnmount, ref, watch, type Ref } from 'vue';
import {
  frameStateAt,
  totalSeconds,
  type AnimationTiming,
  type FrameState,
} from '@lower-thirds/shared';

export interface PlaybackControls {
  /** Animation state at the current playhead. */
  state: Ref<FrameState>;
  /** Seconds elapsed within the clip. */
  time: Ref<number>;
  playing: Ref<boolean>;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** Jump to a specific time, in seconds. */
  seek: (seconds: number) => void;
  restart: () => void;
}

const HELD: FrameState = { barProgress: 1, textOpacity: 1, textOffsetY: 0 };

/**
 * Drives the preview through the animation using the same timing function the
 * renderer uses, so what plays here is what gets encoded.
 *
 * Loops with a short pause at the end, which makes it easy to judge the motion
 * without repeatedly hitting play.
 */
export function useAnimationPlayback(timing: Ref<AnimationTiming>): PlaybackControls {
  const time = ref(0);
  const playing = ref(false);
  const state = ref<FrameState>(HELD);

  let frameHandle: number | null = null;
  let lastTimestamp = 0;

  const apply = (): void => {
    state.value = playing.value ? frameStateAt(time.value, timing.value) : HELD;
  };

  const tick = (timestamp: number): void => {
    if (!playing.value) return;

    const delta = lastTimestamp === 0 ? 0 : (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    time.value += delta;

    const duration = totalSeconds(timing.value);
    if (time.value >= duration + 0.4) time.value = 0;

    state.value = frameStateAt(Math.min(time.value, duration), timing.value);
    frameHandle = requestAnimationFrame(tick);
  };

  const play = (): void => {
    if (playing.value) return;
    playing.value = true;
    time.value = 0;
    lastTimestamp = 0;
    frameHandle = requestAnimationFrame(tick);
  };

  const pause = (): void => {
    playing.value = false;
    if (frameHandle !== null) cancelAnimationFrame(frameHandle);
    frameHandle = null;
    // Rest on the fully-visible state so the panel stays useful for styling.
    state.value = HELD;
  };

  const toggle = (): void => (playing.value ? pause() : play());

  const seek = (seconds: number): void => {
    time.value = seconds;
    state.value = frameStateAt(seconds, timing.value);
  };

  const restart = (): void => {
    time.value = 0;
    lastTimestamp = 0;
    apply();
  };

  // Timing edits should be visible immediately while paused.
  watch(timing, () => {
    if (!playing.value) state.value = HELD;
  });

  onBeforeUnmount(() => {
    if (frameHandle !== null) cancelAnimationFrame(frameHandle);
  });

  return { state, time, playing, play, pause, toggle, seek, restart };
}

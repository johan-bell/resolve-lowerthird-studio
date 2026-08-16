import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  DEFAULT_TIMING,
  type AnimationTiming,
  type LowerThirdStyle,
  type RenderJobResult,
  type RenderProgressPayload,
} from '@lower-thirds/shared';
import * as api from '@/api/render.api';

export const useRenderStore = defineStore('render', () => {
  const timing = ref<AnimationTiming>({ ...DEFAULT_TIMING });
  const available = ref(false);
  const outputDir = ref('');
  const unavailableReason = ref<string | null>(null);

  const busy = ref(false);
  const progress = ref(0);
  const currentName = ref('');
  const stage = ref<RenderProgressPayload['stage'] | null>(null);
  const lastResult = ref<RenderJobResult | null>(null);
  const error = ref<string | null>(null);

  const canRender = computed(() => available.value && !busy.value);

  const patchTiming = (patch: Partial<AnimationTiming>): void => {
    timing.value = { ...timing.value, ...patch };
  };

  const resetTiming = (): void => {
    timing.value = { ...DEFAULT_TIMING };
  };

  async function loadCapability(): Promise<void> {
    const result = await api.renderCapability();
    if (!result.ok) {
      available.value = false;
      unavailableReason.value = result.error.message;
      return;
    }
    available.value = result.data.available;
    outputDir.value = result.data.outputDir;
    unavailableReason.value = result.data.reason;
  }

  /** Progress arrives over the socket while the HTTP request is still open. */
  function applyProgress(payload: RenderProgressPayload): void {
    progress.value = payload.progress;
    stage.value = payload.stage;
    if (payload.name) currentName.value = payload.name;
  }

  async function render(
    itemIds: string[],
    style: LowerThirdStyle,
    fallback?: { name: string; subtitle: string },
  ): Promise<void> {
    if (!available.value || busy.value) return;

    busy.value = true;
    error.value = null;
    progress.value = 0;
    lastResult.value = null;
    currentName.value = fallback?.name ?? '';

    const result = await api.startRender({
      itemIds,
      targets: itemIds.length === 0 && fallback ? [fallback] : undefined,
      style,
      timing: timing.value,
      format: 'prores4444',
      width: 1920,
      height: 1080,
    });

    busy.value = false;
    stage.value = null;
    progress.value = 0;

    if (!result.ok) {
      error.value = result.error.message;
      return;
    }
    lastResult.value = result.data;
    outputDir.value = result.data.outputDir;
  }

  return {
    timing,
    available,
    outputDir,
    unavailableReason,
    busy,
    progress,
    currentName,
    stage,
    lastResult,
    error,
    canRender,
    patchTiming,
    resetTiming,
    loadCapability,
    applyProgress,
    render,
  };
});

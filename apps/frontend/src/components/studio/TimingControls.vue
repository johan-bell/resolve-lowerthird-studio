<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { totalFrames, totalSeconds } from '@lower-thirds/shared';
import { DEFAULT_TIMING } from '@lower-thirds/shared';
import { useRenderStore } from '@/stores/render.store';
import SectionHeader from './SectionHeader.vue';

const render = useRenderStore();
const { timing } = storeToRefs(render);

const summary = computed(
  () => `${totalSeconds(timing.value).toFixed(1)}s · ${String(totalFrames(timing.value))} frames`,
);

const modified = computed(
  () =>
    timing.value.fps !== DEFAULT_TIMING.fps ||
    timing.value.inSeconds !== DEFAULT_TIMING.inSeconds ||
    timing.value.holdSeconds !== DEFAULT_TIMING.holdSeconds ||
    timing.value.outSeconds !== DEFAULT_TIMING.outSeconds,
);

const fields = computed(() => [
  { key: 'inSeconds' as const, label: 'Wipe in', min: 0, max: 3, step: 0.1, value: timing.value.inSeconds },
  { key: 'holdSeconds' as const, label: 'Hold', min: 0.5, max: 15, step: 0.5, value: timing.value.holdSeconds },
  { key: 'outSeconds' as const, label: 'Wipe out', min: 0, max: 3, step: 0.1, value: timing.value.outSeconds },
]);
</script>

<template>
  <div class="flex flex-col gap-2">
    <SectionHeader
      title="Animation"
      :hint="summary"
      :modified="modified"
      @reset="render.resetTiming()"
    />

    <label v-for="field in fields" :key="field.key" class="flex flex-col gap-1">
      <span class="flex items-center justify-between text-[11px] text-zinc-400">
        {{ field.label }}
        <span class="font-mono text-[10px] text-zinc-500 tabular-nums">
          {{ field.value.toFixed(1) }}s
        </span>
      </span>
      <input
        type="range"
        :min="field.min"
        :max="field.max"
        :step="field.step"
        :value="field.value"
        :data-testid="`timing-${field.key}`"
        class="h-1 w-full cursor-pointer appearance-none rounded bg-stroke accent-zinc-300"
        @input="render.patchTiming({ [field.key]: Number(($event.target as HTMLInputElement).value) })"
      />
    </label>

    <label class="flex items-center justify-between gap-2">
      <span class="text-[11px] text-zinc-400">Frame rate</span>
      <select
        :value="timing.fps"
        data-testid="timing-fps"
        class="w-24 rounded border border-stroke bg-stage px-1.5 py-1 text-[11px] text-zinc-200 outline-none focus:border-zinc-500"
        @change="render.patchTiming({ fps: Number(($event.target as HTMLSelectElement).value) })"
      >
        <option :value="24">24 fps</option>
        <option :value="25">25 fps</option>
        <option :value="30">30 fps</option>
        <option :value="50">50 fps</option>
        <option :value="60">60 fps</option>
      </select>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { ANCHORS, DEFAULT_STYLE, type Anchor } from '@lower-thirds/shared';
import { useStyleStore } from '@/stores/style.store';
import SectionHeader from './SectionHeader.vue';

const styleStore = useStyleStore();
const { style } = storeToRefs(styleStore);

const modified = computed(
  () =>
    (style.value.anchor ?? DEFAULT_STYLE.anchor) !== DEFAULT_STYLE.anchor ||
    style.value.offsetX !== DEFAULT_STYLE.offsetX ||
    style.value.offsetY !== DEFAULT_STYLE.offsetY,
);

/** Labels the margins by what they actually measure from. */
const edges = computed(() => {
  const anchor = style.value.anchor ?? DEFAULT_STYLE.anchor;
  const normalised = anchor === 'center' ? 'middle-center' : anchor;
  const [vertical, horizontal] = normalised.split('-');
  return {
    x: horizontal === 'right' ? 'From right' : horizontal === 'center' ? 'Nudge across' : 'From left',
    y: vertical === 'bottom' ? 'From bottom' : vertical === 'middle' ? 'Nudge down' : 'From top',
  };
});

const asPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const setAnchor = (anchor: Anchor): void => {
  styleStore.patch({ anchor });
};
</script>

<template>
  <div class="flex flex-col gap-2">
    <SectionHeader title="Position" :modified="modified" @reset="styleStore.resetPosition()" />

    <div class="flex items-start gap-3">
      <!-- Nine-point anchor grid, laid out like the frame it represents -->
      <div class="grid shrink-0 grid-cols-3 gap-0.5 rounded border border-stroke bg-stage p-1">
        <button
          v-for="anchor in ANCHORS"
          :key="anchor"
          type="button"
          :title="anchor.replace('-', ' ')"
          :data-testid="`anchor-${anchor}`"
          class="flex h-6 w-6 items-center justify-center rounded transition-colors"
          :class="
            style.anchor === anchor
              ? 'bg-zinc-300 text-zinc-900'
              : 'text-zinc-600 hover:bg-raised hover:text-zinc-300'
          "
          @click="setAnchor(anchor)"
        >
          <span class="h-1.5 w-3 rounded-[1px] bg-current" />
        </button>
      </div>

      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <label class="flex flex-col gap-1">
          <span class="flex items-center justify-between text-[11px] text-zinc-400">
            {{ edges.x }}
            <span class="font-mono text-[10px] text-zinc-500 tabular-nums">
              {{ asPercent(style.offsetX) }}
            </span>
          </span>
          <input
            type="range"
            min="-0.5"
            max="0.5"
            step="0.005"
            :value="style.offsetX"
            data-testid="offset-x"
            class="h-1 w-full cursor-pointer appearance-none rounded bg-stroke accent-zinc-300"
            @input="styleStore.patch({ offsetX: Number(($event.target as HTMLInputElement).value) })"
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="flex items-center justify-between text-[11px] text-zinc-400">
            {{ edges.y }}
            <span class="font-mono text-[10px] text-zinc-500 tabular-nums">
              {{ asPercent(style.offsetY) }}
            </span>
          </span>
          <input
            type="range"
            min="-0.5"
            max="0.5"
            step="0.005"
            :value="style.offsetY"
            data-testid="offset-y"
            class="h-1 w-full cursor-pointer appearance-none rounded bg-stroke accent-zinc-300"
            @input="styleStore.patch({ offsetY: Number(($event.target as HTMLInputElement).value) })"
          />
        </label>
      </div>
    </div>

    <p class="text-[10px] text-zinc-600">Or drag the lower-third directly in the preview.</p>
  </div>
</template>

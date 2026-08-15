<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { totalSeconds } from '@lower-thirds/shared';
import { useQueueStore } from '@/stores/queue.store';
import { useStyleStore } from '@/stores/style.store';
import { useRenderStore } from '@/stores/render.store';
import { useAnimationPlayback } from '@/composables/useAnimationPlayback';
import LowerThirdMock from './LowerThirdMock.vue';

/** The project raster the style's pixel values are expressed in. */
const PROJECT_WIDTH = 1920;
const PROJECT_HEIGHT = 1080;
/** Must match SAFE_LEFT / BOTTOM_INSET in the backend frame renderer. */
const SAFE_LEFT = 0.1;
const BOTTOM_INSET = 0.18;

const queue = useQueueStore();
const styleStore = useStyleStore();
const renderStore = useRenderStore();
const { activeItem } = storeToRefs(queue);
const { style } = storeToRefs(styleStore);
const { timing } = storeToRefs(renderStore);

const playback = useAnimationPlayback(timing);

const stage = ref<HTMLElement | null>(null);
const stageWidth = ref(0);
const showSafeArea = ref(true);

const scale = computed(() => (stageWidth.value > 0 ? stageWidth.value / PROJECT_WIDTH : 0));
const name = computed(() => activeItem.value?.name ?? 'Select an entry');
const subtitle = computed(() => activeItem.value?.title ?? '');
const duration = computed(() => totalSeconds(timing.value));

let observer: ResizeObserver | null = null;

onMounted(() => {
  if (!stage.value) return;
  observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry) stageWidth.value = entry.contentRect.width;
  });
  observer.observe(stage.value);
  stageWidth.value = stage.value.clientWidth;
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <section class="flex min-h-0 flex-col bg-stage">
    <header class="flex items-center justify-between border-b border-stroke px-3 py-2">
      <h2 class="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Preview</h2>
      <div class="flex items-center gap-3">
        <button
          type="button"
          data-testid="play-toggle"
          class="rounded border border-stroke px-2 py-0.5 text-[11px] text-zinc-300 hover:bg-raised"
          @click="playback.toggle()"
        >
          {{ playback.playing.value ? '■ Stop' : '▶ Play' }}
        </button>
        <label class="flex cursor-pointer items-center gap-1.5 text-[11px] text-zinc-500">
          <input v-model="showSafeArea" type="checkbox" class="accent-zinc-400" />
          Title safe
        </label>
      </div>
    </header>

    <div class="flex min-h-0 flex-1 items-center justify-center p-6">
      <div
        ref="stage"
        class="relative aspect-video w-full max-w-4xl overflow-hidden rounded border border-stroke bg-black"
        data-testid="preview-stage"
      >
        <div
          v-if="showSafeArea"
          class="pointer-events-none absolute inset-[10%] border border-dashed border-white/15"
        />

        <div
          class="absolute flex"
          :style="{ left: `${String(SAFE_LEFT * 100)}%`, bottom: `${String(BOTTOM_INSET * 100)}%` }"
        >
          <LowerThirdMock
            v-if="scale > 0"
            :name="name"
            :subtitle="subtitle"
            :style="style"
            :scale="scale"
            :animation="playback.state.value"
          />
        </div>
      </div>
    </div>

    <footer class="flex items-center justify-between border-t border-stroke px-3 py-1.5">
      <span class="font-mono text-[10px] text-zinc-600">
        {{ PROJECT_WIDTH }}×{{ PROJECT_HEIGHT }} · {{ Math.round(scale * 100) }}%
      </span>
      <span class="font-mono text-[10px] text-zinc-600 tabular-nums">
        {{ playback.time.value.toFixed(2) }}s / {{ duration.toFixed(1) }}s
      </span>
    </footer>
  </section>
</template>

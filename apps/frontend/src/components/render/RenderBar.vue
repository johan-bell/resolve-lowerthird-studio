<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { totalSeconds } from '@lower-thirds/shared';
import { useRenderStore } from '@/stores/render.store';
import { useQueueStore } from '@/stores/queue.store';
import { useStyleStore } from '@/stores/style.store';

const render = useRenderStore();
const queue = useQueueStore();
const styleStore = useStyleStore();

const { busy, progress, currentName, stage, lastResult, error, available, unavailableReason, outputDir, timing } =
  storeToRefs(render);
const { activeItem, items } = storeToRefs(queue);
const { style } = storeToRefs(styleStore);

onMounted(() => void render.loadCapability());

const clipLength = computed(() => totalSeconds(timing.value).toFixed(1));

const batchLabel = computed(() =>
  items.value.length === 0 ? 'Render queue' : `Render queue (${String(items.value.length)})`,
);

async function renderOne(): Promise<void> {
  if (!activeItem.value) return;
  await render.render([activeItem.value.id], style.value);
}

async function renderAll(): Promise<void> {
  if (items.value.length === 0) return;
  await render.render(
    items.value.map((item) => item.id),
    style.value,
  );
}

const formatBytes = (bytes: number): string => `${(bytes / 1_048_576).toFixed(1)} MB`;
</script>

<template>
  <div class="flex shrink-0 flex-col border-t border-stroke bg-panel">
    <div class="flex items-center gap-2 px-3 py-2">
      <button
        type="button"
        data-testid="render-one"
        class="rounded bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-900 transition-opacity hover:bg-white disabled:opacity-30"
        :disabled="!render.canRender || !activeItem"
        @click="renderOne"
      >
        Render selected
      </button>

      <button
        type="button"
        data-testid="render-all"
        class="rounded border border-stroke px-3 py-1.5 text-xs text-zinc-300 hover:bg-raised disabled:opacity-30"
        :disabled="!render.canRender || items.length === 0"
        @click="renderAll"
      >
        {{ batchLabel }}
      </button>

      <span class="text-[11px] text-zinc-600">
        ProRes 4444 · alpha · {{ clipLength }}s · 1920×1080
      </span>

      <span v-if="!available" class="ml-auto text-[11px] text-warn">
        {{ unavailableReason ?? 'Rendering unavailable' }}
      </span>
    </div>

    <!-- Progress -->
    <div v-if="busy" class="px-3 pb-2" data-testid="render-progress">
      <div class="mb-1 flex items-center justify-between text-[11px] text-zinc-400">
        <span>{{ stage === 'encoding' ? 'Encoding' : 'Rendering' }} {{ currentName }}</span>
        <span class="font-mono tabular-nums">{{ Math.round(progress * 100) }}%</span>
      </div>
      <div class="h-1 w-full overflow-hidden rounded bg-stroke">
        <div
          class="h-full bg-ok transition-[width] duration-150"
          :style="{ width: `${String(progress * 100)}%` }"
        />
      </div>
    </div>

    <!-- Result -->
    <div
      v-else-if="lastResult"
      class="border-t border-stroke px-3 py-2 text-[11px]"
      data-testid="render-result"
    >
      <p class="text-ok">
        {{ lastResult.files.length }} file(s) written to
        <span class="font-mono text-zinc-400">{{ outputDir }}</span>
      </p>
      <ul class="mt-1 space-y-0.5 text-zinc-500">
        <li v-for="file in lastResult.files.slice(0, 4)" :key="file.fileName" class="font-mono">
          {{ file.fileName }} · {{ formatBytes(file.bytes) }}
        </li>
      </ul>
      <p v-if="lastResult.failed.length > 0" class="mt-1 text-accent">
        {{ lastResult.failed.length }} failed: {{ lastResult.failed[0]?.error }}
      </p>
    </div>

    <p v-if="error" class="border-t border-stroke px-3 py-2 text-[11px] text-accent">{{ error }}</p>
  </div>
</template>

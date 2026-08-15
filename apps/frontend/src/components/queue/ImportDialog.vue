<script setup lang="ts">
import { ref } from 'vue';
import type { ImportFormat } from '@lower-thirds/shared';
import { useQueueStore } from '@/stores/queue.store';

const emit = defineEmits<{ close: [] }>();

const queue = useQueueStore();
const label = ref('');
const content = ref('');
const format = ref<ImportFormat>('csv');
const busy = ref(false);
const dragging = ref(false);

const SAMPLE = `name,title
Johan Bell,Director
Ava Nkosi,Sound Designer`;

async function readFile(file: File): Promise<void> {
  content.value = await file.text();
  format.value = file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv';
  if (label.value.trim().length === 0) {
    label.value = file.name.replace(/\.(csv|json)$/i, '');
  }
}

async function onDrop(event: DragEvent): Promise<void> {
  dragging.value = false;
  const file = event.dataTransfer?.files[0];
  if (file) await readFile(file);
}

async function onPick(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) await readFile(file);
}

async function submit(): Promise<void> {
  if (content.value.trim().length === 0) return;
  busy.value = true;
  const ok = await queue.importFile(format.value, content.value, label.value || undefined);
  busy.value = false;
  if (ok) emit('close');
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
    <div class="w-full max-w-lg rounded-lg border border-stroke bg-panel shadow-2xl">
      <header class="flex items-center justify-between border-b border-stroke px-4 py-3">
        <h2 class="text-sm font-semibold text-zinc-200">Import names</h2>
        <button
          type="button"
          class="rounded px-2 text-zinc-500 hover:bg-raised hover:text-zinc-200"
          @click="emit('close')"
        >
          ✕
        </button>
      </header>

      <div class="flex flex-col gap-3 p-4">
        <label class="flex flex-col gap-1">
          <span class="text-[11px] tracking-wide text-zinc-500 uppercase">List name</span>
          <input
            v-model="label"
            type="text"
            placeholder="Episode 12"
            class="rounded border border-stroke bg-stage px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-500"
          />
        </label>

        <div
          class="rounded border-2 border-dashed px-4 py-6 text-center transition-colors"
          :class="dragging ? 'border-zinc-400 bg-raised' : 'border-stroke'"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <p class="text-xs text-zinc-400">Drop a CSV or JSON file here</p>
          <p class="mt-1 text-[11px] text-zinc-600">or</p>
          <label
            class="mt-2 inline-block cursor-pointer rounded border border-stroke px-3 py-1 text-xs text-zinc-300 hover:bg-raised"
          >
            Choose a file
            <input type="file" accept=".csv,.json" class="hidden" @change="onPick" />
          </label>
        </div>

        <label class="flex flex-col gap-1">
          <span class="flex items-center justify-between text-[11px] tracking-wide text-zinc-500 uppercase">
            Or paste directly
            <select
              v-model="format"
              class="rounded border border-stroke bg-stage px-1 py-0.5 text-[11px] text-zinc-300 normal-case outline-none"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </span>
          <textarea
            v-model="content"
            rows="6"
            :placeholder="SAMPLE"
            data-testid="import-textarea"
            class="resize-none rounded border border-stroke bg-stage px-2 py-1.5 font-mono text-[11px] text-zinc-200 outline-none focus:border-zinc-500"
          />
        </label>

        <p v-if="queue.error" class="text-[11px] text-accent">{{ queue.error }}</p>
      </div>

      <footer class="flex justify-end gap-2 border-t border-stroke px-4 py-3">
        <button
          type="button"
          class="rounded px-3 py-1.5 text-xs text-zinc-400 hover:bg-raised hover:text-zinc-200"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          data-testid="import-submit"
          class="rounded bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-900 transition-opacity hover:bg-white disabled:opacity-40"
          :disabled="busy || content.trim().length === 0"
          @click="submit"
        >
          {{ busy ? 'Importing…' : 'Import' }}
        </button>
      </footer>
    </div>
  </div>
</template>

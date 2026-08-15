<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useQueueStore } from '@/stores/queue.store';
import QueueTable from './QueueTable.vue';
import ImportDialog from './ImportDialog.vue';

const queue = useQueueStore();
const { lists, activeListId, lastImportWarnings, loading } = storeToRefs(queue);

const showImport = ref(false);
const newName = ref('');
const newTitle = ref('');

onMounted(() => void queue.load());

async function addEntry(): Promise<void> {
  if (newName.value.trim().length === 0) return;
  await queue.addItem(newName.value.trim(), newTitle.value.trim());
  newName.value = '';
  newTitle.value = '';
}

async function newList(): Promise<void> {
  await queue.createList(`List ${String(lists.value.length + 1)}`);
}

async function download(format: 'csv' | 'json'): Promise<void> {
  const content = await queue.exportActive(format);
  if (content === null) return;

  const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${queue.activeList?.label ?? 'queue'}.${format}`;
  anchor.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <section class="flex min-h-0 flex-col border-r border-stroke bg-panel">
    <header class="flex items-center justify-between border-b border-stroke px-3 py-2">
      <h2 class="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Queue</h2>
      <div class="flex items-center gap-1">
        <button
          type="button"
          title="Import CSV or JSON"
          data-testid="open-import"
          class="rounded px-2 py-1 text-[11px] text-zinc-400 hover:bg-raised hover:text-zinc-200"
          @click="showImport = true"
        >
          Import
        </button>
        <button
          type="button"
          title="Export this list as CSV"
          class="rounded px-2 py-1 text-[11px] text-zinc-400 hover:bg-raised hover:text-zinc-200 disabled:opacity-30"
          :disabled="activeListId === null"
          @click="download('csv')"
        >
          Export
        </button>
      </div>
    </header>

    <div class="flex items-center gap-1 border-b border-stroke px-3 py-2">
      <select
        :value="activeListId ?? ''"
        data-testid="list-select"
        class="min-w-0 flex-1 rounded border border-stroke bg-stage px-2 py-1 text-xs text-zinc-300 outline-none focus:border-zinc-500"
        @change="queue.selectList(($event.target as HTMLSelectElement).value || null)"
      >
        <option v-if="lists.length === 0" value="">No lists yet</option>
        <option v-for="list in lists" :key="list.id" :value="list.id">
          {{ list.label }} ({{ list.items.length }})
        </option>
      </select>
      <button
        type="button"
        title="New empty list"
        class="rounded border border-stroke px-2 py-1 text-xs text-zinc-400 hover:bg-raised hover:text-zinc-200"
        @click="newList"
      >
        +
      </button>
      <button
        v-if="activeListId"
        type="button"
        title="Delete this list"
        class="rounded border border-stroke px-2 py-1 text-xs text-zinc-500 hover:bg-raised hover:text-accent"
        @click="queue.removeList(activeListId)"
      >
        ✕
      </button>
    </div>

    <p
      v-if="lastImportWarnings.length > 0"
      class="border-b border-stroke bg-warn/10 px-3 py-2 text-[11px] text-warn"
      data-testid="import-warnings"
    >
      {{ lastImportWarnings.length }} row(s) needed attention:
      {{ lastImportWarnings.slice(0, 3).join(' ') }}
    </p>

    <div class="min-h-0 flex-1 overflow-auto p-2">
      <p v-if="loading" class="px-1 py-4 text-xs text-zinc-600">Loading…</p>
      <QueueTable v-else />
    </div>

    <form class="flex flex-col gap-1 border-t border-stroke p-2" @submit.prevent="addEntry">
      <input
        v-model="newName"
        type="text"
        placeholder="Name"
        data-testid="new-name"
        class="rounded border border-stroke bg-stage px-2 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-500"
      />
      <div class="flex gap-1">
        <input
          v-model="newTitle"
          type="text"
          placeholder="Title"
          data-testid="new-title"
          class="min-w-0 flex-1 rounded border border-stroke bg-stage px-2 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-500"
        />
        <button
          type="submit"
          data-testid="add-entry"
          class="rounded border border-stroke px-2 py-1 text-xs text-zinc-300 hover:bg-raised disabled:opacity-30"
          :disabled="activeListId === null"
        >
          Add
        </button>
      </div>
    </form>

    <ImportDialog v-if="showImport" @close="showImport = false" />
  </section>
</template>

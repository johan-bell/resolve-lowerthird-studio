<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useQueueStore } from '@/stores/queue.store';

const queue = useQueueStore();
const { items, activeItemId } = storeToRefs(queue);
</script>

<template>
  <div v-if="items.length === 0" class="px-1 py-6 text-center text-xs text-zinc-600">
    No entries yet. Import a CSV or add one below.
  </div>

  <ul v-else class="flex flex-col gap-px" data-testid="queue-items">
    <li v-for="(item, index) in items" :key="item.id">
      <button
        type="button"
        class="group flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors"
        :class="
          item.id === activeItemId
            ? 'bg-raised text-zinc-100'
            : 'text-zinc-400 hover:bg-raised/60 hover:text-zinc-200'
        "
        :data-testid="`queue-item-${String(index)}`"
        @click="queue.selectItem(item.id)"
      >
        <span class="w-5 shrink-0 font-mono text-[10px] text-zinc-600 tabular-nums">
          {{ index + 1 }}
        </span>

        <span class="min-w-0 flex-1">
          <span class="block truncate text-xs font-medium">{{ item.name }}</span>
          <span v-if="item.title" class="block truncate text-[11px] text-zinc-500">
            {{ item.title }}
          </span>
        </span>

        <span
          class="shrink-0 rounded px-1 text-[10px] text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-stroke hover:text-accent"
          role="button"
          tabindex="0"
          title="Remove entry"
          @click.stop="queue.removeItem(item.id)"
          @keydown.enter.stop="queue.removeItem(item.id)"
        >
          ✕
        </span>
      </button>
    </li>
  </ul>
</template>

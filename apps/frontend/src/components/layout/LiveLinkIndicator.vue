<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useConnectionStore } from '@/stores/connection.store';

const props = defineProps<{ onRefresh?: () => void }>();

const connection = useConnectionStore();
const { status, backendOnline } = storeToRefs(connection);

interface Presentation {
  label: string;
  dotClass: string;
  pulse: boolean;
  detail: string | null;
}

const view = computed<Presentation>(() => {
  if (!backendOnline.value) {
    return {
      label: 'Backend offline',
      dotClass: 'bg-accent',
      pulse: false,
      detail: 'The local API is not reachable. Is ./scripts/dev.sh still running?',
    };
  }

  switch (status.value.state) {
    case 'connected':
      return {
        label: status.value.timelineName ?? 'Resolve connected',
        dotClass: 'bg-ok',
        pulse: false,
        detail: status.value.projectName,
      };
    case 'no-project':
      return {
        label: 'No timeline open',
        dotClass: 'bg-warn',
        pulse: false,
        detail: status.value.detail,
      };
    case 'launching':
      return { label: 'Connecting…', dotClass: 'bg-warn', pulse: true, detail: null };
    default:
      return {
        label: 'Resolve not running',
        dotClass: 'bg-zinc-600',
        pulse: false,
        detail: status.value.detail,
      };
  }
});
</script>

<template>
  <button
    type="button"
    class="group flex items-center gap-2 rounded px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-raised hover:text-zinc-200"
    :title="view.detail ?? 'Click to re-check DaVinci Resolve'"
    @click="props.onRefresh?.()"
  >
    <span class="relative flex h-2 w-2">
      <span
        v-if="view.pulse"
        class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        :class="view.dotClass"
      />
      <span class="relative inline-flex h-2 w-2 rounded-full" :class="view.dotClass" />
    </span>

    <span class="font-medium">{{ view.label }}</span>

    <span
      v-if="status.playhead && status.state === 'connected'"
      class="font-mono text-[11px] text-zinc-500 tabular-nums"
    >
      {{ status.playhead }}
    </span>
  </button>
</template>

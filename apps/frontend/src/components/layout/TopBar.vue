<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useConnectionStore } from '@/stores/connection.store';
import LiveLinkIndicator from './LiveLinkIndicator.vue';

defineProps<{ onRefresh?: () => void }>();

const { status } = storeToRefs(useConnectionStore());
</script>

<template>
  <header
    class="flex h-12 shrink-0 items-center justify-between border-b border-stroke bg-panel px-4"
  >
    <div class="flex items-baseline gap-2">
      <h1 class="text-sm font-semibold tracking-wide text-zinc-200">Lower-Third Studio</h1>
      <span class="text-xs text-zinc-500">for DaVinci Resolve</span>
    </div>

    <div class="flex items-center gap-3">
      <span v-if="status.projectName" class="text-xs text-zinc-500">
        {{ status.projectName }}
      </span>
      <LiveLinkIndicator :on-refresh="onRefresh" />
    </div>
  </header>
</template>

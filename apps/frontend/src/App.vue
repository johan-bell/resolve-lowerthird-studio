<script setup lang="ts">
import TopBar from '@/components/layout/TopBar.vue';
import QueuePanel from '@/components/queue/QueuePanel.vue';
import PreviewCanvas from '@/components/preview/PreviewCanvas.vue';
import StylePanel from '@/components/studio/StylePanel.vue';
import RenderBar from '@/components/render/RenderBar.vue';
import { useResolveStatus } from '@/composables/useResolveStatus';
import { useRenderProgress } from '@/composables/useRenderProgress';

const { refresh } = useResolveStatus();
useRenderProgress();
</script>

<template>
  <div class="flex h-full flex-col">
    <TopBar :on-refresh="refresh" />

    <main class="grid min-h-0 flex-1 grid-cols-[300px_1fr_320px]">
      <QueuePanel />
      <div class="flex min-h-0 flex-col">
        <PreviewCanvas />
        <RenderBar />
      </div>
      <StylePanel />
    </main>
  </div>
</template>

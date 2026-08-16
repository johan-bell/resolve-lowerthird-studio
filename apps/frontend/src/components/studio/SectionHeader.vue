<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
  /** Shown right-aligned before the reset control, e.g. a running total. */
  hint?: string;
    /** Enabled only when the section actually differs from its defaults. */
    modified?: boolean;
    resetTitle?: string;
    /** Sections with nothing to revert omit the control entirely. */
    resettable?: boolean;
  }>(),
  { hint: undefined, resetTitle: undefined, resettable: true },
);

const emit = defineEmits<{ reset: [] }>();
</script>

<template>
  <div class="flex items-center justify-between">
    <span class="text-[11px] font-medium tracking-wider text-zinc-500 uppercase">{{ title }}</span>

    <span class="flex items-center gap-2">
      <span v-if="hint" class="font-mono text-[10px] text-zinc-600 tabular-nums">{{ hint }}</span>
      <button
        v-if="resettable"
        type="button"
        :title="resetTitle ?? `Reset ${title.toLowerCase()} to defaults`"
        :disabled="modified === false"
        :data-testid="`reset-${title.toLowerCase().replace(/\s+/g, '-')}`"
        class="rounded p-0.5 text-zinc-600 transition-colors hover:bg-raised hover:text-zinc-200 disabled:pointer-events-none disabled:opacity-25"
        @click="emit('reset')"
      >
        <!-- Counter-clockwise arrow: the conventional "revert" mark -->
        <svg viewBox="0 0 16 16" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" stroke-linecap="round" />
          <path d="M2 2.5V6h3.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </span>
  </div>
</template>

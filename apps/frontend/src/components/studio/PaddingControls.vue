<script setup lang="ts">
import { computed } from 'vue';
import type { PaddingConstraints } from '@lower-thirds/shared';

const props = defineProps<{ modelValue: PaddingConstraints }>();
const emit = defineEmits<{ 'update:modelValue': [value: PaddingConstraints] }>();

const set = (patch: Partial<PaddingConstraints>): void => {
  const next = { ...props.modelValue, ...patch };
  // minWidth can never exceed maxWidth; nudge the other value rather than
  // rejecting the edit, so dragging a slider never feels stuck.
  if (next.minWidth > next.maxWidth) {
    if (patch.minWidth !== undefined) next.maxWidth = next.minWidth;
    else next.minWidth = next.maxWidth;
  }
  emit('update:modelValue', next);
};

const fields = computed(() => [
  { key: 'x' as const, label: 'Padding X', min: 0, max: 200, value: props.modelValue.x },
  { key: 'y' as const, label: 'Padding Y', min: 0, max: 200, value: props.modelValue.y },
  {
    key: 'minWidth' as const,
    label: 'Min width',
    min: 0,
    max: 1920,
    value: props.modelValue.minWidth,
  },
  {
    key: 'maxWidth' as const,
    label: 'Max width',
    min: 100,
    max: 1920,
    value: props.modelValue.maxWidth,
  },
]);
</script>

<template>
  <div class="flex flex-col gap-2">
    <label v-for="field in fields" :key="field.key" class="flex flex-col gap-1">
      <span class="flex items-center justify-between text-[11px] text-zinc-400">
        {{ field.label }}
        <span class="font-mono text-[10px] text-zinc-500 tabular-nums">{{ field.value }}px</span>
      </span>
      <input
        type="range"
        :min="field.min"
        :max="field.max"
        :value="field.value"
        :data-testid="`padding-${field.key}`"
        class="h-1 w-full cursor-pointer appearance-none rounded bg-stroke accent-zinc-300"
        @input="set({ [field.key]: Number(($event.target as HTMLInputElement).value) })"
      />
    </label>
  </div>
</template>

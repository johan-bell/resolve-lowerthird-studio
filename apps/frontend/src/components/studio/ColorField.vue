<script setup lang="ts">
import { computed } from 'vue';
import { isHexColor } from '@lower-thirds/shared';

const props = defineProps<{ label: string; modelValue: string; testid?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const valid = computed(() => isHexColor(props.modelValue));

/** Accept typing with or without the leading #, upper-case for consistency. */
function onText(event: Event): void {
  const raw = (event.target as HTMLInputElement).value.trim();
  const next = raw.startsWith('#') ? raw : `#${raw}`;
  emit('update:modelValue', next.toUpperCase());
}
</script>

<template>
  <label class="flex items-center justify-between gap-2">
    <span class="text-[11px] text-zinc-400">{{ label }}</span>
    <span class="flex items-center gap-1.5">
      <input
        type="color"
        :value="valid ? modelValue : '#000000'"
        class="h-6 w-6 cursor-pointer rounded border border-stroke bg-transparent p-0"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value.toUpperCase())"
      />
      <input
        type="text"
        :value="modelValue"
        :data-testid="testid"
        maxlength="7"
        spellcheck="false"
        class="w-20 rounded border bg-stage px-1.5 py-1 font-mono text-[11px] uppercase outline-none"
        :class="
          valid
            ? 'border-stroke text-zinc-200 focus:border-zinc-500'
            : 'border-accent text-accent'
        "
        @input="onText"
      />
    </span>
  </label>
</template>

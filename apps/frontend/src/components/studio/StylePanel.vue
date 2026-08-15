<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useStyleStore } from '@/stores/style.store';
import ColorField from './ColorField.vue';
import PaddingControls from './PaddingControls.vue';
import TimingControls from './TimingControls.vue';

/**
 * Faces that ship with macOS, so the preview and a Resolve render agree.
 * Replaced by the real installed-font list once the fonts bridge lands.
 */
const FONT_FAMILIES = [
  'Helvetica Neue',
  'Helvetica',
  'Avenir Next',
  'Futura',
  'Gill Sans',
  'Optima',
  'Times New Roman',
  'Georgia',
  'Menlo',
  'SF Pro Display',
];

const styleStore = useStyleStore();
const { style, presets, activePresetId, isDirty, error } = storeToRefs(styleStore);

const presetName = ref('');
const saving = ref(false);

onMounted(() => void styleStore.load());

async function saveAsNew(): Promise<void> {
  if (presetName.value.trim().length === 0) return;
  saving.value = true;
  const ok = await styleStore.saveAs(presetName.value.trim());
  saving.value = false;
  if (ok) presetName.value = '';
}
</script>

<template>
  <section class="flex min-h-0 flex-col border-l border-stroke bg-panel">
    <header class="flex items-center justify-between border-b border-stroke px-3 py-2">
      <h2 class="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Style</h2>
      <span v-if="isDirty" class="text-[10px] text-warn" data-testid="dirty-flag">unsaved</span>
    </header>

    <div class="min-h-0 flex-1 space-y-4 overflow-auto p-3">
      <!-- Presets -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[11px] tracking-wide text-zinc-500 uppercase">Preset</span>
        <div class="flex gap-1">
          <select
            :value="activePresetId ?? ''"
            data-testid="preset-select"
            class="min-w-0 flex-1 rounded border border-stroke bg-stage px-2 py-1 text-xs text-zinc-300 outline-none focus:border-zinc-500"
            @change="styleStore.applyPreset(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="preset in presets" :key="preset.id" :value="preset.id">
              {{ preset.name }}
            </option>
          </select>
          <button
            type="button"
            title="Save changes to this preset"
            data-testid="preset-save"
            class="rounded border border-stroke px-2 py-1 text-xs text-zinc-300 hover:bg-raised disabled:opacity-30"
            :disabled="!isDirty"
            @click="styleStore.saveActive()"
          >
            Save
          </button>
        </div>
        <div class="flex gap-1">
          <input
            v-model="presetName"
            type="text"
            placeholder="Save as new preset…"
            data-testid="preset-name"
            class="min-w-0 flex-1 rounded border border-stroke bg-stage px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-zinc-500"
          />
          <button
            type="button"
            data-testid="preset-save-as"
            class="rounded border border-stroke px-2 py-1 text-[11px] text-zinc-300 hover:bg-raised disabled:opacity-30"
            :disabled="saving || presetName.trim().length === 0"
            @click="saveAsNew"
          >
            Add
          </button>
        </div>
      </div>

      <hr class="border-stroke" />

      <!-- Typography -->
      <div class="flex flex-col gap-2">
        <span class="text-[11px] tracking-wide text-zinc-500 uppercase">Typography</span>

        <label class="flex items-center justify-between gap-2">
          <span class="text-[11px] text-zinc-400">Font</span>
          <select
            :value="style.fontFamily"
            data-testid="font-family"
            class="w-40 rounded border border-stroke bg-stage px-1.5 py-1 text-[11px] text-zinc-200 outline-none focus:border-zinc-500"
            @change="styleStore.patch({ fontFamily: ($event.target as HTMLSelectElement).value })"
          >
            <option v-for="font in FONT_FAMILIES" :key="font" :value="font">{{ font }}</option>
          </select>
        </label>

        <label class="flex items-center justify-between gap-2">
          <span class="text-[11px] text-zinc-400">Name size</span>
          <input
            type="number"
            min="8"
            max="400"
            :value="style.fontSize"
            data-testid="font-size"
            class="w-20 rounded border border-stroke bg-stage px-1.5 py-1 text-right font-mono text-[11px] text-zinc-200 outline-none focus:border-zinc-500"
            @input="styleStore.patch({ fontSize: Number(($event.target as HTMLInputElement).value) })"
          />
        </label>

        <label class="flex items-center justify-between gap-2">
          <span class="text-[11px] text-zinc-400">Title size</span>
          <input
            type="number"
            min="8"
            max="400"
            :value="style.subtitleFontSize"
            data-testid="subtitle-size"
            class="w-20 rounded border border-stroke bg-stage px-1.5 py-1 text-right font-mono text-[11px] text-zinc-200 outline-none focus:border-zinc-500"
            @input="
              styleStore.patch({ subtitleFontSize: Number(($event.target as HTMLInputElement).value) })
            "
          />
        </label>
      </div>

      <hr class="border-stroke" />

      <!-- Colour -->
      <div class="flex flex-col gap-2">
        <span class="text-[11px] tracking-wide text-zinc-500 uppercase">Colour</span>
        <ColorField
          label="Foreground"
          testid="fg-hex"
          :model-value="style.foregroundHex"
          @update:model-value="styleStore.patch({ foregroundHex: $event })"
        />
        <ColorField
          label="Background"
          testid="bg-hex"
          :model-value="style.backgroundHex"
          @update:model-value="styleStore.patch({ backgroundHex: $event })"
        />
      </div>

      <hr class="border-stroke" />

      <!-- Box -->
      <div class="flex flex-col gap-2">
        <span class="text-[11px] tracking-wide text-zinc-500 uppercase">Background box</span>
        <PaddingControls
          :model-value="style.padding"
          @update:model-value="styleStore.patchPadding($event)"
        />
      </div>

      <hr class="border-stroke" />

      <TimingControls />

      <p v-if="error" class="text-[11px] text-accent">{{ error }}</p>
    </div>
  </section>
</template>

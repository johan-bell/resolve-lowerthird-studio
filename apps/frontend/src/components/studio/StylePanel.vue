<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { DEFAULT_STYLE, FONT_WEIGHTS, LAYOUT_VARIANTS } from '@lower-thirds/shared';
import { useStyleStore } from '@/stores/style.store';
import ColorField from './ColorField.vue';
import PaddingControls from './PaddingControls.vue';
import TimingControls from './TimingControls.vue';
import SectionHeader from './SectionHeader.vue';
import PositionControls from './PositionControls.vue';

/**
 * Faces that ship with macOS, so the preview and a render agree.
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

const typographyModified = computed(
  () =>
    style.value.fontFamily !== DEFAULT_STYLE.fontFamily ||
    style.value.fontWeight !== DEFAULT_STYLE.fontWeight ||
    style.value.fontSize !== DEFAULT_STYLE.fontSize ||
    style.value.subtitleFontSize !== DEFAULT_STYLE.subtitleFontSize,
);

const colourModified = computed(
  () =>
    style.value.foregroundHex !== DEFAULT_STYLE.foregroundHex ||
    style.value.backgroundHex !== DEFAULT_STYLE.backgroundHex ||
    style.value.accentHex !== DEFAULT_STYLE.accentHex,
);

const boxModified = computed(
  () =>
    style.value.cornerRadius !== DEFAULT_STYLE.cornerRadius ||
    style.value.padding.x !== DEFAULT_STYLE.padding.x ||
    style.value.padding.y !== DEFAULT_STYLE.padding.y ||
    style.value.padding.minWidth !== DEFAULT_STYLE.padding.minWidth ||
    style.value.padding.maxWidth !== DEFAULT_STYLE.padding.maxWidth,
);

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
    <header class="flex h-9 shrink-0 items-center justify-between border-b border-stroke px-3">
      <h2 class="text-xs font-semibold tracking-wider text-zinc-400 uppercase">Style</h2>
      <span v-if="isDirty" class="text-[10px] text-warn" data-testid="dirty-flag">unsaved</span>
    </header>

    <div class="min-h-0 flex-1 divide-y divide-stroke overflow-auto">
      <!-- Preset -->
      <div class="flex flex-col gap-2 p-3">
        <SectionHeader title="Preset" :resettable="false" />
        <div class="flex gap-1">
          <select
            :value="activePresetId ?? ''"
            data-testid="preset-select"
            class="min-w-0 flex-1 rounded border border-stroke bg-stage px-2 py-1.5 text-[11px] text-zinc-200 outline-none focus:border-zinc-500"
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
            class="rounded border border-stroke px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-raised disabled:opacity-30"
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
            class="min-w-0 flex-1 rounded border border-stroke bg-stage px-2 py-1.5 text-[11px] text-zinc-200 outline-none focus:border-zinc-500"
          />
          <button
            type="button"
            data-testid="preset-save-as"
            class="rounded border border-stroke px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-raised disabled:opacity-30"
            :disabled="saving || presetName.trim().length === 0"
            @click="saveAsNew"
          >
            Add
          </button>
        </div>
      </div>

      <!-- Layout -->
      <div class="flex flex-col gap-2 p-3">
        <SectionHeader
          title="Layout"
          :modified="style.layout !== DEFAULT_STYLE.layout"
          @reset="styleStore.patch({ layout: DEFAULT_STYLE.layout })"
        />
        <div class="grid grid-cols-2 gap-1">
          <button
            v-for="variant in LAYOUT_VARIANTS"
            :key="variant.id"
            type="button"
            :title="variant.note"
            :data-testid="`layout-${variant.id}`"
            class="rounded border px-2 py-1.5 text-left text-[11px] transition-colors"
            :class="
              style.layout === variant.id
                ? 'border-zinc-400 bg-raised text-zinc-100'
                : 'border-stroke text-zinc-400 hover:bg-raised/60 hover:text-zinc-200'
            "
            @click="styleStore.patch({ layout: variant.id })"
          >
            {{ variant.label }}
          </button>
        </div>
      </div>

      <!-- Position -->
      <div class="p-3">
        <PositionControls />
      </div>

      <!-- Typography -->
      <div class="flex flex-col gap-2 p-3">
        <SectionHeader
          title="Typography"
          :modified="typographyModified"
          @reset="styleStore.resetTypography()"
        />

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
          <span class="text-[11px] text-zinc-400">Weight</span>
          <select
            :value="style.fontWeight"
            data-testid="font-weight"
            class="w-40 rounded border border-stroke bg-stage px-1.5 py-1 text-[11px] text-zinc-200 outline-none focus:border-zinc-500"
            @change="
              styleStore.patch({ fontWeight: Number(($event.target as HTMLSelectElement).value) })
            "
          >
            <option v-for="weight in FONT_WEIGHTS" :key="weight.value" :value="weight.value">
              {{ weight.label }}
            </option>
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

      <!-- Colour -->
      <div class="flex flex-col gap-2 p-3">
        <SectionHeader title="Colour" :modified="colourModified" @reset="styleStore.resetColour()" />
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
        <ColorField
          label="Accent"
          testid="accent-hex"
          :model-value="style.accentHex"
          @update:model-value="styleStore.patch({ accentHex: $event })"
        />
      </div>

      <!-- Background box -->
      <div class="flex flex-col gap-2 p-3">
        <SectionHeader
          title="Background box"
          :modified="boxModified"
          @reset="styleStore.resetBox()"
        />

        <label class="flex flex-col gap-1">
          <span class="flex items-center justify-between text-[11px] text-zinc-400">
            Corner radius
            <span class="font-mono text-[10px] text-zinc-500 tabular-nums">
              {{ style.cornerRadius }}px
            </span>
          </span>
          <input
            type="range"
            min="0"
            max="60"
            :value="style.cornerRadius"
            data-testid="corner-radius"
            class="h-1 w-full cursor-pointer appearance-none rounded bg-stroke accent-zinc-300"
            @input="
              styleStore.patch({ cornerRadius: Number(($event.target as HTMLInputElement).value) })
            "
          />
        </label>

        <PaddingControls
          :model-value="style.padding"
          @update:model-value="styleStore.patchPadding($event)"
        />
      </div>

      <!-- Animation -->
      <div class="p-3">
        <TimingControls />
      </div>

      <p v-if="error" class="p-3 text-[11px] text-accent">{{ error }}</p>
    </div>
  </section>
</template>

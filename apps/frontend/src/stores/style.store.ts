import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { DEFAULT_STYLE, type LowerThirdStyle } from '@lower-thirds/shared';
import * as api from '@/api/presets.api';
import type { StylePreset } from '@/api/presets.api';

/** Compare only the styling fields — id/name/createdAt are metadata. */
const sameStyle = (a: LowerThirdStyle, b: LowerThirdStyle): boolean =>
  a.fontFamily === b.fontFamily &&
  a.fontSize === b.fontSize &&
  a.subtitleFontSize === b.subtitleFontSize &&
  a.foregroundHex === b.foregroundHex &&
  a.backgroundHex === b.backgroundHex &&
  a.padding.x === b.padding.x &&
  a.padding.y === b.padding.y &&
  a.padding.minWidth === b.padding.minWidth &&
  a.padding.maxWidth === b.padding.maxWidth;

export const useStyleStore = defineStore('style', () => {
  /** The look currently being edited. */
  const style = ref<LowerThirdStyle>(structuredClone(DEFAULT_STYLE));
  const presets = ref<StylePreset[]>([]);
  const activePresetId = ref<string | null>(null);
  const error = ref<string | null>(null);

  const activePreset = computed<StylePreset | null>(
    () => presets.value.find((p) => p.id === activePresetId.value) ?? null,
  );

  /** True when the working style has drifted from the loaded preset. */
  const isDirty = computed(() => {
    const preset = activePreset.value;
    return preset === null ? false : !sameStyle(style.value, preset);
  });

  const patch = (next: Partial<LowerThirdStyle>): void => {
    style.value = { ...style.value, ...next };
  };

  const patchPadding = (next: Partial<LowerThirdStyle['padding']>): void => {
    style.value = { ...style.value, padding: { ...style.value.padding, ...next } };
  };

  async function load(): Promise<void> {
    const result = await api.listPresets();
    if (!result.ok) {
      error.value = result.error.message;
      return;
    }
    presets.value = result.data;
    const first = result.data[0];
    if (activePresetId.value === null && first) applyPreset(first.id);
  }

  function applyPreset(id: string): void {
    const preset = presets.value.find((p) => p.id === id);
    if (!preset) return;
    activePresetId.value = id;
    style.value = {
      fontFamily: preset.fontFamily,
      fontSize: preset.fontSize,
      subtitleFontSize: preset.subtitleFontSize,
      foregroundHex: preset.foregroundHex,
      backgroundHex: preset.backgroundHex,
      padding: { ...preset.padding },
    };
  }

  async function saveAs(name: string): Promise<boolean> {
    error.value = null;
    const result = await api.createPreset({ ...style.value, name });
    if (!result.ok) {
      error.value = result.error.message;
      return false;
    }
    presets.value = [...presets.value, result.data];
    activePresetId.value = result.data.id;
    return true;
  }

  async function saveActive(): Promise<boolean> {
    const preset = activePreset.value;
    if (!preset) return false;

    error.value = null;
    const result = await api.updatePreset(preset.id, { ...style.value });
    if (!result.ok) {
      error.value = result.error.message;
      return false;
    }
    presets.value = presets.value.map((p) => (p.id === result.data.id ? result.data : p));
    return true;
  }

  async function remove(id: string): Promise<void> {
    const result = await api.deletePreset(id);
    if (!result.ok) {
      error.value = result.error.message;
      return;
    }
    presets.value = presets.value.filter((p) => p.id !== id);
    if (activePresetId.value === id) {
      activePresetId.value = null;
      style.value = structuredClone(DEFAULT_STYLE);
    }
  }

  return {
    style,
    presets,
    activePresetId,
    activePreset,
    isDirty,
    error,
    patch,
    patchPadding,
    load,
    applyPreset,
    saveAs,
    saveActive,
    remove,
  };
});

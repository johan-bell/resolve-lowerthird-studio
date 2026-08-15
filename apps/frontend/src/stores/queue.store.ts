import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ImportFormat, QueueItem, QueueList } from '@lower-thirds/shared';
import * as api from '@/api/queue.api';

export const useQueueStore = defineStore('queue', () => {
  const lists = ref<QueueList[]>([]);
  const activeListId = ref<string | null>(null);
  const activeItemId = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastImportWarnings = ref<string[]>([]);

  const activeList = computed<QueueList | null>(
    () => lists.value.find((l) => l.id === activeListId.value) ?? null,
  );

  const items = computed<QueueItem[]>(() => activeList.value?.items ?? []);

  const activeItem = computed<QueueItem | null>(
    () => items.value.find((i) => i.id === activeItemId.value) ?? null,
  );

  /** Replace a list in place, keeping array order stable for the UI. */
  const upsertList = (list: QueueList): void => {
    const index = lists.value.findIndex((l) => l.id === list.id);
    if (index === -1) lists.value = [list, ...lists.value];
    else lists.value[index] = list;
  };

  const selectList = (id: string | null): void => {
    activeListId.value = id;
    activeItemId.value = activeList.value?.items[0]?.id ?? null;
  };

  const selectItem = (id: string | null): void => {
    activeItemId.value = id;
  };

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    const result = await api.listQueues();
    loading.value = false;

    if (!result.ok) {
      error.value = result.error.message;
      return;
    }
    lists.value = result.data;
    if (activeListId.value === null || !lists.value.some((l) => l.id === activeListId.value)) {
      selectList(lists.value[0]?.id ?? null);
    }
  }

  async function createList(label: string): Promise<void> {
    const result = await api.createQueue(label);
    if (!result.ok) {
      error.value = result.error.message;
      return;
    }
    upsertList(result.data);
    selectList(result.data.id);
  }

  async function removeList(id: string): Promise<void> {
    const result = await api.deleteQueue(id);
    if (!result.ok) {
      error.value = result.error.message;
      return;
    }
    lists.value = lists.value.filter((l) => l.id !== id);
    if (activeListId.value === id) selectList(lists.value[0]?.id ?? null);
  }

  async function addItem(name: string, title: string): Promise<void> {
    if (activeListId.value === null) return;
    const result = await api.addQueueItem(activeListId.value, { name, title });
    if (!result.ok) {
      error.value = result.error.message;
      return;
    }
    await refreshActive();
    selectItem(result.data.id);
  }

  async function updateItem(
    id: string,
    patch: { name?: string; title?: string },
  ): Promise<void> {
    const result = await api.updateQueueItem(id, patch);
    if (!result.ok) {
      error.value = result.error.message;
      return;
    }
    await refreshActive();
  }

  async function removeItem(id: string): Promise<void> {
    const result = await api.deleteQueueItem(id);
    if (!result.ok) {
      error.value = result.error.message;
      return;
    }
    if (activeItemId.value === id) activeItemId.value = null;
    await refreshActive();
  }

  async function importFile(
    format: ImportFormat,
    content: string,
    label?: string,
  ): Promise<boolean> {
    error.value = null;
    lastImportWarnings.value = [];

    const result = await api.importQueue(format, content, label);
    if (!result.ok) {
      error.value = result.error.message;
      return false;
    }

    upsertList(result.data.list);
    selectList(result.data.list.id);
    lastImportWarnings.value = result.data.warnings;
    return true;
  }

  async function exportActive(format: ImportFormat): Promise<string | null> {
    if (activeListId.value === null) return null;
    const result = await api.exportQueue(activeListId.value, format);
    if (!result.ok) {
      error.value = result.error.message;
      return null;
    }
    return result.data.content;
  }

  async function refreshActive(): Promise<void> {
    if (activeListId.value === null) return;
    const result = await api.getQueue(activeListId.value);
    if (result.ok) upsertList(result.data);
  }

  return {
    lists,
    activeListId,
    activeItemId,
    activeList,
    activeItem,
    items,
    loading,
    error,
    lastImportWarnings,
    load,
    createList,
    removeList,
    addItem,
    updateItem,
    removeItem,
    importFile,
    exportActive,
    selectList,
    selectItem,
  };
});

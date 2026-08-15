import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ResolveStatus } from '@lower-thirds/shared';

const UNKNOWN: ResolveStatus = {
  state: 'launching',
  projectName: null,
  timelineName: null,
  playhead: null,
  detail: null,
};

/**
 * Live view of the DaVinci Resolve link.
 *
 * Fed by the WebSocket (see useResolveStatus); components read it, nothing else
 * writes to it.
 */
export const useConnectionStore = defineStore('connection', () => {
  const status = ref<ResolveStatus>(UNKNOWN);
  /** Whether the browser is talking to our own backend — distinct from Resolve. */
  const backendOnline = ref(false);

  const isReadyToPush = computed(
    () => backendOnline.value && status.value.state === 'connected',
  );

  const setStatus = (next: ResolveStatus): void => {
    status.value = next;
  };

  const setBackendOnline = (online: boolean): void => {
    backendOnline.value = online;
    if (!online) status.value = UNKNOWN;
  };

  return { status, backendOnline, isReadyToPush, setStatus, setBackendOnline };
});

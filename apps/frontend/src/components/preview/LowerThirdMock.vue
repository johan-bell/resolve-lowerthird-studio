<script setup lang="ts">
import { computed, toRef } from 'vue';
import type { FrameState, LowerThirdStyle } from '@lower-thirds/shared';
import { useAutoScale } from '@/composables/useAutoScale';

const props = defineProps<{
  name: string;
  subtitle: string;
  style: LowerThirdStyle;
  /** Preview pixels per project pixel, so the box scales with the stage. */
  scale: number;
  /** Current animation state; the wipe is expressed as a clip width. */
  animation: FrameState;
}>();

const layout = useAutoScale({
  name: toRef(props, 'name'),
  subtitle: toRef(props, 'subtitle'),
  style: toRef(props, 'style'),
});

const px = (projectPx: number): string => `${String(projectPx * props.scale)}px`;

/** Outer element is the full box; the wipe is a clip on this wrapper. */
const clipStyle = computed(() => ({
  width: px(layout.value.width * props.animation.barProgress),
  height: px(layout.value.height),
  overflow: 'hidden',
}));

const boxStyle = computed(() => ({
  width: px(layout.value.width),
  height: px(layout.value.height),
  backgroundColor: props.style.backgroundHex,
  paddingLeft: px(props.style.padding.x),
  paddingRight: px(props.style.padding.x),
  paddingTop: px(props.style.padding.y),
  paddingBottom: px(props.style.padding.y),
  fontFamily: `"${props.style.fontFamily}", sans-serif`,
  boxSizing: 'border-box' as const,
}));

const textStyle = computed(() => ({
  opacity: String(props.animation.textOpacity),
  transform: `translateY(${px(props.animation.textOffsetY)})`,
}));

const nameStyle = computed(() => ({
  color: props.style.foregroundHex,
  fontSize: px(props.style.fontSize),
  lineHeight: '1.25',
  fontWeight: '600',
}));

const subtitleStyle = computed(() => ({
  color: props.style.foregroundHex,
  opacity: '0.72',
  fontSize: px(props.style.subtitleFontSize),
  lineHeight: '1.25',
  marginTop: px(6),
}));
</script>

<template>
  <div
    :style="clipStyle"
    data-testid="lower-third-clip"
    :data-width="layout.width"
    :data-height="layout.height"
    :data-wrapped="layout.wrapped"
    :data-bar="animation.barProgress.toFixed(3)"
  >
    <div :style="boxStyle" data-testid="lower-third-box">
      <div :style="textStyle">
        <div :style="nameStyle">
          <div v-for="(line, i) in layout.nameLines" :key="`n${String(i)}`">{{ line }}</div>
          <div v-if="layout.nameLines.length === 0">&nbsp;</div>
        </div>
        <div v-if="layout.subtitleLines.length > 0" :style="subtitleStyle">
          <div v-for="(line, i) in layout.subtitleLines" :key="`s${String(i)}`">{{ line }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

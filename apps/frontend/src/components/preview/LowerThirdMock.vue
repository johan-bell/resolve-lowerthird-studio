<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  buildPlan,
  drawPlan,
  offsetDelta,
  placeBlock,
  type Ctx2D,
  type FrameState,
  type LowerThirdStyle,
  type MeasureFn,
} from '@lower-thirds/shared';

const props = defineProps<{
  name: string;
  subtitle: string;
  style: LowerThirdStyle;
  /** Stage size in CSS pixels. */
  stageWidth: number;
  stageHeight: number;
  /** Preview pixels per project pixel. */
  scale: number;
  animation: FrameState;
  projectWidth: number;
  projectHeight: number;
}>();

const emit = defineEmits<{ move: [offsets: { offsetX: number; offsetY: number }] }>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const measureCanvas = document.createElement('canvas');
const dragging = ref(false);
const hovering = ref(false);

/**
 * Draw the preview through the very same plan builder, placement and draw
 * routine the renderer uses. Anything that looks right here is what gets
 * encoded — there is no second implementation to keep in step.
 */
const plan = computed(() => {
  const ctx = measureCanvas.getContext('2d');
  const measure: MeasureFn = (text, fontSize, weight) => {
    if (!ctx) return text.length * fontSize * 0.52;
    ctx.font = `${String(weight)} ${String(fontSize)}px "${props.style.fontFamily}", sans-serif`;
    // Match the renderer: measure painted ink, so a synthetically-bolded weight
    // can't spill outside the padding.
    const m = ctx.measureText(text);
    const ink = (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || m.width);
    return Math.max(m.width, ink);
  };
  return buildPlan(props.name, props.subtitle, props.style, measure);
});

/** Block position in project pixels. */
const origin = computed(() =>
  placeBlock(plan.value, props.projectWidth, props.projectHeight, props.style),
);

function paint(): void {
  const canvas = canvasRef.value;
  if (!canvas || props.stageWidth <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(props.stageWidth * dpr);
  canvas.height = Math.round(props.stageHeight * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scale = props.scale * dpr;
  drawPlan(ctx as unknown as Ctx2D, plan.value, props.animation, {
    originX: origin.value.originX * scale,
    originY: origin.value.originY * scale,
    scale,
    fontFamily: props.style.fontFamily,
  });

  // Outline while hovering or dragging, so the grab target is obvious.
  if (hovering.value || dragging.value) {
    ctx.save();
    ctx.strokeStyle = dragging.value ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)';
    ctx.lineWidth = Math.max(1, dpr);
    ctx.setLineDash([6 * dpr, 4 * dpr]);
    ctx.strokeRect(
      origin.value.originX * scale,
      origin.value.originY * scale,
      plan.value.width * scale,
      plan.value.height * scale,
    );
    ctx.restore();
  }
}

/** Stage-relative pointer position, in project pixels. */
function toProject(event: PointerEvent): { x: number; y: number } | null {
  const canvas = canvasRef.value;
  if (!canvas || props.scale <= 0) return null;
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / props.scale,
    y: (event.clientY - rect.top) / props.scale,
  };
}

const isInsideBlock = (x: number, y: number): boolean =>
  x >= origin.value.originX &&
  x <= origin.value.originX + plan.value.width &&
  y >= origin.value.originY &&
  y <= origin.value.originY + plan.value.height;

let last: { x: number; y: number } | null = null;

function onPointerDown(event: PointerEvent): void {
  const point = toProject(event);
  if (!point || !isInsideBlock(point.x, point.y)) return;
  dragging.value = true;
  last = point;
  canvasRef.value?.setPointerCapture(event.pointerId);
  paint();
}

function onPointerMove(event: PointerEvent): void {
  const point = toProject(event);
  if (!point) return;

  if (!dragging.value) {
    const inside = isInsideBlock(point.x, point.y);
    if (inside !== hovering.value) {
      hovering.value = inside;
      paint();
    }
    return;
  }

  if (!last) return;
  const delta = offsetDelta(
    props.style.anchor,
    (point.x - last.x) / props.projectWidth,
    (point.y - last.y) / props.projectHeight,
  );
  last = point;
  emit('move', {
    offsetX: props.style.offsetX + delta.offsetX,
    offsetY: props.style.offsetY + delta.offsetY,
  });
}

function endDrag(event: PointerEvent): void {
  if (!dragging.value) return;
  dragging.value = false;
  last = null;
  canvasRef.value?.releasePointerCapture(event.pointerId);
  paint();
}

onMounted(paint);
onBeforeUnmount(() => {
  last = null;
});

watch(
  () => [props.animation, plan.value, origin.value, props.stageWidth, props.stageHeight, props.scale],
  paint,
  { deep: true },
);
</script>

<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 h-full w-full"
    :class="dragging ? 'cursor-grabbing' : hovering ? 'cursor-grab' : 'cursor-default'"
    data-testid="lower-third-canvas"
    :data-width="plan.width"
    :data-height="plan.height"
    :data-origin-x="origin.originX"
    :data-origin-y="origin.originY"
    :data-wrapped="plan.wrapped"
    :data-bar="animation.barProgress.toFixed(3)"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endDrag"
    @pointercancel="endDrag"
    @pointerleave="hovering = false"
  />
</template>

<script setup lang="ts">
/** Finger/pen drawing pad. Emits a PNG data URL after each stroke, '' when cleared. */
const emit = defineEmits<{ change: [dataUrl: string] }>()

const canvas = ref<HTMLCanvasElement>()
let drawing = false
let last: { x: number, y: number } | null = null

function ctx() {
  return canvas.value!.getContext('2d')!
}

function setup() {
  const c = canvas.value!
  const ratio = window.devicePixelRatio || 1
  c.width = c.clientWidth * ratio
  c.height = c.clientHeight * ratio
  const g = ctx()
  g.scale(ratio, ratio)
  g.lineWidth = 2.5
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.strokeStyle = '#000'
}
onMounted(setup)

function point(e: PointerEvent) {
  const r = canvas.value!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}
function down(e: PointerEvent) {
  canvas.value!.setPointerCapture(e.pointerId)
  drawing = true
  last = point(e)
  // a dot for a tap
  const g = ctx()
  g.beginPath()
  g.moveTo(last.x, last.y)
  g.lineTo(last.x + 0.01, last.y)
  g.stroke()
}
function move(e: PointerEvent) {
  if (!drawing || !last) return
  const p = point(e)
  const g = ctx()
  g.beginPath()
  g.moveTo(last.x, last.y)
  g.lineTo(p.x, p.y)
  g.stroke()
  last = p
}
function up() {
  if (!drawing) return
  drawing = false
  last = null
  emit('change', canvas.value!.toDataURL('image/png'))
}
function clear() {
  const c = canvas.value!
  ctx().clearRect(0, 0, c.clientWidth, c.clientHeight)
  emit('change', '')
}
</script>

<template>
  <div class="space-y-2">
    <canvas
      ref="canvas"
      class="h-40 w-full touch-none rounded border border-default bg-white"
      @pointerdown.prevent="down"
      @pointermove.prevent="move"
      @pointerup="up"
      @pointercancel="up"
    />
    <UButton size="xs" color="neutral" variant="outline" label="Zurücksetzen" @click="clear" />
  </div>
</template>

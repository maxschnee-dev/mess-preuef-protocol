<script setup lang="ts">
import { einpassen } from '~/utils/signaturen'

/**
 * Finger/pen drawing pad that fills its parent. Emits a PNG data URL after each stroke, '' when
 * cleared. When the pad changes size (fullscreen opening, phone rotated) the drawing is kept,
 * scaled uniformly and centred, and the new PNG is emitted.
 */
const emit = defineEmits<{ change: [dataUrl: string] }>()

const canvas = ref<HTMLCanvasElement>()
let drawing = false
let last: { x: number, y: number } | null = null
let hatTinte = false
/** CSS size the canvas bitmap was set up for */
let masse = { breite: 0, hoehe: 0 }

function ctx() {
  return canvas.value!.getContext('2d')!
}

function stift(g: CanvasRenderingContext2D) {
  g.lineWidth = 2.5
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.strokeStyle = '#000'
}

/** Match the bitmap to the current CSS size and device pixel ratio, carrying the drawing over. */
function anpassen() {
  const c = canvas.value!
  const neu = { breite: c.clientWidth, hoehe: c.clientHeight }
  if (!neu.breite || !neu.hoehe) return
  if (neu.breite === masse.breite && neu.hoehe === masse.hoehe) return
  const ratio = window.devicePixelRatio || 1
  let alt: HTMLCanvasElement | null = null
  if (hatTinte && masse.breite) {
    alt = document.createElement('canvas')
    alt.width = c.width
    alt.height = c.height
    alt.getContext('2d')!.drawImage(c, 0, 0)
  }
  c.width = Math.round(neu.breite * ratio)
  c.height = Math.round(neu.hoehe * ratio)
  const g = ctx()
  g.scale(ratio, ratio)
  stift(g)
  if (alt) {
    const { faktor, dx, dy } = einpassen(masse, neu)
    g.drawImage(alt, dx, dy, masse.breite * faktor, masse.hoehe * faktor)
  }
  masse = neu
  // an unfinished stroke would continue at stale coordinates
  drawing = false
  last = null
  if (alt) emit('change', c.toDataURL('image/png'))
}

let beobachter: ResizeObserver | undefined
onMounted(() => {
  anpassen()
  beobachter = new ResizeObserver(anpassen)
  beobachter.observe(canvas.value!)
})
onBeforeUnmount(() => beobachter?.disconnect())

function point(e: PointerEvent) {
  const r = canvas.value!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}
function down(e: PointerEvent) {
  canvas.value!.setPointerCapture(e.pointerId)
  drawing = true
  hatTinte = true
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
  ctx().clearRect(0, 0, masse.breite, masse.hoehe)
  hatTinte = false
  emit('change', '')
}
defineExpose({ clear })
</script>

<template>
  <canvas
    ref="canvas"
    class="block size-full touch-none rounded-sm border-2 border-ink bg-white"
    @pointerdown.prevent="down"
    @pointermove.prevent="move"
    @pointerup="up"
    @pointercancel="up"
  />
</template>

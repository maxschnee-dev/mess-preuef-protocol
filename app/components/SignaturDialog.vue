<script setup lang="ts">
/**
 * Full-screen dialog to draw the Unterschrift. Nothing is saved here: Übernehmen emits the PNG,
 * Abbrechen throws the strokes away. Page scroll and touch gestures outside the pad are blocked.
 */
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ uebernehmen: [bild: string] }>()

const pad = ref<{ clear: () => void }>()
const bild = ref('')

// Pull-to-refresh and scroll chaining are page-level; reka-ui's scroll lock alone does not stop them
watch(open, (offen) => {
  document.documentElement.style.overscrollBehavior = offen ? 'none' : ''
  bild.value = ''
}, { flush: 'sync' })
onBeforeUnmount(() => { document.documentElement.style.overscrollBehavior = '' })

function uebernehmen() {
  if (!bild.value) return
  emit('uebernehmen', bild.value)
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    fullscreen
    :dismissible="false"
    title="Unterschrift zeichnen"
    description="Mit dem Finger im Feld unterschreiben, dann Übernehmen."
  >
    <template #content>
      <div class="flex h-dvh touch-none flex-col gap-3 overscroll-none bg-default p-3" @touchmove.prevent>
        <p class="text-base font-medium">Bitte hier unterschreiben</p>
        <div class="min-h-0 flex-1">
          <SignaturPad ref="pad" @change="bild = $event" />
        </div>
        <div class="flex gap-2">
          <UButton color="neutral" variant="outline" label="Löschen" :disabled="!bild" @click="pad?.clear()" />
          <span class="flex-1" />
          <UButton color="neutral" variant="outline" label="Abbrechen" @click="open = false" />
          <UButton label="Übernehmen" :disabled="!bild" @click="uebernehmen" />
        </div>
      </div>
    </template>
  </UModal>
</template>

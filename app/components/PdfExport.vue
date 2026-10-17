<script setup lang="ts">
import { exportPdf } from '~/utils/pdf-export'

const { selected } = useProtokolle()
const toast = useToast()
const legende = ref(false)
const busy = ref(false)

async function run() {
  if (!selected.value || busy.value) return
  busy.value = true
  try {
    const result = await exportPdf(selected.value, { legende: legende.value })
    if (result === 'downloaded') toast.add({ title: 'PDF heruntergeladen', color: 'success' })
  } catch {
    toast.add({ title: 'PDF-Export fehlgeschlagen', color: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="selected" class="flex flex-wrap items-center gap-3">
    <UButton icon="i-lucide-file-down" label="Als PDF exportieren" :loading="busy" @click="run" />
    <UCheckbox v-model="legende" label="Legende als Seite 2" />
  </div>
</template>

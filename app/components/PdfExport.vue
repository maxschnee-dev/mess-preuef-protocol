<script setup lang="ts">
import type { Zertifikat } from '~/utils/digitale-signatur'
import { exportPdf } from '~/utils/pdf-export'
import { createZertifikat } from '~/utils/pdf-sign'
import { isGesperrt } from '~/utils/signaturen'

const { selected, zertifikat, setZertifikat } = useProtokolle()
const toast = useToast()
const legende = ref(false)
const busy = ref(false)

async function run() {
  if (!selected.value || busy.value) return
  busy.value = true
  try {
    const p = selected.value
    let z: Zertifikat | undefined
    if (isGesperrt(p)) {
      z = zertifikat.value ?? undefined
      if (!z) {
        z = await createZertifikat(p.auftragnehmer.name1)
        setZertifikat(z)
      }
    }
    const result = await exportPdf(p, { legende: legende.value }, z)
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

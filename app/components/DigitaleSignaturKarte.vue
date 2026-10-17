<script setup lang="ts">
import { letzterAuftragnehmer } from '~/utils/digitale-signatur'
import { createZertifikat } from '~/utils/pdf-sign'

const { zertifikat, setZertifikat, protokolle } = useProtokolle()
const toast = useToast()
const open = ref(false)
const name = ref('')
const busy = ref(false)

function dialogOeffnen() {
  name.value = letzterAuftragnehmer(protokolle.value)
  open.value = true
}

async function neuErstellen() {
  busy.value = true
  try {
    setZertifikat(await createZertifikat(name.value))
    open.value = false
    toast.add({ title: 'Zertifikat erstellt', color: 'success' })
  } catch {
    toast.add({ title: 'Zertifikat konnte nicht erstellt werden', color: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <UCard :ui="{ body: 'flex flex-wrap items-center justify-between gap-3 p-3 sm:p-3' }">
    <div class="min-w-0">
      <h2 class="font-semibold">Digitale Signatur</h2>
      <p class="truncate text-sm text-muted">{{ zertifikat?.name ?? 'noch kein Zertifikat' }}</p>
    </div>
    <UButton icon="i-lucide-refresh-cw" label="Neu erstellen" variant="outline" @click="dialogOeffnen" />

    <UModal v-model:open="open" title="Neues Zertifikat erstellen?">
      <template #body>
        <div class="space-y-3">
          <p v-if="zertifikat">Das bisherige Zertifikat wird ersetzt. Bereits signierte PDFs bleiben gültig.</p>
          <UFormField label="Name im Zertifikat">
            <UInput v-model="name" placeholder="Mess- + Prüfprotokoll" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <UButton color="neutral" variant="outline" label="Abbrechen" @click="open = false" />
        <UButton label="Erstellen" :loading="busy" @click="neuErstellen" />
      </template>
    </UModal>
  </UCard>
</template>

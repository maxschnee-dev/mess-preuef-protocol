<script setup lang="ts">
import { entwurfSignatur, isSignatureComplete } from '~/utils/signaturen'

const { selected, isLocked, sign, unlock } = useProtokolle()

const heute = () => new Date().toISOString().slice(0, 10)

// Draft of the Mitarbeiter about to sign (not yet stored). The name follows the Kopf's Mitarbeiter
// until the user types their own; `nameEigen` = null means "not overridden".
const nameEigen = ref<string | null>(null)
const datum = ref(heute())
const bild = ref('')
const entwurf = computed(() => ({
  ...entwurfSignatur(selected.value?.kopf ?? { mitarbeiter: '' }, datum.value),
  name: nameEigen.value ?? selected.value?.kopf.mitarbeiter ?? '',
  bild: bild.value,
}))
const padKey = ref(0)
const confirmOpen = ref(false)

function zuruecksetzen() {
  nameEigen.value = null
  datum.value = heute()
  bild.value = ''
  padKey.value++
}
function unterschreiben() {
  const p = selected.value
  if (p && sign(p.id, entwurf.value)) zuruecksetzen()
}
function entsperren() {
  const p = selected.value
  if (!p) return
  unlock(p.id)
  zuruecksetzen()
  confirmOpen.value = false
}
</script>

<template>
  <UCard v-if="selected">
    <template #header>
      <h2 class="text-xl font-bold">Unterschrift</h2>
    </template>

    <UAlert
      v-if="isLocked"
      color="warning"
      variant="subtle"
      title="Protokoll ist unterschrieben und gesperrt"
      description="Änderungen sind nur möglich, wenn die Unterschrift entfernt wird."
      class="mb-4"
    >
      <template #actions>
        <UButton color="warning" variant="outline" label="Bearbeiten (Unterschrift entfernen)" @click="confirmOpen = true" />
      </template>
    </UAlert>

    <section class="space-y-3">
      <h3 class="text-lg font-bold">Mitarbeiter</h3>
      <template v-if="isSignatureComplete(selected.signatur)">
        <img :src="selected.signatur.bild" alt="Unterschrift Mitarbeiter" class="h-40 w-full rounded-sm border-2 border-ink bg-white object-contain">
        <p class="text-base font-medium">{{ selected.signatur.name }} · {{ selected.signatur.datum }}</p>
      </template>
      <template v-else>
        <UFormField label="Name">
          <UInput :model-value="entwurf.name" class="w-full" @update:model-value="nameEigen = $event" />
        </UFormField>
        <UFormField label="Datum">
          <UInput v-model="datum" type="date" class="w-full" />
        </UFormField>
        <SignaturPad :key="padKey" @change="bild = $event" />
        <UButton label="Unterschreiben und sperren" :disabled="!isSignatureComplete(entwurf)" @click="unterschreiben" />
      </template>
    </section>

    <UModal v-model:open="confirmOpen" title="Unterschrift entfernen?">
      <template #body>
        <p>Das Protokoll wird entsperrt und die Unterschrift wird gelöscht. Sie müssen danach erneut unterschreiben.</p>
      </template>
      <template #footer>
        <UButton color="neutral" variant="outline" label="Abbrechen" @click="confirmOpen = false" />
        <UButton color="error" label="Entsperren und Unterschrift löschen" @click="entsperren" />
      </template>
    </UModal>
  </UCard>
</template>

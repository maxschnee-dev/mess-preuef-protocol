<script setup lang="ts">
import { UNTERZEICHNER_LABELS, isSignatureComplete, leereSignatur, type Signatur, type Unterzeichner } from '~/utils/signaturen'

const { selected, isLocked, sign, unlock } = useProtokolle()

const WER: Unterzeichner[] = ['kontrolleur', 'unternehmer']
const heute = () => new Date().toISOString().slice(0, 10)

// drafts for the party that is about to sign (not yet stored in the Protokoll)
const entwurf = reactive<Record<Unterzeichner, Signatur>>({
  kontrolleur: { ...leereSignatur(), datum: heute() },
  unternehmer: { ...leereSignatur(), datum: heute() },
})
const padKey = ref(0)
const confirmOpen = ref(false)

function unterschreiben(who: Unterzeichner) {
  const p = selected.value
  if (p && sign(p.id, who, { ...entwurf[who] })) entwurf[who] = { ...leereSignatur(), datum: heute() }
}
function entsperren() {
  const p = selected.value
  if (!p) return
  unlock(p.id)
  padKey.value++
  confirmOpen.value = false
}
</script>

<template>
  <UCard v-if="selected">
    <template #header>
      <h2 class="font-semibold">Unterschriften</h2>
    </template>

    <UAlert
      v-if="isLocked"
      color="warning"
      variant="subtle"
      title="Protokoll ist unterschrieben und gesperrt"
      description="Änderungen sind nur möglich, wenn beide Unterschriften entfernt werden."
      class="mb-4"
    >
      <template #actions>
        <UButton color="warning" variant="outline" label="Bearbeiten (Unterschriften entfernen)" @click="confirmOpen = true" />
      </template>
    </UAlert>

    <div class="grid gap-6 md:grid-cols-2">
      <section v-for="who in WER" :key="who" class="space-y-3">
        <h3 class="font-medium">{{ UNTERZEICHNER_LABELS[who] }}</h3>
        <template v-if="isSignatureComplete(selected.signaturen[who])">
          <img :src="selected.signaturen[who].bild" :alt="`Unterschrift ${UNTERZEICHNER_LABELS[who]}`" class="h-40 w-full rounded border border-default bg-white object-contain">
          <p class="text-sm">{{ selected.signaturen[who].name }} · {{ selected.signaturen[who].datum }}</p>
        </template>
        <template v-else>
          <UFormField label="Name">
            <UInput v-model="entwurf[who].name" class="w-full" :disabled="isLocked" />
          </UFormField>
          <UFormField label="Datum">
            <UInput v-model="entwurf[who].datum" type="date" class="w-full" :disabled="isLocked" />
          </UFormField>
          <SignaturPad :key="`${who}-${padKey}`" @change="entwurf[who].bild = $event" />
          <UButton label="Unterschreiben und sperren" :disabled="!isSignatureComplete(entwurf[who])" @click="unterschreiben(who)" />
        </template>
      </section>
    </div>

    <UModal v-model:open="confirmOpen" title="Unterschriften entfernen?">
      <template #body>
        <p>Das Protokoll wird entsperrt und beide Unterschriften werden gelöscht. Sie müssen danach erneut unterschreiben.</p>
      </template>
      <template #footer>
        <UButton color="neutral" variant="outline" label="Abbrechen" @click="confirmOpen = false" />
        <UButton color="error" label="Entsperren und Unterschriften löschen" @click="entsperren" />
      </template>
    </UModal>
  </UCard>
</template>

<script setup lang="ts">
import type { Kopf } from '~/utils/protokoll-form'

const { selected, update, isLocked } = useProtokolle()

const felder: { key: keyof Kopf; label: string; multiline?: boolean }[] = [
  { key: 'stromkunde', label: 'Stromkunde' },
  { key: 'interneAuftragsnummer', label: 'Interne Auftragsnummer' },
  { key: 'installationsAnzeigeNr', label: 'Installations-Anzeige Nr.' },
  { key: 'zaehlerNummer', label: 'Zähler Nummer' },
  { key: 'ausfuehrungsort', label: 'Ausführungsort' },
  { key: 'verteilung', label: 'Verteilung' },
  { key: 'ausgefuehrteArbeiten', label: 'Ausgeführte Arbeiten', multiline: true },
  { key: 'verwendetesMessgeraet', label: 'Verwendetes Messgerät' },
  { key: 'zeitraumDerMessungen', label: 'Zeitraum der Messungen' },
  { key: 'mitarbeiter', label: 'Mitarbeiter' },
]

function setFeld(key: keyof Kopf, value: unknown) {
  const p = selected.value
  if (p) update(p.id, { kopf: { ...p.kopf, [key]: String(value ?? '') } })
}
</script>

<template>
  <fieldset v-if="selected" :disabled="isLocked" class="min-w-0">
    <UCard>
      <template #header><h2 class="text-xl font-bold">Kopf</h2></template>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField v-for="f in felder" :key="f.key" :label="f.label" :class="f.multiline ? 'sm:col-span-2' : ''">
          <UTextarea v-if="f.multiline" :model-value="selected.kopf[f.key]" :rows="3" class="w-full" @update:model-value="setFeld(f.key, $event)" />
          <UInput v-else :model-value="selected.kopf[f.key]" class="w-full" @update:model-value="setFeld(f.key, $event)" />
        </UFormField>
      </div>
    </UCard>
  </fieldset>
</template>

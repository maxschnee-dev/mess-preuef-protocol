<script setup lang="ts">
import { pruefeNetzspannung } from '~/utils/grenzwerte'
import { PRUEFPUNKTE, type Kopf, type PruefpunktKey } from '~/utils/protokoll-form'

const { selected, update, isLocked } = useProtokolle()
const keypad = useKeypad()
const spannungPruefung = computed(() => pruefeNetzspannung(selected.value?.netzspannung ?? ''))

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

function setPruefpunkt(key: PruefpunktKey, value: boolean | 'indeterminate') {
  const p = selected.value
  if (p) update(p.id, { pruefpunkte: { ...p.pruefpunkte, [key]: value === true } })
}
</script>

<template>
  <fieldset v-if="selected" :disabled="isLocked" class="min-w-0 space-y-4">
    <UCard>
      <template #header><h2 class="text-xl font-bold">Kopf</h2></template>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField v-for="f in felder" :key="f.key" :label="f.label" :class="f.multiline ? 'sm:col-span-2' : ''">
          <UTextarea v-if="f.multiline" :model-value="selected.kopf[f.key]" :rows="3" class="w-full" @update:model-value="setFeld(f.key, $event)" />
          <UInput v-else :model-value="selected.kopf[f.key]" class="w-full" @update:model-value="setFeld(f.key, $event)" />
        </UFormField>
        <MesswertKarte
          label="Gemessene Spannung"
          unit="V"
          :model-value="selected.netzspannung"
          :pruefung="spannungPruefung"
          keypad-key="netzspannung"
          :aktiv="keypad.target.value?.kind === 'netz'"
          @open="keypad.open({ kind: 'netz' })"
        />
      </div>
    </UCard>
    <UCard>
      <template #header><h2 class="text-xl font-bold">Prüfpunkte</h2></template>
      <div class="space-y-4">
        <div class="space-y-1">
          <UCheckbox
            v-for="pp in PRUEFPUNKTE"
            :key="pp.key"
            size="xl"
            :label="pp.label"
            :model-value="selected.pruefpunkte[pp.key]"
            :ui="{ root: 'flex min-h-11 items-center', label: 'text-base font-medium' }"
            @update:model-value="setPruefpunkt(pp.key, $event)"
          />
        </div>
        <p class="text-sm text-muted">Nicht angehakt heisst: nicht bestätigt. Den Grund bitte in den Bemerkungen festhalten.</p>
      </div>
    </UCard>
  </fieldset>
</template>

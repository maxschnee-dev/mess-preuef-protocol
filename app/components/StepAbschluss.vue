<script setup lang="ts">
import { verstoesseDesProtokolls } from '~/utils/grenzwerte'

const { selected, update, isLocked } = useProtokolle()
const verstoesse = computed(() => (selected.value ? verstoesseDesProtokolls(selected.value) : { anzahl: 0 }))
const verstossText = (n: number) => `${n} ${n === 1 ? 'Verstoss' : 'Verstösse'}`

function setText(field: 'bemerkungen' | 'pruefungNach' | 'schaltgeraetekombination' | 'dokumentation', value: unknown) {
  const p = selected.value
  if (p) update(p.id, { [field]: String(value ?? '') })
}
function setKeineMaengel(value: boolean | 'indeterminate') {
  const p = selected.value
  if (p) update(p.id, { pruefergebnis: { ...p.pruefergebnis, keineMaengel: value === true } })
}
</script>

<template>
  <div v-if="selected" class="space-y-4">
    <!-- Unterschriften stay outside the fieldset: the unlock button must work on a locked Protokoll -->
    <fieldset :disabled="isLocked" class="min-w-0 space-y-4">
      <UCard>
        <template #header><h2 class="text-xl font-bold">Bemerkungen und Prüfung</h2></template>
        <div class="space-y-4">
          <UFormField label="Bemerkungen">
            <UTextarea :model-value="selected.bemerkungen" :rows="3" class="w-full" @update:model-value="setText('bemerkungen', $event)" />
          </UFormField>
          <UFormField label="Prüfung durchgeführt nach">
            <UInput :model-value="selected.pruefungNach" class="w-full" @update:model-value="setText('pruefungNach', $event)" />
          </UFormField>
          <UFormField label="Schaltgerätekombination">
            <UInput :model-value="selected.schaltgeraetekombination" class="w-full" @update:model-value="setText('schaltgeraetekombination', $event)" />
          </UFormField>
          <UFormField label="Dokumentation">
            <UInput :model-value="selected.dokumentation" class="w-full" @update:model-value="setText('dokumentation', $event)" />
          </UFormField>
        </div>
      </UCard>

      <UCard>
        <template #header><h2 class="text-xl font-bold">Prüfergebnis</h2></template>
        <UCheckbox :model-value="selected.pruefergebnis.keineMaengel" label="Keine Mängel festgestellt" @update:model-value="setKeineMaengel" />
        <UAlert
          v-if="selected.pruefergebnis.keineMaengel && verstoesse.anzahl"
          class="mt-3"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="`${verstossText(verstoesse.anzahl)} offen, obwohl «Keine Mängel festgestellt» angekreuzt ist.`"
        />
      </UCard>
    </fieldset>
    <SignaturenPanel />
    <PdfExport />
  </div>
</template>

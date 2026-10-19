<script setup lang="ts">
import { pruefeNetzspannung } from '~/utils/grenzwerte'
import { PRUEFPUNKTE, type PruefpunktKey } from '~/utils/protokoll-form'

const { selected, update, isLocked } = useProtokolle()
const keypad = useKeypad()
const spannungPruefung = computed(() => pruefeNetzspannung(selected.value?.netzspannung ?? ''))

function setPruefpunkt(key: PruefpunktKey, value: boolean | 'indeterminate') {
  const p = selected.value
  if (p) update(p.id, { pruefpunkte: { ...p.pruefpunkte, [key]: value === true } })
}
</script>

<template>
  <div v-if="selected" class="space-y-4">
    <UCard>
      <template #header>
        <h2 class="text-xl font-bold">Prüfpunkte und Gemessene Spannung</h2>
      </template>
      <!-- A disabled fieldset also blocks the keypad card and the checkboxes of a locked Protokoll -->
      <fieldset :disabled="isLocked" class="min-w-0 space-y-4">
        <MesswertKarte
          class="max-w-xs"
          label="Gemessene Spannung"
          unit="V"
          :model-value="selected.netzspannung"
          :pruefung="spannungPruefung"
          keypad-key="netzspannung"
          :aktiv="keypad.target.value?.kind === 'netz'"
          @open="keypad.open({ kind: 'netz' })"
        />
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
      </fieldset>
    </UCard>
    <SignaturenPanel />
    <PdfExport />
  </div>
</template>

<script setup lang="ts">
import type { FeldDef } from './StromkreisFeld.vue'
import { isPruefFeldKey, pruefeFelder } from '~/utils/grenzwerte'
import type { PruefFeldKey } from '~/utils/grenzwerte'
import type { Stromkreis } from '~/utils/protokoll-store'

const props = defineProps<{ stromkreis: Stromkreis }>()
const emit = defineEmits<{ update: [patch: Partial<Omit<Stromkreis, 'id'>>] }>()

const stammdaten: FeldDef[] = [
  { key: 'nr', label: 'Nr.' },
  { key: 'bezeichnung', label: 'Bezeichnung' },
  { key: 'leitungArtTyp', label: 'Leitung/Kabel Art/Typ' },
  { key: 'leiterAnzahl', label: 'Leiteranzahl', numeric: true },
  { key: 'leiterQuerschnitt', label: 'Querschnitt', unit: 'mm²', numeric: true },
  { key: 'ueberstromschutzArt', label: 'Überstromschutz Art', select: 'ueberstromschutz' },
  { key: 'ueberstromschutzAndere', label: 'Überstromschutz andere Art' },
  { key: 'ueberstromschutzIn', label: 'Überstromschutz I_N', unit: 'A', numeric: true },
  { key: 'rcdIn', label: 'RCD I_N', unit: 'A', numeric: true },
  { key: 'rcdArt', label: 'RCD Art', select: 'rcd' },
  { key: 'rcdIdn', label: 'RCD I_ΔN', unit: 'mA', numeric: true },
]
const sichtbar = computed(() => stammdaten.filter((f) => f.key !== 'ueberstromschutzAndere' || props.stromkreis.ueberstromschutzArt === 'andere'))

// Messwert cards in entry order (keypad "Weiter" follows this order, #15).
const gruppen: { titel: string; felder: (FeldDef & { unit: string })[] }[] = [
  {
    titel: 'Spannungsfrei-Messungen',
    felder: [
      { key: 'schutzleiter', label: 'Schutzleiter', unit: 'Ω' },
      { key: 'rIso', label: 'R_ISO', unit: 'MΩ' },
      { key: 'iLeck', label: 'I_Leck', unit: 'mA' },
    ],
  },
  {
    titel: 'Messungen unter Spannung',
    felder: [
      { key: 'ikAnfang', label: 'I_K Anfang', unit: 'A' },
      { key: 'ikEnde', label: 'I_K Ende', unit: 'A' },
      { key: 'ausloesezeit', label: 'Auslösezeit', unit: 'ms' },
    ],
  },
]

const pruefungen = computed(() => pruefeFelder(props.stromkreis))
const pruefungFuer = (key: string) => (isPruefFeldKey(key) ? pruefungen.value[key as PruefFeldKey] : undefined)
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
      <UFormField
        v-for="f in sichtbar"
        :key="f.key"
        :label="f.label + (f.unit ? ` (${f.unit})` : '')"
        :class="f.key === 'bezeichnung' || f.key === 'leitungArtTyp' ? 'col-span-2' : ''"
      >
        <StromkreisFeld :stromkreis="stromkreis" :feld="f" @update="emit('update', $event)" />
      </UFormField>
    </div>
    <section v-for="g in gruppen" :key="g.titel" class="space-y-2">
      <h3 class="text-lg font-bold">{{ g.titel }}</h3>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <MesswertKarte
          v-for="f in g.felder"
          :key="f.key"
          :label="f.label"
          :unit="f.unit"
          :model-value="stromkreis[f.key] as string"
          :pruefung="pruefungFuer(f.key)"
          :aria-label="`${f.label} (${f.unit}), Stromkreis ${stromkreis.nr}`"
          @update:model-value="emit('update', { [f.key]: $event })"
        />
      </div>
    </section>
  </div>
</template>

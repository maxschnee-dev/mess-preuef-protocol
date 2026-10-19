<script setup lang="ts">
import type { FeldDef } from './StromkreisFeld.vue'
import { isPruefFeldKey, pruefeFelder } from '~/utils/grenzwerte'
import type { PruefFeldKey } from '~/utils/grenzwerte'
import type { Stromkreis } from '~/utils/protokoll-store'
import { FELD_INFO, MESSWERT_REIHENFOLGE, targetKey } from '~/utils/keypad'
import type { KeypadTarget, MesswertKey, StammKey } from '~/utils/keypad'

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

// Messwert cards in entry order (keypad "Weiter" follows MESSWERT_REIHENFOLGE, #15).
const gruppen: { titel: string; felder: { key: MesswertKey; label: string; unit: string }[] }[] = [
  { titel: 'Spannungsfrei-Messungen', keys: MESSWERT_REIHENFOLGE.slice(0, 3) },
  { titel: 'Messungen unter Spannung', keys: MESSWERT_REIHENFOLGE.slice(3) },
].map(({ titel, keys }) => ({ titel, felder: keys.map((key) => ({ key, label: FELD_INFO[key].label, unit: FELD_INFO[key].unit })) }))

const keypad = useKeypad()
const ziel = (key: StammKey | MesswertKey, kind: 'stamm' | 'messwert'): KeypadTarget => ({ kind, id: props.stromkreis.id, key }) as KeypadTarget
const keyFuer = (key: StammKey | MesswertKey, kind: 'stamm' | 'messwert') => targetKey(ziel(key, kind))
const istAktiv = (key: StammKey | MesswertKey, kind: 'stamm' | 'messwert') =>
  !!keypad.target.value && targetKey(keypad.target.value) === keyFuer(key, kind)

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
        <StromkreisFeld
          :stromkreis="stromkreis"
          :feld="f"
          :aktiv="f.numeric && istAktiv(f.key as StammKey, 'stamm')"
          :keypad-key="f.numeric ? keyFuer(f.key as StammKey, 'stamm') : undefined"
          @update="emit('update', $event)"
          @open="keypad.open(ziel(f.key as StammKey, 'stamm'))"
        />
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
          :aktiv="istAktiv(f.key, 'messwert')"
          :keypad-key="keyFuer(f.key, 'messwert')"
          @open="keypad.open(ziel(f.key, 'messwert'))"
        />
      </div>
    </section>
    <UFormField label="Bemerkungen">
      <UTextarea
        :model-value="stromkreis.bemerkungen"
        :rows="3"
        class="w-full"
        :aria-label="`Bemerkungen, Stromkreis ${stromkreis.nr}`"
        @update:model-value="emit('update', { bemerkungen: String($event ?? '') })"
      />
    </UFormField>
  </div>
</template>

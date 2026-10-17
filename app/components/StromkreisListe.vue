<script setup lang="ts">
import type { FeldDef } from './StromkreisFeld.vue'
import { GG_ABSCHALTSTROM_HINWEIS, verstoesseDesProtokolls } from '~/utils/grenzwerte'
import { addStromkreis, copyPrevious, moveStromkreis, removeStromkreis, updateStromkreis } from '~/utils/stromkreis'
import type { Stromkreis } from '~/utils/protokoll-store'

const { selected, update } = useProtokolle()

// Card order: Stammdaten -> Spannungsfrei-Messungen -> Messungen unter Spannung.
const gruppen: { titel: string; felder: FeldDef[] }[] = [
  {
    titel: 'Stammdaten',
    felder: [
      { key: 'bezeichnung', label: 'Bezeichnung' },
      { key: 'leitungArtTyp', label: 'Leitung/Kabel Art/Typ' },
      { key: 'leiterAnzahl', label: 'Leiteranzahl', numeric: true },
      { key: 'leiterQuerschnitt', label: 'Querschnitt', unit: 'mm²', numeric: true },
      { key: 'ueberstromschutzArt', label: 'Überstromschutz Art/Charakteristik', select: 'ueberstromschutz' },
      { key: 'ueberstromschutzAndere', label: 'Überstromschutz andere Art' },
      { key: 'ueberstromschutzIn', label: 'Überstromschutz I_N', unit: 'A', numeric: true },
      { key: 'rcdIn', label: 'RCD I_N', unit: 'A', numeric: true },
      { key: 'rcdArt', label: 'RCD Art', select: 'rcd' },
      { key: 'rcdIdn', label: 'RCD I_ΔN', unit: 'mA', numeric: true },
    ],
  },
  {
    titel: 'Spannungsfrei-Messungen',
    felder: [
      { key: 'schutzleiter', label: 'Leitfähigkeit Schutzleiter', unit: 'Ω', numeric: true },
      { key: 'rIso', label: 'R_ISO', unit: 'MΩ', numeric: true },
      { key: 'iLeck', label: 'I_Leck', unit: 'mA', numeric: true },
    ],
  },
  {
    titel: 'Messungen unter Spannung',
    felder: [
      { key: 'ikAnfang', label: 'I_K Anfang', unit: 'A', numeric: true },
      { key: 'ikEnde', label: 'I_K Ende', unit: 'A', numeric: true },
      { key: 'ausloesezeit', label: 'Auslösezeit', unit: 'ms', numeric: true },
    ],
  },
]
const alleFelder = gruppen.flatMap((g) => g.felder)

function setList(list: Stromkreis[]) {
  if (selected.value) update(selected.value.id, { stromkreise: list })
}
const liste = computed(() => selected.value?.stromkreise ?? [])
const verstoesse = computed(() => verstoesseDesProtokolls({ stromkreise: liste.value, netzspannung: '' }))
const verstossText = (n: number) => `${n} ${n === 1 ? 'Verstoss' : 'Verstösse'}`
const nrFeld: FeldDef = { key: 'nr', label: 'Nr.' }

function patch(id: string, p: Partial<Omit<Stromkreis, 'id'>>) { setList(updateStromkreis(liste.value, id, p)) }
function move(id: string, dir: -1 | 1) { setList(moveStromkreis(liste.value, id, dir)) }

const deleteId = ref<string | null>(null)
const deleteOpen = computed({ get: () => deleteId.value !== null, set: (v) => { if (!v) deleteId.value = null } })
function confirmDelete() {
  if (deleteId.value) setList(removeStromkreis(liste.value, deleteId.value))
  deleteId.value = null
}
</script>

<template>
  <section v-if="selected" class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <h2 class="text-xl font-semibold">Stromkreise</h2>
      <UBadge v-if="verstoesse.anzahl" color="error" size="lg" :label="verstossText(verstoesse.anzahl)" />
    </div>
    <UAlert
      v-if="liste.some((s) => s.ueberstromschutzArt === 'gG')"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :description="GG_ABSCHALTSTROM_HINWEIS"
    />

    <!-- Mobile / Tablet hochkant: eine Karte pro Stromkreis -->
    <div class="space-y-4 lg:hidden">
      <UCard v-for="(s, i) in liste" :key="s.id">
        <template #header>
          <div class="flex items-center gap-2">
            <div class="w-20">
              <StromkreisFeld :stromkreis="s" :feld="nrFeld" @update="patch(s.id, $event)" />
            </div>
            <span class="flex-1 font-semibold">Stromkreis</span>
            <UBadge v-if="verstoesse.proStromkreis[s.id]" color="error" :label="verstossText(verstoesse.proStromkreis[s.id]!)" />
            <UButton icon="i-lucide-arrow-up" size="xl" variant="outline" color="neutral" aria-label="Nach oben" :disabled="i === 0" @click="move(s.id, -1)" />
            <UButton icon="i-lucide-arrow-down" size="xl" variant="outline" color="neutral" aria-label="Nach unten" :disabled="i === liste.length - 1" @click="move(s.id, 1)" />
            <UButton icon="i-lucide-trash-2" size="xl" variant="outline" color="error" aria-label="Stromkreis löschen" @click="deleteId = s.id" />
          </div>
        </template>
        <div class="space-y-5">
          <fieldset v-for="g in gruppen" :key="g.titel" class="space-y-3">
            <legend class="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{{ g.titel }}</legend>
            <template v-for="f in g.felder" :key="f.key">
              <UFormField
                v-if="f.key !== 'ueberstromschutzAndere' || s.ueberstromschutzArt === 'andere'"
                :label="f.label + (f.unit ? ` (${f.unit})` : '')"
              >
                <StromkreisFeld :stromkreis="s" :feld="f" @update="patch(s.id, $event)" />
              </UFormField>
            </template>
          </fieldset>
        </div>
      </UCard>
    </div>

    <!-- Tablet quer: Tabelle -->
    <div class="hidden overflow-x-auto lg:block">
      <table class="w-full min-w-[1400px] border-collapse text-sm">
        <thead>
          <tr>
            <th rowspan="2" class="p-1 text-left align-bottom">Nr.</th>
            <th v-for="g in gruppen" :key="g.titel" :colspan="g.felder.length" class="border-b border-default p-1 text-left">{{ g.titel }}</th>
            <th rowspan="2" class="p-1" />
          </tr>
          <tr>
            <th v-for="f in alleFelder" :key="f.key" class="p-1 text-left align-bottom font-medium">
              {{ f.label }}<span v-if="f.unit" class="text-muted"> ({{ f.unit }})</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, i) in liste" :key="s.id" class="border-t border-default">
            <td class="w-16 p-1"><StromkreisFeld :stromkreis="s" :feld="nrFeld" @update="patch(s.id, $event)" /></td>
            <td v-for="f in alleFelder" :key="f.key" class="min-w-24 p-1">
              <StromkreisFeld :stromkreis="s" :feld="f" @update="patch(s.id, $event)" />
            </td>
            <td class="whitespace-nowrap p-1">
              <UButton icon="i-lucide-arrow-up" size="xl" variant="ghost" color="neutral" aria-label="Nach oben" :disabled="i === 0" @click="move(s.id, -1)" />
              <UButton icon="i-lucide-arrow-down" size="xl" variant="ghost" color="neutral" aria-label="Nach unten" :disabled="i === liste.length - 1" @click="move(s.id, 1)" />
              <UButton icon="i-lucide-trash-2" size="xl" variant="ghost" color="error" aria-label="Stromkreis löschen" @click="deleteId = s.id" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="!liste.length" class="text-muted">Noch kein Stromkreis erfasst.</p>

    <div class="flex flex-wrap gap-2">
      <UButton icon="i-lucide-plus" size="xl" label="Stromkreis hinzufügen" @click="setList(addStromkreis(liste))" />
      <UButton icon="i-lucide-copy-plus" size="xl" variant="outline" label="Vorherigen kopieren" :disabled="!liste.length" @click="setList(copyPrevious(liste))" />
    </div>

    <UModal v-model:open="deleteOpen" title="Stromkreis löschen?" description="Der Stromkreis mit allen Messwerten wird unwiderruflich gelöscht.">
      <template #footer>
        <UButton label="Abbrechen" variant="outline" @click="deleteId = null" />
        <UButton label="Löschen" color="error" @click="confirmDelete" />
      </template>
    </UModal>
  </section>
</template>

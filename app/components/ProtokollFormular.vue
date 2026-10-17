<script setup lang="ts">
import {
  AUFTRAGGEBER_ARTEN, AUFTRAGNEHMER_ARTEN, FUNKTIONSPRUEFUNG_ITEMS, SCHUTZ_SYSTEME, SICHTPRUEFUNG_ITEMS,
  setAlleSichtpruefungIo,
} from '~/utils/protokoll-form'
import type { Partei } from '~/utils/protokoll-form'
import { verstoesseDesProtokolls } from '~/utils/grenzwerte'

const { selected, update } = useProtokolle()
const SCHUTZ_ITEMS: string[] = [...SCHUTZ_SYSTEME]
const verstoesse = computed(() =>
  selected.value ? verstoesseDesProtokolls(selected.value) : { anzahl: 0, proStromkreis: {}, netzspannung: null },
)
const verstossText = (n: number) => `${n} ${n === 1 ? 'Verstoss' : 'Verstösse'}`

type Section = 'installation' | 'kontrolle'

function setSection(section: Section, field: string, value: unknown) {
  const p = selected.value
  if (p) update(p.id, { [section]: { ...p[section], [field]: String(value) } })
}
function setPartei(who: 'auftraggeber' | 'auftragnehmer', field: keyof Partei, value: unknown) {
  const p = selected.value
  if (p) update(p.id, { [who]: { ...p[who], [field]: String(value ?? '') } })
}
function setText(field: 'netzspannung' | 'bemerkungen' | 'pruefungNach' | 'schaltgeraetekombination' | 'dokumentation', value: unknown) {
  const p = selected.value
  if (p) update(p.id, { [field]: String(value ?? '') })
}

const installationFelder = [
  ['gebaeudeart', 'Gebäudeart'], ['objektNr', 'Objekt Nr.'], ['instAnzeige', 'Inst.-Anzeige'], ['anlage', 'Anlage'],
  ['stromkunde', 'Stromkunde'], ['stockwerkRaum', 'Stockwerk / Raum'], ['zaehlerNr', 'Zähler Nr.'], ['anlageNr', 'Anlage Nr.'],
] as const
const kontrolleFelder = [
  ['durchgefuehrteKontrolle', 'Durchgeführte Kontrolle'], ['kontrollperiode', 'Kontrollperiode'], ['kontrollumfang', 'Kontrollumfang'],
] as const

function addZeile() {
  const p = selected.value
  if (p) update(p.id, { anlageteile: [...p.anlageteile, { id: crypto.randomUUID(), anlageteil: '', verbraucher: '' }] })
}
function setZeile(id: string, field: 'anlageteil' | 'verbraucher', value: unknown) {
  const p = selected.value
  if (p) update(p.id, { anlageteile: p.anlageteile.map((z) => (z.id === id ? { ...z, [field]: String(value ?? '') } : z)) })
}
function removeZeile(id: string) {
  const p = selected.value
  if (p) update(p.id, { anlageteile: p.anlageteile.filter((z) => z.id !== id) })
}

function setCheck(section: 'sichtpruefung' | 'funktionspruefung', key: string, value: boolean | 'indeterminate') {
  const p = selected.value
  if (p) update(p.id, { [section]: { ...p[section], checks: { ...p[section].checks, [key]: value === true } } })
}
function alleIo(value: boolean | 'indeterminate') {
  const p = selected.value
  if (p) update(p.id, { sichtpruefung: setAlleSichtpruefungIo(p.sichtpruefung, value === true) })
}
function setSichtpruefung(field: 'schutzSystem' | 'erder', value: unknown) {
  const p = selected.value
  if (p) update(p.id, { sichtpruefung: { ...p.sichtpruefung, [field]: String(value ?? '') } })
}

function addMessgeraet() {
  const p = selected.value
  if (p) update(p.id, { messgeraete: [...p.messgeraete, ''] })
}
function setMessgeraet(i: number, value: unknown) {
  const p = selected.value
  if (p) update(p.id, { messgeraete: p.messgeraete.map((m, j) => (j === i ? String(value ?? '') : m)) })
}
function removeMessgeraet(i: number) {
  const p = selected.value
  if (p) update(p.id, { messgeraete: p.messgeraete.filter((_, j) => j !== i) })
}

function setKeineMaengel(value: boolean | 'indeterminate') {
  const p = selected.value
  if (p) update(p.id, { pruefergebnis: { ...p.pruefergebnis, keineMaengel: value === true } })
}

const alleIoChecked = computed(() => !!selected.value && SICHTPRUEFUNG_ITEMS.every((i) => selected.value!.sichtpruefung.checks[i.key]))
</script>

<template>
  <div v-if="selected" class="space-y-4">
    <UCard v-for="[who, titel, arten] in ([['auftraggeber', 'Auftraggeber', AUFTRAGGEBER_ARTEN], ['auftragnehmer', 'Auftragnehmer', AUFTRAGNEHMER_ARTEN]] as const)" :key="who">
      <template #header><h2 class="font-semibold">{{ titel }}</h2></template>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Art" class="sm:col-span-2">
          <USelect
            :model-value="selected[who].art || undefined" :items="(arten as readonly { value: string, label: string }[]).map((a) => ({ ...a }))" placeholder="Bitte wählen" class="w-full"
            @update:model-value="setPartei(who, 'art', $event)"
          />
        </UFormField>
        <UFormField label="Name 1"><UInput :model-value="selected[who].name1" class="w-full" @update:model-value="setPartei(who, 'name1', $event)" /></UFormField>
        <UFormField label="Name 2"><UInput :model-value="selected[who].name2" class="w-full" @update:model-value="setPartei(who, 'name2', $event)" /></UFormField>
        <UFormField label="Strasse"><UInput :model-value="selected[who].strasse" class="w-full" @update:model-value="setPartei(who, 'strasse', $event)" /></UFormField>
        <UFormField label="PLZ / Ort"><UInput :model-value="selected[who].plzOrt" class="w-full" @update:model-value="setPartei(who, 'plzOrt', $event)" /></UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header><h2 class="font-semibold">Installation</h2></template>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField v-for="[key, label] in installationFelder" :key="key" :label="label">
          <UInput :model-value="selected.installation[key]" class="w-full" @update:model-value="setSection('installation', key, $event)" />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header><h2 class="font-semibold">Kontrolle</h2></template>
      <div class="grid gap-4 sm:grid-cols-3">
        <UFormField v-for="[key, label] in kontrolleFelder" :key="key" :label="label">
          <UInput :model-value="selected.kontrolle[key]" class="w-full" @update:model-value="setSection('kontrolle', key, $event)" />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header><h2 class="font-semibold">Anlage / Anlageteil und Verbraucher</h2></template>
      <div class="space-y-3">
        <div v-for="z in selected.anlageteile" :key="z.id" class="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <UFormField label="Anlage / Anlageteil"><UInput :model-value="z.anlageteil" class="w-full" @update:model-value="setZeile(z.id, 'anlageteil', $event)" /></UFormField>
          <UFormField label="Verbraucher"><UInput :model-value="z.verbraucher" class="w-full" @update:model-value="setZeile(z.id, 'verbraucher', $event)" /></UFormField>
          <UButton icon="i-lucide-trash-2" color="neutral" variant="ghost" aria-label="Zeile löschen" @click="removeZeile(z.id)" />
        </div>
        <UButton icon="i-lucide-plus" variant="soft" @click="addZeile">Zeile hinzufügen</UButton>
      </div>
    </UCard>

    <UCard>
      <template #header><h2 class="font-semibold">Sichtprüfung</h2></template>
      <div class="space-y-3">
        <UCheckbox :model-value="alleIoChecked" label="Alle i.O." @update:model-value="alleIo" />
        <USeparator />
        <UCheckbox
          v-for="i in SICHTPRUEFUNG_ITEMS" :key="i.key" :model-value="selected.sichtpruefung.checks[i.key]" :label="i.label"
          @update:model-value="setCheck('sichtpruefung', i.key, $event)"
        />
        <div class="grid gap-4 pt-2 sm:grid-cols-2">
          <UFormField label="Schutz-System">
            <USelect
              :model-value="selected.sichtpruefung.schutzSystem || undefined" :items="SCHUTZ_ITEMS" placeholder="Bitte wählen" class="w-full"
              @update:model-value="setSichtpruefung('schutzSystem', $event)"
            />
          </UFormField>
          <UFormField label="Erder"><UInput :model-value="selected.sichtpruefung.erder" class="w-full" @update:model-value="setSichtpruefung('erder', $event)" /></UFormField>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header><h2 class="font-semibold">Funktionsprüfung</h2></template>
      <div class="space-y-3">
        <UCheckbox
          v-for="i in FUNKTIONSPRUEFUNG_ITEMS" :key="i.key" :model-value="selected.funktionspruefung.checks[i.key]" :label="i.label"
          @update:model-value="setCheck('funktionspruefung', i.key, $event)"
        />
        <UFormField label="Gemessene Netzspannung" class="pt-2">
          <UInput :model-value="selected.netzspannung" inputmode="decimal" placeholder="z. B. 230 V" class="w-full" :color="verstoesse.netzspannung ? 'error' : undefined" :highlight="!!verstoesse.netzspannung" @update:model-value="setText('netzspannung', $event)" />
          <p v-if="verstoesse.netzspannung" class="mt-1 text-sm font-medium text-error" role="status">{{ verstoesse.netzspannung }}</p>
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header><h2 class="font-semibold">Bemerkungen, Messgeräte, Prüfung</h2></template>
      <div class="space-y-4">
        <UFormField label="Bemerkungen">
          <UTextarea :model-value="selected.bemerkungen" :rows="3" class="w-full" @update:model-value="setText('bemerkungen', $event)" />
        </UFormField>
        <div class="space-y-2">
          <p class="text-sm font-medium">Messgeräte</p>
          <div v-for="(m, i) in selected.messgeraete" :key="i" class="flex gap-2">
            <UInput :model-value="m" class="w-full" aria-label="Messgerät" @update:model-value="setMessgeraet(i, $event)" />
            <UButton icon="i-lucide-trash-2" color="neutral" variant="ghost" aria-label="Messgerät entfernen" @click="removeMessgeraet(i)" />
          </div>
          <UButton icon="i-lucide-plus" variant="soft" @click="addMessgeraet">Messgerät hinzufügen</UButton>
        </div>
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
      <template #header><h2 class="font-semibold">Prüfergebnis</h2></template>
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
  </div>
</template>

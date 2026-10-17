<script setup lang="ts">
import { AUFTRAGGEBER_ARTEN, AUFTRAGNEHMER_ARTEN } from '~/utils/protokoll-form'
import type { Partei } from '~/utils/protokoll-form'
import type { Company } from '~/utils/protokoll-store'
import { planFill, suggest } from '~/utils/stammdaten'

const { selected, update, companies, syncStammdaten, isLocked } = useProtokolle()
const fokus = ref<string | null>(null)
const companyVorschlaege = (who: 'auftraggeber' | 'auftragnehmer') =>
  fokus.value === who && selected.value ? suggest(companies.value, selected.value[who].name1) : []

type Seite = 'auftraggeber' | 'auftragnehmer'
const seitenTitel = { auftraggeber: 'Auftraggeber', auftragnehmer: 'Auftragnehmer' } as const
const ersetzen = ref<{ who: Seite; company: Company } | null>(null)
const ersetzenOpen = computed({ get: () => ersetzen.value !== null, set: (v) => { if (!v) ersetzen.value = null } })

function applyCompany(who: Seite, c: Company) {
  const p = selected.value
  if (!p) return
  update(p.id, { [who]: { ...p[who], ...planFill(p[who], c).patch } })
}
/** Fills Name 1/Name 2/Strasse/PLZ-Ort from the picked company; asks (modal) before replacing different existing values. */
function pickCompany(who: Seite, c: Company) {
  const p = selected.value
  if (!p) return
  fokus.value = null
  if (planFill(p[who], c).conflict) ersetzen.value = { who, company: c }
  else applyCompany(who, c)
}
function confirmErsetzen() {
  if (ersetzen.value) applyCompany(ersetzen.value.who, ersetzen.value.company)
  ersetzen.value = null
}

type Section = 'installation' | 'kontrolle'

function setSection(section: Section, field: string, value: unknown) {
  const p = selected.value
  if (p) update(p.id, { [section]: { ...p[section], [field]: String(value) } })
}
function setPartei(who: 'auftraggeber' | 'auftragnehmer', field: keyof Partei, value: unknown) {
  const p = selected.value
  if (p) update(p.id, { [who]: { ...p[who], [field]: String(value ?? '') } })
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
</script>

<template>
  <fieldset v-if="selected" :disabled="isLocked" class="min-w-0 space-y-4" @focusout="syncStammdaten">
    <ProtokollKopf />
  <UCard v-for="[who, titel, arten] in ([['auftraggeber', 'Auftraggeber', AUFTRAGGEBER_ARTEN], ['auftragnehmer', 'Auftragnehmer', AUFTRAGNEHMER_ARTEN]] as const)" :key="who">
    <template #header><h2 class="text-xl font-bold">{{ titel }}</h2></template>
    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField label="Art" class="sm:col-span-2">
        <USelect
          :model-value="selected[who].art || undefined" :items="(arten as readonly { value: string, label: string }[]).map((a) => ({ ...a }))" placeholder="Bitte wählen" class="w-full"
          @update:model-value="setPartei(who, 'art', $event)"
        />
      </UFormField>
      <UFormField label="Name 1" class="relative">
        <UInput
          :model-value="selected[who].name1" class="w-full" autocomplete="off"
          @focus="fokus = who" @blur="fokus = null" @update:model-value="setPartei(who, 'name1', $event)"
        />
        <ul v-if="companyVorschlaege(who).length" class="absolute z-10 mt-1 w-full overflow-hidden rounded-sm border-2 border-ink bg-white shadow-lg">
          <li v-for="c in companyVorschlaege(who)" :key="c.name">
            <button type="button" class="w-full px-3 py-2.5 text-left text-base font-medium hover:bg-elevated" @mousedown.prevent="pickCompany(who, c)">
              {{ c.name }}<span class="block text-sm font-normal text-muted">{{ [c.name2, c.strasse, c.plzOrt].filter(Boolean).join(', ') }}</span>
            </button>
          </li>
        </ul>
      </UFormField>
      <UFormField label="Name 2"><UInput :model-value="selected[who].name2" class="w-full" @update:model-value="setPartei(who, 'name2', $event)" /></UFormField>
      <UFormField label="Strasse"><UInput :model-value="selected[who].strasse" class="w-full" @update:model-value="setPartei(who, 'strasse', $event)" /></UFormField>
      <UFormField label="PLZ / Ort"><UInput :model-value="selected[who].plzOrt" class="w-full" @update:model-value="setPartei(who, 'plzOrt', $event)" /></UFormField>
    </div>
  </UCard>

  <UCard>
    <template #header><h2 class="text-xl font-bold">Installation</h2></template>
    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField v-for="[key, label] in installationFelder" :key="key" :label="label">
        <UInput :model-value="selected.installation[key]" class="w-full" @update:model-value="setSection('installation', key, $event)" />
      </UFormField>
    </div>
  </UCard>

  <UCard>
    <template #header><h2 class="text-xl font-bold">Kontrolle</h2></template>
    <div class="grid gap-4 sm:grid-cols-3">
      <UFormField v-for="[key, label] in kontrolleFelder" :key="key" :label="label">
        <UInput :model-value="selected.kontrolle[key]" class="w-full" @update:model-value="setSection('kontrolle', key, $event)" />
      </UFormField>
    </div>
  </UCard>

  <UCard>
    <template #header><h2 class="text-xl font-bold">Anlage / Anlageteil und Verbraucher</h2></template>
    <div class="space-y-3">
      <div v-for="z in selected.anlageteile" :key="z.id" class="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <UFormField label="Anlage / Anlageteil"><UInput :model-value="z.anlageteil" class="w-full" @update:model-value="setZeile(z.id, 'anlageteil', $event)" /></UFormField>
        <UFormField label="Verbraucher"><UInput :model-value="z.verbraucher" class="w-full" @update:model-value="setZeile(z.id, 'verbraucher', $event)" /></UFormField>
        <UButton icon="i-lucide-trash-2" color="neutral" variant="ghost" aria-label="Zeile löschen" @click="removeZeile(z.id)" />
      </div>
      <UButton icon="i-lucide-plus" variant="soft" @click="addZeile">Zeile hinzufügen</UButton>
    </div>
  </UCard>

  <UModal v-model:open="ersetzenOpen" :title="`Angaben bei ${ersetzen ? seitenTitel[ersetzen.who] : ''} ersetzen?`">
    <template #body>
      <p>Bestehende Angaben werden durch die gespeicherten Angaben von «{{ ersetzen?.company.name }}» ersetzt.</p>
    </template>
    <template #footer>
      <UButton color="neutral" variant="outline" label="Abbrechen" @click="ersetzen = null" />
      <UButton label="Ersetzen" @click="confirmErsetzen" />
    </template>
  </UModal>
  </fieldset>
</template>

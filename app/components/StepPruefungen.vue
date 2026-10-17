<script setup lang="ts">
import { FUNKTIONSPRUEFUNG_ITEMS, SCHUTZ_SYSTEME, SICHTPRUEFUNG_ITEMS, setAlleSichtpruefungIo } from '~/utils/protokoll-form'
import { verstoesseDesProtokolls } from '~/utils/grenzwerte'
import { suggest } from '~/utils/stammdaten'

const { selected, update, messgeraete, syncStammdaten, isLocked } = useProtokolle()
const fokus = ref<string | null>(null)
const geraetVorschlaege = (i: number) =>
  fokus.value === `gerat${i}` && selected.value ? suggest(messgeraete.value, selected.value.messgeraete[i] ?? '') : []

function pickMessgeraet(i: number, name: string) {
  setMessgeraet(i, name)
  fokus.value = null
}
const SCHUTZ_ITEMS: string[] = [...SCHUTZ_SYSTEME]
const verstoesse = computed(() => (selected.value ? verstoesseDesProtokolls(selected.value) : { netzspannung: null }))

function setNetzspannung(value: unknown) {
  const p = selected.value
  if (p) update(p.id, { netzspannung: String(value ?? '') })
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

const alleIoChecked = computed(() => !!selected.value && SICHTPRUEFUNG_ITEMS.every((i) => selected.value!.sichtpruefung.checks[i.key]))
</script>

<template>
  <fieldset v-if="selected" :disabled="isLocked" class="min-w-0 space-y-4" @focusout="syncStammdaten">
  <UCard>
    <template #header><h2 class="text-xl font-bold">Sichtprüfung</h2></template>
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
    <template #header><h2 class="text-xl font-bold">Funktionsprüfung</h2></template>
    <div class="space-y-3">
      <UCheckbox
        v-for="i in FUNKTIONSPRUEFUNG_ITEMS" :key="i.key" :model-value="selected.funktionspruefung.checks[i.key]" :label="i.label"
        @update:model-value="setCheck('funktionspruefung', i.key, $event)"
      />
      <UFormField label="Gemessene Netzspannung" class="pt-2">
        <UInput :model-value="selected.netzspannung" placeholder="z. B. 230 V oder 230/400 V" class="w-full" :color="verstoesse.netzspannung ? 'error' : undefined" :highlight="!!verstoesse.netzspannung" @update:model-value="setNetzspannung($event)" />
        <p v-if="verstoesse.netzspannung" class="mt-1 text-base font-semibold text-error" role="status">{{ verstoesse.netzspannung }}</p>
      </UFormField>
    </div>
  </UCard>

  <UCard>
    <template #header><h2 class="text-xl font-bold">Messgeräte</h2></template>
    <div class="space-y-2">
      <div v-for="(m, i) in selected.messgeraete" :key="i" class="relative flex gap-2">
        <UInput
          :model-value="m" class="w-full" aria-label="Messgerät" autocomplete="off"
          @focus="fokus = `gerat${i}`" @blur="fokus = null" @update:model-value="setMessgeraet(i, $event)"
        />
        <ul v-if="geraetVorschlaege(i).length" class="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-sm border-2 border-ink bg-white shadow-lg">
          <li v-for="g in geraetVorschlaege(i)" :key="g.name">
            <button type="button" class="w-full px-3 py-2.5 text-left text-base font-medium hover:bg-elevated" @mousedown.prevent="pickMessgeraet(i, g.name)">{{ g.name }}</button>
          </li>
        </ul>
        <UButton icon="i-lucide-trash-2" color="neutral" variant="ghost" aria-label="Messgerät entfernen" @click="removeMessgeraet(i)" />
      </div>
      <UButton icon="i-lucide-plus" variant="soft" @click="addMessgeraet">Messgerät hinzufügen</UButton>
    </div>
  </UCard>
  </fieldset>
</template>

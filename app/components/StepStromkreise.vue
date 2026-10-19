<script setup lang="ts">
import { GG_ABSCHALTSTROM_HINWEIS, pruefeNetzspannung, verstoesseDerStromkreise } from '~/utils/grenzwerte'
import type { Stromkreis } from '~/utils/protokoll-store'
import { addStromkreis, clampIndex, copyPrevious, moveStromkreis, parseStromkreisNr, removeStromkreis, updateStromkreis } from '~/utils/stromkreis'
import { stepPath, stromkreisPath } from '~/utils/steps'

// `nr` = 1-based route param; absent on /stromkreise (redirects to the first Stromkreis).
const props = defineProps<{ nr?: string }>()
const { selected, update, isLocked } = useProtokolle()
const keypad = useKeypad()
const netzPruefung = computed(() => pruefeNetzspannung(selected.value?.netzspannung ?? ''))

const id = computed(() => selected.value?.id ?? '')
const liste = computed(() => selected.value?.stromkreise ?? [])
const index = computed(() => clampIndex(parseStromkreisNr(props.nr), liste.value.length))
const aktuell = computed(() => (index.value === null ? undefined : liste.value[index.value]))
const verstoesse = computed(() => verstoesseDerStromkreise(liste.value))
const verstossText = (n: number) => `${n} ${n === 1 ? 'Verstoss' : 'Verstösse'}`
const hatGG = computed(() => liste.value.some((s) => s.ueberstromschutzArt === 'gG'))

// Unknown / out-of-range / missing nr -> canonical route (or the empty state).
watchEffect(() => {
  if (!selected.value) return
  if (index.value === null) {
    if (props.nr !== undefined) navigateTo(stepPath(id.value, 'stromkreise'), { replace: true })
  } else if (props.nr !== String(index.value + 1)) navigateTo(stromkreisPath(id.value, index.value + 1), { replace: true })
})

const gehZu = (i: number) => navigateTo(stromkreisPath(id.value, i + 1))
function setList(list: Stromkreis[]) {
  if (selected.value) update(selected.value.id, { stromkreise: list })
}
function hinzufuegen(kopie = false) {
  setList(kopie ? copyPrevious(liste.value) : addStromkreis(liste.value))
  gehZu(liste.value.length) // new one is appended: its index is the old length
}
function verschieben(dir: -1 | 1) {
  if (!aktuell.value || index.value === null) return
  setList(moveStromkreis(liste.value, aktuell.value.id, dir))
  if (liste.value[index.value + dir]) gehZu(index.value + dir) // stay on the moved Stromkreis
}

const deleteOpen = ref(false)
function confirmDelete() {
  deleteOpen.value = false
  if (!aktuell.value || index.value === null) return
  setList(removeStromkreis(liste.value, aktuell.value.id))
  // the next one slides into this index; after the last, step back
  const rest = liste.value.length
  if (rest) gehZu(Math.min(index.value, rest - 1))
  else navigateTo(stepPath(id.value, 'stromkreise'), { replace: true })
}

const menu = computed(() => [[
  { label: 'Vorherigen kopieren', icon: 'i-lucide-copy-plus', onSelect: () => hinzufuegen(true) },
  { label: 'Nach oben verschieben', icon: 'i-lucide-arrow-up', disabled: !index.value, onSelect: () => verschieben(-1) },
  { label: 'Nach unten verschieben', icon: 'i-lucide-arrow-down', disabled: index.value === liste.value.length - 1, onSelect: () => verschieben(1) },
], [
  { label: 'Löschen', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => { deleteOpen.value = true } },
]])

const chipClass = (aktiv: boolean, verstoss: boolean) => [
  'relative flex size-11 shrink-0 items-center justify-center rounded-sm border-2 border-ink text-base font-bold',
  aktiv ? 'bg-tl-blue-fill ring-2 ring-inset ring-ink' : 'bg-white hover:bg-elevated',
  verstoss ? 'border-tl-red' : '',
]
</script>

<template>
  <section v-if="selected" class="space-y-3">
    <div class="flex flex-wrap items-center gap-3">
      <h2 class="text-2xl font-bold">Stromkreise</h2>
      <UBadge v-if="verstoesse.anzahl" color="error" size="lg" :label="verstossText(verstoesse.anzahl)" />
    </div>
    <UAlert v-if="hatGG" color="warning" variant="subtle" icon="i-lucide-triangle-alert" :description="GG_ABSCHALTSTROM_HINWEIS" />

    <fieldset :disabled="isLocked" class="min-w-0">
      <MesswertKarte
        class="max-w-xs"
        label="Netzspannung L–N"
        unit="V"
        :model-value="selected.netzspannung"
        :pruefung="netzPruefung"
        keypad-key="netzspannung"
        :aktiv="keypad.target.value?.kind === 'netz'"
        @open="keypad.open({ kind: 'netz' })"
      />
    </fieldset>

    <!-- Navigation stays usable on a locked Protokoll; only editing is disabled -->
    <div class="flex items-center gap-1 overflow-x-auto py-1" role="tablist" aria-label="Stromkreise">
      <NuxtLink
        v-for="(s, i) in liste"
        :key="s.id"
        :to="stromkreisPath(id, i + 1)"
        role="tab"
        :aria-selected="i === index"
        :aria-label="`Stromkreis ${s.nr || i + 1}${verstoesse.proStromkreis[s.id] ? ', Verstoss' : ''}`"
        :class="chipClass(i === index, !!verstoesse.proStromkreis[s.id])"
      >
        {{ s.nr || i + 1 }}
        <span v-if="verstoesse.proStromkreis[s.id]" class="absolute -top-1 -right-1 size-3 rounded-full border-2 border-white bg-tl-red" />
      </NuxtLink>
      <UButton v-if="!isLocked" icon="i-lucide-plus" class="size-11 shrink-0 justify-center" aria-label="Stromkreis hinzufügen" @click="hinzufuegen()" />
    </div>

    <template v-if="aktuell && index !== null">
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-chevron-left" color="neutral" variant="outline" label="Vorheriger" :to="index > 0 ? stromkreisPath(id, index) : undefined" :disabled="index === 0" />
        <UButton trailing-icon="i-lucide-chevron-right" color="neutral" variant="outline" label="Nächster" :to="index < liste.length - 1 ? stromkreisPath(id, index + 2) : undefined" :disabled="index === liste.length - 1" />
        <span class="flex-1" />
        <fieldset :disabled="isLocked" class="shrink-0">
          <UDropdownMenu :items="menu" :content="{ align: 'end' }">
            <UButton icon="i-lucide-ellipsis" color="neutral" variant="outline" aria-label="Weitere Aktionen" />
          </UDropdownMenu>
        </fieldset>
      </div>

      <fieldset :disabled="isLocked" class="min-w-0">
        <StromkreisDetail :key="aktuell.id" :stromkreis="aktuell" @update="setList(updateStromkreis(liste, aktuell.id, $event))" />
      </fieldset>
    </template>

    <div v-else-if="!liste.length" class="space-y-3">
      <p class="text-muted">Noch kein Stromkreis erfasst.</p>
      <fieldset :disabled="isLocked" class="min-w-0">
        <UButton icon="i-lucide-plus" size="xl" label="Stromkreis hinzufügen" @click="hinzufuegen()" />
      </fieldset>
    </div>

    <UModal v-model:open="deleteOpen" title="Stromkreis löschen?" description="Der Stromkreis mit allen Messwerten wird unwiderruflich gelöscht.">
      <template #footer>
        <UButton label="Abbrechen" variant="outline" @click="deleteOpen = false" />
        <UButton label="Löschen" color="error" @click="confirmDelete" />
      </template>
    </UModal>
  </section>
</template>

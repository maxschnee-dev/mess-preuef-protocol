<script setup lang="ts">
import { formatGeaendert, protokollLabel } from '~/utils/protokoll-store'
import type { Protokoll } from '~/utils/protokoll-store'
import { stepPath } from '~/utils/steps'

const { protokolle, create, duplicate, remove } = useProtokolle()
const loeschen = ref<Protokoll | null>(null)
const loeschenOpen = computed({ get: () => loeschen.value !== null, set: (v) => { if (!v) loeschen.value = null } })

const oeffnen = (id: string) => navigateTo(stepPath(id, 'kopf'))
function dupliziere(id: string) {
  const copy = duplicate(id)
  if (copy) oeffnen(copy.id)
}
function confirmRemove() {
  if (loeschen.value) remove(loeschen.value.id)
  loeschen.value = null
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-xl font-bold">Protokolle</h2>
        <UButton icon="i-lucide-plus" label="Neu" @click="oeffnen(create().id)" />
      </div>
    </template>
    <p v-if="!protokolle.length" class="text-muted">Noch kein Protokoll vorhanden. Mit «Neu» ein Protokoll anlegen.</p>
    <ul v-else class="divide-y-2 divide-ink">
      <li v-for="p in protokolle" :key="p.id" class="flex items-center gap-1 py-1">
        <button type="button" class="min-h-11 min-w-0 flex-1 text-left hover:underline" @click="oeffnen(p.id)">
          <span class="block truncate font-medium">{{ protokollLabel(p) }}</span>
          <span class="block text-sm text-muted">Zuletzt bearbeitet {{ formatGeaendert(p.geaendert) }}</span>
        </button>
        <UButton icon="i-lucide-copy" color="neutral" variant="ghost" aria-label="Duplizieren" @click="dupliziere(p.id)" />
        <UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="Löschen" @click="loeschen = p" />
      </li>
    </ul>

    <UModal v-model:open="loeschenOpen" title="Protokoll löschen?" :description="loeschen ? protokollLabel(loeschen) + ' wird unwiderruflich gelöscht.' : ''">
      <template #footer>
        <UButton label="Abbrechen" variant="outline" @click="loeschen = null" />
        <UButton label="Löschen" color="error" @click="confirmRemove" />
      </template>
    </UModal>
  </UCard>
</template>

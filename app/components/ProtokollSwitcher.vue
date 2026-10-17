<script setup lang="ts">
import { protokollLabel } from '~/utils/protokoll-store'

const { protokolle, selected, selectedId, create, select, duplicate, remove } = useProtokolle()
const items = computed(() => protokolle.value.map((p) => ({ label: protokollLabel(p), value: p.id })))
const confirmOpen = ref(false)

function confirmRemove() {
  if (selectedId.value) remove(selectedId.value)
  confirmOpen.value = false
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <USelect
      :model-value="selectedId ?? undefined"
      :items="items"
      placeholder="Kein Protokoll"
      class="min-w-64 flex-1"
      aria-label="Protokoll wählen"
      @update:model-value="select"
    />
    <UButton icon="i-lucide-plus" label="Neu" @click="create()" />
    <UButton icon="i-lucide-copy" label="Duplizieren" variant="outline" :disabled="!selected" @click="selected && duplicate(selected.id)" />
    <UButton icon="i-lucide-trash-2" label="Löschen" color="error" variant="outline" :disabled="!selected" @click="confirmOpen = true" />

    <UModal v-model:open="confirmOpen" title="Protokoll löschen?" :description="selected ? protokollLabel(selected) + ' wird unwiderruflich gelöscht.' : ''">
      <template #footer>
        <UButton label="Abbrechen" variant="outline" @click="confirmOpen = false" />
        <UButton label="Löschen" color="error" @click="confirmRemove" />
      </template>
    </UModal>
  </div>
</template>

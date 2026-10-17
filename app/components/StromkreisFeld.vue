<script setup lang="ts">
import type { Stromkreis } from '~/utils/protokoll-store'
import { RCD_ARTEN, UEBERSTROMSCHUTZ_ARTEN } from '~/utils/stromkreis'

export type FeldKey = Exclude<keyof Stromkreis, 'id'>
export interface FeldDef {
  key: FeldKey
  label: string
  unit?: string
  numeric?: boolean
  select?: 'ueberstromschutz' | 'rcd'
}

/** One Stammdaten field of a Stromkreis (Messwerte are MesswertKarte). */
const props = defineProps<{ stromkreis: Stromkreis; feld: FeldDef }>()
const emit = defineEmits<{ update: [patch: Partial<Omit<Stromkreis, 'id'>>] }>()

// Reka's SelectItem rejects '' as a value, so "nicht gewählt" gets a sentinel that maps to '' in the store.
const KEINE = '__keine__'
const items = computed(() => {
  const arten = props.feld.select === 'rcd' ? RCD_ARTEN : UEBERSTROMSCHUTZ_ARTEN
  return [{ label: '–', value: KEINE }, ...arten]
})
const value = computed(() => props.stromkreis[props.feld.key] as string)
const selectValue = computed(() => value.value || KEINE)
const ariaLabel = computed(() => `${props.feld.label}${props.feld.unit ? ` (${props.feld.unit})` : ''}, Stromkreis ${props.stromkreis.nr}`)

function set(v: unknown) {
  const text = String(v ?? '')
  emit('update', { [props.feld.key]: text === KEINE ? '' : text })
}
</script>

<template>
  <USelect v-if="feld.select" :model-value="selectValue" :items="items" class="w-full" :aria-label="ariaLabel" @update:model-value="set" />
  <UInput
    v-else
    :model-value="value"
    class="w-full"
    :inputmode="feld.numeric ? 'decimal' : 'text'"
    :aria-label="ariaLabel"
    @update:model-value="set"
  />
</template>

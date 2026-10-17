<script setup lang="ts">
import type { Stromkreis } from '~/utils/protokoll-store'
import type { Pruefung } from '~/utils/grenzwerte'
import { RCD_ARTEN, UEBERSTROMSCHUTZ_ARTEN } from '~/utils/stromkreis'

export type FeldKey = Exclude<keyof Stromkreis, 'id'>
export interface FeldDef {
  key: FeldKey
  label: string
  unit?: string
  numeric?: boolean
  select?: 'ueberstromschutz' | 'rcd'
}

const props = defineProps<{ stromkreis: Stromkreis; feld: FeldDef; pruefung?: Pruefung }>()
const emit = defineEmits<{ update: [patch: Partial<Omit<Stromkreis, 'id'>>] }>()

// Reka's SelectItem rejects '' as a value, so "nicht gewählt" gets a sentinel that maps to '' in the store.
const KEINE = '__keine__'
const items = computed(() => {
  const arten = props.feld.select === 'rcd' ? RCD_ARTEN : UEBERSTROMSCHUTZ_ARTEN
  return [{ label: '–', value: KEINE }, ...arten]
})
/** Required boundary when this field is a Verstoss (ADR-0003), else undefined. */
const verstoss = computed(() => (props.pruefung && !props.pruefung.ok ? props.pruefung.boundary : null))
/** Neutral hint (e.g. gG without table value), not a Verstoss. */
const hinweis = computed(() => (props.pruefung?.nichtGeprueft ? props.pruefung.boundary : null))
const value = computed(() => props.stromkreis[props.feld.key] as string)
const selectValue = computed(() => value.value || KEINE)
const ariaLabel = computed(() => `${props.feld.label}${props.feld.unit ? ` (${props.feld.unit})` : ''}, Stromkreis ${props.stromkreis.nr}`)

function set(v: unknown) {
  const text = String(v ?? '')
  emit('update', { [props.feld.key]: text === KEINE ? '' : text })
}
</script>

<template>
  <div class="w-full">
  <USelect
    v-if="feld.select"
    :model-value="selectValue"
    :items="items"
    size="xl"
    class="w-full"
    :aria-label="ariaLabel"
    @update:model-value="set"
  />
  <UInput
    v-else
    :model-value="value"
    size="xl"
    class="w-full"
    :inputmode="feld.numeric ? 'decimal' : 'text'"
    :aria-label="ariaLabel"
    :color="verstoss ? 'error' : undefined"
    :highlight="!!verstoss"
    @update:model-value="set"
  >
    <template v-if="feld.unit" #trailing>
      <span class="text-sm font-semibold text-muted">{{ feld.unit }}</span>
    </template>
  </UInput>
  <p v-if="verstoss" class="mt-1 text-base font-semibold text-error" role="status">{{ verstoss }}</p>
  <p v-else-if="hinweis" class="mt-1 text-base text-muted" role="status">{{ hinweis }}</p>
  </div>
</template>

<script setup lang="ts">
import type { Pruefung } from '~/utils/grenzwerte'

const props = defineProps<{ label: string; unit: string; modelValue: string; pruefung?: Pruefung; ariaLabel?: string; aktiv?: boolean; keypadKey?: string }>()
const emit = defineEmits<{
  /** The card was tapped: open the keypad for this Messwert. */
  open: []
}>()

/** Required boundary when this Messwert is a Verstoss (ADR-0003), else null. */
const verstoss = computed(() => (props.pruefung && !props.pruefung.ok ? props.pruefung.boundary : null))
/** Neutral hint (e.g. gG without table value), not a Verstoss. */
const hinweis = computed(() => (props.pruefung?.nichtGeprueft ? props.pruefung.boundary : null))
</script>

<template>
  <!-- A <button>: inside a disabled <fieldset> (locked Protokoll) it cannot be tapped, so the keypad never opens. -->
  <button
    type="button"
    :data-keypad="keypadKey"
    :aria-label="`${ariaLabel ?? label}: ${modelValue ? `${modelValue} ${unit}` : 'leer'}`"
    class="flex min-h-24 w-full cursor-pointer flex-col justify-between gap-0.5 rounded-sm border-[3px] p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:cursor-default"
    :class="[verstoss ? 'border-tl-red bg-tl-red-fill' : 'border-ink bg-white', aktiv ? 'ring-[3px] ring-ink ring-offset-2' : '']"
    @click="emit('open')"
  >
    <span class="text-sm font-bold leading-tight">{{ label }}</span>
    <span class="flex items-baseline gap-1">
      <span class="min-w-0 truncate text-2xl font-bold" :class="modelValue ? '' : 'text-muted'">{{ modelValue || '–' }}</span>
      <span v-if="modelValue" class="shrink-0 text-sm font-semibold text-muted">{{ unit }}</span>
    </span>
    <span v-if="verstoss" class="text-sm font-semibold leading-tight" role="status">{{ verstoss }}</span>
    <span v-else-if="hinweis" class="text-sm leading-tight text-muted" role="status">{{ hinweis }}</span>
  </button>
</template>

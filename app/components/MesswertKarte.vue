<script setup lang="ts">
import type { Pruefung } from '~/utils/grenzwerte'

const props = defineProps<{ label: string; unit: string; modelValue: string; pruefung?: Pruefung; ariaLabel?: string }>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  /** The card was tapped: "open the editor for this Messwert". Keypad seam (#15): the parent opens the sheet here. */
  open: []
}>()

/** Required boundary when this Messwert is a Verstoss (ADR-0003), else null. */
const verstoss = computed(() => (props.pruefung && !props.pruefung.ok ? props.pruefung.boundary : null))
/** Neutral hint (e.g. gG without table value), not a Verstoss. */
const hinweis = computed(() => (props.pruefung?.nichtGeprueft ? props.pruefung.boundary : null))
</script>

<template>
  <!-- A <label>, so a tap anywhere on the card focuses the inline input. For the keypad (#15) swap the <input> for plain text and handle `open`. -->
  <label
    class="flex min-h-24 cursor-text flex-col justify-between gap-0.5 rounded-sm border-[3px] p-2 focus-within:ring-2 focus-within:ring-ink"
    :class="verstoss ? 'border-tl-red bg-tl-red-fill' : 'border-ink bg-white'"
    @click="emit('open')"
  >
    <span class="text-sm font-bold leading-tight">{{ label }}</span>
    <span class="flex items-baseline gap-1">
      <input
        :value="modelValue"
        inputmode="decimal"
        placeholder="–"
        :aria-label="ariaLabel ?? label"
        class="w-full min-w-0 bg-transparent text-2xl font-bold outline-none placeholder:text-muted disabled:cursor-default"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
      <span class="shrink-0 text-sm font-semibold text-muted">{{ unit }}</span>
    </span>
    <span v-if="verstoss" class="text-sm font-semibold leading-tight" role="status">{{ verstoss }}</span>
    <span v-else-if="hinweis" class="text-sm leading-tight text-muted" role="status">{{ hinweis }}</span>
  </label>
</template>

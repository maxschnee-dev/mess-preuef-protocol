<script setup lang="ts">
import { STEPS, stepPath } from '~/utils/steps'

defineProps<{ protokollId: string }>()
const route = useRoute()
const aktiv = computed(() => route.path.split('/').filter(Boolean).pop())
const linkClass = (active: boolean) => [
  'flex min-h-11 items-center rounded-md px-2.5 text-sm whitespace-nowrap',
  active ? 'bg-primary font-semibold text-inverted' : 'hover:bg-elevated',
]
</script>

<template>
  <nav aria-label="Schritte" class="sticky top-0 z-20 -mx-4 overflow-x-auto border-b border-default bg-default px-4 sm:mx-0 sm:rounded-md sm:border">
    <ol class="flex items-center gap-0.5 py-1">
      <li class="flex items-center gap-0.5">
        <NuxtLink to="/" :class="linkClass(false)">Protokolle</NuxtLink>
        <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-muted" />
      </li>
      <li v-for="(s, i) in STEPS" :key="s.key" class="flex items-center gap-0.5">
        <NuxtLink :to="stepPath(protokollId, s.key)" :class="linkClass(aktiv === s.key)" :aria-current="aktiv === s.key ? 'step' : undefined">{{ s.label }}</NuxtLink>
        <UIcon v-if="i < STEPS.length - 1" name="i-lucide-chevron-right" class="size-4 shrink-0 text-muted" />
      </li>
    </ol>
  </nav>
</template>

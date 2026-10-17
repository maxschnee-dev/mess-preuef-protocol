<script setup lang="ts">
import { isStepKey, neighbours, stepPath } from '~/utils/steps'

defineProps<{ protokollId: string }>()
const route = useRoute()
const aktiv = computed(() => route.path.split('/').filter(Boolean).pop())
const nb = computed(() => (isStepKey(aktiv.value) ? neighbours(aktiv.value) : { prev: null, next: null }))
</script>

<template>
  <div class="flex justify-between gap-2 pb-2">
    <UButton icon="i-lucide-arrow-left" color="neutral" variant="outline" label="Zurück" :to="nb.prev ? stepPath(protokollId, nb.prev) : '/'" />
    <UButton v-if="nb.next" trailing-icon="i-lucide-arrow-right" label="Weiter" :to="stepPath(protokollId, nb.next)" />
  </div>
</template>

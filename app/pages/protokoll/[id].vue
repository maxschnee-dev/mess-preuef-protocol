<script setup lang="ts">
const route = useRoute()
const { protokolle, selected, select } = useProtokolle()
const id = computed(() => String(route.params.id))

// route id is the source of truth for the selected Protokoll; unknown id -> home
watchEffect(() => {
  if (!protokolle.value.some((p) => p.id === id.value)) navigateTo('/', { replace: true })
  else if (selected.value?.id !== id.value) select(id.value)
})
</script>

<template>
  <div v-if="selected?.id === id" class="space-y-4">
    <ProtokollSchritte :protokoll-id="id" />
    <NuxtPage />
    <ProtokollNavigation :protokoll-id="id" />
    <KeypadSheet />
  </div>
</template>

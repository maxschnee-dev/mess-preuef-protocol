<script setup lang="ts">
const { requestPersistence } = useProtokolle()
onMounted(requestPersistence)
</script>

<template>
  <UApp>
    <NuxtPwaManifest />
    <UContainer class="space-y-3 py-3 sm:py-6">
      <h1 class="text-2xl font-bold sm:text-3xl">Mess- + Prüfprotokoll</h1>
      <NuxtPage />
    </UContainer>
  </UApp>
</template>

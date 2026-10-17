<script setup lang="ts">
const { requestPersistence } = useProtokolle()
onMounted(requestPersistence)
</script>

<template>
  <UApp>
    <NuxtPwaManifest />
    <UContainer class="space-y-3 py-3 sm:py-6">
      <h1 class="text-xl font-semibold sm:text-2xl">Mess- + Prüfprotokoll</h1>
      <NuxtPage />
    </UContainer>
  </UApp>
</template>

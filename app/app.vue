<script setup lang="ts">
const { requestPersistence } = useProtokolle()
onMounted(requestPersistence)
</script>

<template>
  <UApp>
    <NuxtPwaManifest />
    <UContainer class="space-y-4 py-6">
      <h1 class="text-2xl font-semibold">Mess- + Prüfprotokoll</h1>
      <ProtokollSwitcher />
      <ProtokollKopf />
      <StromkreisListe />
      <BackupPanel />
    </UContainer>
  </UApp>
</template>

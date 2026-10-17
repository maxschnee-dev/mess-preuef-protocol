<script setup lang="ts">
const { requestPersistence, isLocked } =useProtokolle()
onMounted(requestPersistence)
</script>

<template>
  <UApp>
    <NuxtPwaManifest />
    <UContainer class="space-y-4 py-6">
      <h1 class="text-2xl font-semibold">Mess- + Prüfprotokoll</h1>
      <ProtokollSwitcher />
      <!-- A signed Protokoll is read-only: the fieldset disables every native control/button inside (#8) -->
      <fieldset :disabled="isLocked" class="min-w-0 space-y-4">
        <ProtokollKopf />
        <ProtokollFormular />
      </fieldset>
      <SignaturenPanel />
      <BackupPanel />
    </UContainer>
  </UApp>
</template>

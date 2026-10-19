<script setup lang="ts">
const { selected } = useProtokolle()
</script>

<template>
  <div v-if="selected" class="space-y-4">
    <SignaturenPanel />
    <PdfExport />
  </div>
</template>

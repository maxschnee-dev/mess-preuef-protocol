<script setup lang="ts">
const { selected, isLocked } = useProtokolle()
</script>

<template>
  <fieldset v-if="selected" :disabled="isLocked" class="min-w-0 space-y-4">
    <StromkreisListe />
  </fieldset>
</template>

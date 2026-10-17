<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <StepStromkreise :nr="String(route.params.nr)" />
</template>

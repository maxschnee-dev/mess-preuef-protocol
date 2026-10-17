<script setup lang="ts">
const route = useRoute()
await navigateTo(stepPath(String(route.params.id), 'auftrag'), { replace: true })
</script>

<template><div /></template>

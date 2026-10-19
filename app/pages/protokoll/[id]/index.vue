<script setup lang="ts">
const route = useRoute()
await navigateTo(stepPath(String(route.params.id), 'kopf'), { replace: true })
</script>

<template><div /></template>

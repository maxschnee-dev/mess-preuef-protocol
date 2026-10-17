<script setup lang="ts">
const { selected, update } = useProtokolle()
</script>

<template>
  <UCard v-if="selected">
    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField label="Kontrolldatum">
        <UInput :model-value="selected.kontrolldatum" type="date" class="w-full" @update:model-value="update(selected.id, { kontrolldatum: String($event) })" />
      </UFormField>
      <UFormField label="Ort der Installation">
        <UInput :model-value="selected.ortDerInstallation" class="w-full" @update:model-value="update(selected.id, { ortDerInstallation: String($event) })" />
      </UFormField>
    </div>
  </UCard>
</template>

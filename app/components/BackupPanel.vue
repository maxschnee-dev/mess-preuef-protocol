<script setup lang="ts">
const { exportJson, importJson } = useProtokolle()
const toast = useToast()
const fileInput = ref<HTMLInputElement>()

function download() {
  const blob = new Blob([exportJson()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `protokolle-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    importJson(await file.text())
    toast.add({ title: 'Sicherung importiert', color: 'success' })
  } catch {
    toast.add({ title: 'Import fehlgeschlagen', description: 'Ungültige Sicherungsdatei.', color: 'error' })
  }
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <UButton icon="i-lucide-download" label="Sicherung exportieren" variant="outline" @click="download" />
    <UButton icon="i-lucide-upload" label="Sicherung importieren" variant="outline" @click="fileInput?.click()" />
    <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onFile">
  </div>
</template>

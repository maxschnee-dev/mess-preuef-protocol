import { createProtokollStore, type ProtokollStore } from '~/utils/protokoll-store'

let store: ProtokollStore | undefined

/**
 * Reactive wrapper around the Protokoll store. Every store mutation is already
 * persisted (auto-save); this only bumps a counter so Vue re-renders.
 */
export function useProtokolle() {
  const revision = useState('protokolle-revision', () => 0)
  if (!store) {
    store = createProtokollStore(localStorage)
    store.subscribe(() => { revision.value++ })
  }
  const s = store

  async function requestPersistence() {
    try { return (await navigator.storage?.persist?.()) ?? false } catch { return false }
  }

  return {
    protokolle: computed(() => (revision.value, s.protokolle)),
    selected: computed(() => (revision.value, s.selected)),
    selectedId: computed(() => (revision.value, s.selectedId)),
    create: () => s.create(),
    select: (id: string) => s.select(id),
    update: (id: string, patch: Parameters<ProtokollStore['update']>[1]) => s.update(id, patch),
    duplicate: (id: string) => s.duplicate(id),
    remove: (id: string) => s.remove(id),
    exportJson: () => s.exportJson(),
    importJson: (json: string) => s.importJson(json),
    requestPersistence,
  }
}

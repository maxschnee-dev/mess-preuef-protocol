import { createProtokollStore, type ProtokollStore } from '~/utils/protokoll-store'
import type { Zertifikat } from '~/utils/digitale-signatur'
import { isGesperrt, type Signatur } from '~/utils/signaturen'

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
    zertifikat: computed(() => (revision.value, s.zertifikat)),
    setZertifikat: (z: Zertifikat | null) => s.setZertifikat(z),
    protokolle: computed(() => (revision.value, s.protokolle)),
    selected: computed(() => (revision.value, s.selected)),
    selectedId: computed(() => (revision.value, s.selectedId)),
    create: () => s.create(),
    select: (id: string) => s.select(id),
    update: (id: string, patch: Parameters<ProtokollStore['update']>[1]) => s.update(id, patch),
    /** true when the selected Protokoll is signed/locked: disable inputs with this. */
    isLocked: computed(() => (revision.value, isGesperrt(s.selected))),
    sign: (id: string, signatur: Signatur) => s.sign(id, signatur),
    unlock: (id: string) => s.unlock(id),
    duplicate: (id: string) => s.duplicate(id),
    remove: (id: string) => s.remove(id),
    exportJson: () => s.exportJson(),
    importJson: (json: string) => s.importJson(json),
    requestPersistence,
  }
}

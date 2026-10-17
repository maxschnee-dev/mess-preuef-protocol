import { collectCompanies, collectMessgeraete } from '~/utils/stammdaten'
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

  /** Copies companies/Messgeräte of all Protokolle into the autocomplete store (merge, never removes). */
  function syncStammdaten() {
    const companies = collectCompanies(s.companies, s.protokolle)
    const messgeraete = collectMessgeraete(s.messgeraete, s.protokolle)
    if (JSON.stringify([companies, messgeraete]) !== JSON.stringify([s.companies, s.messgeraete])) s.setStammdaten({ companies, messgeraete })
  }

  return {
    syncStammdaten,
    companies: computed(() => (revision.value, s.companies)),
    messgeraete: computed(() => (revision.value, s.messgeraete)),
    protokolle: computed(() => (revision.value, s.protokolle)),
    selected: computed(() => (revision.value, s.selected)),
    selectedId: computed(() => (revision.value, s.selectedId)),
    create: () => (syncStammdaten(), s.create()),
    select: (id: string) => (syncStammdaten(), s.select(id)),
    update: (id: string, patch: Parameters<ProtokollStore['update']>[1]) => s.update(id, patch),
    duplicate: (id: string) => (syncStammdaten(), s.duplicate(id)),
    remove: (id: string) => (syncStammdaten(), s.remove(id)),
    exportJson: () => (syncStammdaten(), s.exportJson()),
    importJson: (json: string) => s.importJson(json),
    requestPersistence,
  }
}

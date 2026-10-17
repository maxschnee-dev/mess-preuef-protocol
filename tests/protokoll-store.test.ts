import { describe, expect, it } from 'vitest'
import { createProtokollStore, protokollLabel, type KeyValueStorage } from '../app/utils/protokoll-store'

function fakeStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

describe('Protokoll-Store', () => {
  it('creates two Protokolle that survive a reload', () => {
    const storage = fakeStorage()
    const store = createProtokollStore(storage)
    const a = store.create()
    store.update(a.id, { kontrolldatum: '2026-10-01', ortDerInstallation: 'Bern' })
    const b = store.create()
    store.update(b.id, { kontrolldatum: '2026-10-02', ortDerInstallation: 'Thun' })

    const reloaded = createProtokollStore(storage)
    expect(reloaded.protokolle.map((p) => p.ortDerInstallation)).toEqual(['Bern', 'Thun'])
    expect(reloaded.protokolle[0]!.stromkreise).toEqual([])
    expect(reloaded.protokolle[0]!.schemaVersion).toBe(1)
  })

  it('labels a Protokoll as Kontrolldatum · Ort der Installation', () => {
    const store = createProtokollStore(fakeStorage())
    const p = store.create()
    store.update(p.id, { kontrolldatum: '2026-10-01', ortDerInstallation: 'Bern' })
    expect(protokollLabel(store.protokolle[0]!)).toBe('01.10.2026 · Bern')
  })

  it('labels an empty Protokoll with a placeholder', () => {
    const store = createProtokollStore(fakeStorage())
    expect(protokollLabel(store.create())).toBe('Ohne Datum · Ohne Ort')
  })

  it('switches the selected Protokoll and remembers it across reloads', () => {
    const storage = fakeStorage()
    const store = createProtokollStore(storage)
    const a = store.create()
    store.create()
    store.select(a.id)
    expect(createProtokollStore(storage).selectedId).toBe(a.id)
  })

  it('duplicates a Protokoll with a new id and selects the copy', () => {
    const store = createProtokollStore(fakeStorage())
    const a = store.create()
    store.update(a.id, { ortDerInstallation: 'Bern' })
    const copy = store.duplicate(a.id)!
    expect(copy.id).not.toBe(a.id)
    expect(copy.ortDerInstallation).toBe('Bern')
    expect(store.protokolle).toHaveLength(2)
    expect(store.selectedId).toBe(copy.id)
    store.update(copy.id, { ortDerInstallation: 'Thun' })
    expect(store.protokolle.find((p) => p.id === a.id)!.ortDerInstallation).toBe('Bern')
  })

  it('deletes a Protokoll and falls back to another selection', () => {
    const storage = fakeStorage()
    const store = createProtokollStore(storage)
    const a = store.create()
    const b = store.create()
    store.remove(b.id)
    expect(store.protokolle.map((p) => p.id)).toEqual([a.id])
    expect(store.selectedId).toBe(a.id)
    expect(createProtokollStore(storage).protokolle).toHaveLength(1)
    store.remove(a.id)
    expect(store.selectedId).toBeNull()
  })

  it('export -> wipe -> import restores Protokolle', () => {
    const storage = fakeStorage()
    const store = createProtokollStore(storage)
    const a = store.create()
    store.update(a.id, { kontrolldatum: '2026-10-01', ortDerInstallation: 'Bern' })
    const json = store.exportJson()
    expect(JSON.parse(json)).toMatchObject({ schemaVersion: 1, companies: [], messgeraete: [] })

    storage.data.clear()
    const wiped = createProtokollStore(storage)
    expect(wiped.protokolle).toEqual([])
    wiped.importJson(json)
    expect(wiped.protokolle.map((p) => p.ortDerInstallation)).toEqual(['Bern'])
    expect(createProtokollStore(storage).protokolle).toHaveLength(1)
  })

  it('keeps companies/Messgeräte through export and import', () => {
    const store = createProtokollStore(fakeStorage())
    store.setStammdaten({ companies: [{ name: 'Elektro AG' }], messgeraete: [{ name: 'Fluke 1664' }] })
    const other = createProtokollStore(fakeStorage())
    other.importJson(store.exportJson())
    expect(other.companies).toEqual([{ name: 'Elektro AG' }])
    expect(other.messgeraete).toEqual([{ name: 'Fluke 1664' }])
  })

  it('rejects invalid import without touching existing data', () => {
    const store = createProtokollStore(fakeStorage())
    store.create()
    expect(() => store.importJson('nope')).toThrow()
    expect(() => store.importJson('{"foo":1}')).toThrow()
    expect(store.protokolle).toHaveLength(1)
  })

  it('survives corrupt stored data', () => {
    const storage = fakeStorage()
    storage.setItem('mpp:v1:state', '{{{')
    expect(createProtokollStore(storage).protokolle).toEqual([])
  })
})

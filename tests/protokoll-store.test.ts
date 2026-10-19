import { describe, expect, it, vi } from 'vitest'
import { createProtokollStore, formatGeaendert, protokollLabel, type KeyValueStorage, type Protokoll } from '../app/utils/protokoll-store'
import type { Kopf } from '../app/utils/protokoll-form'

function fakeStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

const kopf = (p: Pick<Protokoll, 'kopf'>, patch: Partial<Kopf>) => ({ kopf: { ...p.kopf, ...patch } })

describe('Protokoll-Store', () => {
  it('creates two Protokolle that survive a reload', () => {
    const storage = fakeStorage()
    const store = createProtokollStore(storage)
    const a = store.create()
    store.update(a.id, kopf(a, { ausfuehrungsort: 'Bern' }))
    const b = store.create()
    store.update(b.id, kopf(b, { ausfuehrungsort: 'Thun' }))

    const reloaded = createProtokollStore(storage)
    expect(reloaded.protokolle.map((p) => p.kopf.ausfuehrungsort)).toEqual(['Bern', 'Thun'])
    expect(reloaded.protokolle[0]!.stromkreise).toEqual([])
    expect(reloaded.protokolle[0]!.schemaVersion).toBe(2)
  })

  it('labels a Protokoll as Ausführungsort · Verteilung · Zeitraum der Messungen', () => {
    const store = createProtokollStore(fakeStorage())
    const p = store.create()
    store.update(p.id, kopf(p, { ausfuehrungsort: 'Bern', verteilung: 'HV 1', zeitraumDerMessungen: '14.–16.10.2026' }))
    expect(protokollLabel(store.protokolle[0]!)).toBe('Bern · HV 1 · 14.–16.10.2026')
  })

  it('leaves empty parts out of the label and names an empty Protokoll', () => {
    const store = createProtokollStore(fakeStorage())
    const p = store.create()
    expect(protokollLabel(p)).toBe('Ohne Angaben')
    store.update(p.id, kopf(p, { verteilung: 'HV 1' }))
    expect(protokollLabel(store.protokolle[0]!)).toBe('HV 1')
  })

  it('lets several Protokolle share a Verteilung', () => {
    const store = createProtokollStore(fakeStorage())
    for (const zeit of ['Mo', 'Di']) {
      const p = store.create()
      store.update(p.id, kopf(p, { verteilung: 'HV 1', zeitraumDerMessungen: zeit }))
    }
    expect(store.protokolle.map(protokollLabel)).toEqual(['HV 1 · Mo', 'HV 1 · Di'])
  })

  it('tracks the last-edited time and formats it', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date(2026, 9, 19, 14, 32))
      const store = createProtokollStore(fakeStorage())
      const p = store.create()
      expect(formatGeaendert(p.geaendert)).toBe('19.10.2026 14:32')
      vi.setSystemTime(new Date(2026, 9, 20, 8, 5))
      store.update(p.id, { netzspannung: '230' })
      expect(formatGeaendert(store.selected!.geaendert)).toBe('20.10.2026 08:05')
      expect(formatGeaendert('nope')).toBe('')
    } finally {
      vi.useRealTimers()
    }
  })

  it('switches the selected Protokoll and remembers it across reloads', () => {
    const storage = fakeStorage()
    const store = createProtokollStore(storage)
    const a = store.create()
    store.create()
    store.select(a.id)
    expect(createProtokollStore(storage).selectedId).toBe(a.id)
  })

  it('duplicates a Protokoll with its Kopf, a new id and selects the copy', () => {
    const store = createProtokollStore(fakeStorage())
    const a = store.create()
    store.update(a.id, kopf(a, { ausfuehrungsort: 'Bern', verteilung: 'HV 1', mitarbeiter: 'Hans' }))
    const copy = store.duplicate(a.id)!
    expect(copy.id).not.toBe(a.id)
    expect(copy.kopf).toEqual(store.protokolle.find((p) => p.id === a.id)!.kopf)
    expect(store.protokolle).toHaveLength(2)
    expect(store.selectedId).toBe(copy.id)
    store.update(copy.id, kopf(copy, { ausfuehrungsort: 'Thun' }))
    expect(store.protokolle.find((p) => p.id === a.id)!.kopf.ausfuehrungsort).toBe('Bern')
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
    store.update(a.id, kopf(a, { ausfuehrungsort: 'Bern', verteilung: 'HV 1' }))
    const json = store.exportJson()
    expect(JSON.parse(json)).toMatchObject({ schemaVersion: 2 })
    expect(JSON.parse(json)).not.toHaveProperty('companies')

    storage.data.clear()
    const wiped = createProtokollStore(storage)
    expect(wiped.protokolle).toEqual([])
    wiped.importJson(json)
    expect(wiped.protokolle.map((p) => p.kopf)).toEqual([store.protokolle[0]!.kopf])
    expect(createProtokollStore(storage).protokolle).toHaveLength(1)
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

describe('saved VSEI 133-D Protokolle', () => {
  const vsei = JSON.stringify({
    schemaVersion: 1, selectedId: 'a', companies: [{ name: 'Elektro AG' }], messgeraete: [],
    protokolle: [{ id: 'a', schemaVersion: 1, kontrolldatum: '2026-10-01', ortDerInstallation: 'Bern', auftraggeber: { name1: 'Muster AG' }, stromkreise: [] }],
    zertifikat: { name: 'x', certPem: 'BEGIN CERTIFICATE', keyPem: 'PRIVATE KEY', erstellt: '' },
  })

  it('are dropped when the app opens, without crashing; the Zertifikat stays', () => {
    const storage = fakeStorage()
    storage.setItem('mpp:v1:state', vsei)
    const store = createProtokollStore(storage)
    expect(store.protokolle).toEqual([])
    expect(store.selectedId).toBeNull()
    expect(store.zertifikat).toMatchObject({ name: 'x' })
    store.create()
    expect(createProtokollStore(storage).protokolle).toHaveLength(1)
    expect(JSON.parse(storage.getItem('mpp:v1:state')!)).not.toHaveProperty('companies')
  })

  it('are dropped from an imported backup', () => {
    const store = createProtokollStore(fakeStorage())
    store.create()
    store.importJson(vsei)
    expect(store.protokolle).toEqual([])
  })
})

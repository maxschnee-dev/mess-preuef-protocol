import { describe, expect, it } from 'vitest'
import { createProtokoll, createProtokollStore, STORAGE_KEY } from '../app/utils/protokoll-store'
import { SICHTPRUEFUNG_ITEMS, setAlleSichtpruefungIo } from '../app/utils/protokoll-form'

function fakeStorage(initial?: string) {
  const m = new Map<string, string>(initial ? [[STORAGE_KEY, initial]] : [])
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
}

describe('new Protokoll form defaults', () => {
  it('starts with empty header, nothing checked, no Messgeräte', () => {
    const p = createProtokoll()
    expect(p.auftraggeber).toEqual({ art: '', name1: '', name2: '', strasse: '', plzOrt: '' })
    expect(p.auftragnehmer.art).toBe('')
    expect(p.installation.objektNr).toBe('')
    expect(p.netzspannung).toBe('')
    expect(p.messgeraete).toEqual([])
    expect(p.pruefergebnis.keineMaengel).toBe(false)
    expect(Object.values(p.sichtpruefung.checks).every((v) => v === false)).toBe(true)
    expect(Object.keys(p.sichtpruefung.checks)).toEqual(SICHTPRUEFUNG_ITEMS.map((i) => i.key))
  })

  it('does not share nested objects between Protokolle', () => {
    const a = createProtokoll()
    const b = createProtokoll()
    a.auftraggeber.name1 = 'x'
    expect(b.auftraggeber.name1).toBe('')
  })
})

describe('Alle i.O.', () => {
  it('ticks every Sichtprüfung item and returns a new object', () => {
    const p = createProtokoll()
    const s = setAlleSichtpruefungIo(p.sichtpruefung, true)
    expect(Object.values(s.checks).every(Boolean)).toBe(true)
    expect(Object.values(p.sichtpruefung.checks).some(Boolean)).toBe(false)
    expect(Object.values(setAlleSichtpruefungIo(s, false).checks).some(Boolean)).toBe(false)
  })
})

describe('loading old data', () => {
  const old = JSON.stringify({
    schemaVersion: 1, selectedId: 'a', companies: [], messgeraete: [],
    protokolle: [{ id: 'a', schemaVersion: 1, kontrolldatum: '2026-10-01', ortDerInstallation: 'Bern', stromkreise: [] }],
  })

  it('fills new fields with defaults and keeps old ones', () => {
    const p = createProtokollStore(fakeStorage(old)).selected!
    expect(p.ortDerInstallation).toBe('Bern')
    expect(p.auftraggeber.name1).toBe('')
    expect(p.sichtpruefung.checks).toEqual(createProtokoll().sichtpruefung.checks)
  })

  it('fills missing nested keys of partially stored sections', () => {
    const partial = JSON.stringify({
      protokolle: [{ id: 'a', auftraggeber: { name1: 'Muster AG' }, sichtpruefung: { checks: {} } }],
    })
    const s = createProtokollStore(fakeStorage())
    s.importJson(partial)
    const p = s.selected!
    expect(p.auftraggeber).toEqual({ art: '', name1: 'Muster AG', name2: '', strasse: '', plzOrt: '' })
    expect(Object.keys(p.sichtpruefung.checks)).toEqual(SICHTPRUEFUNG_ITEMS.map((i) => i.key))
  })

  it('persists edited form fields', () => {
    const st = fakeStorage()
    const s = createProtokollStore(st)
    const p = s.create()
    s.update(p.id, { netzspannung: '231', pruefergebnis: { ...p.pruefergebnis, keineMaengel: true } })
    const again = createProtokollStore(st).selected!
    expect(again.netzspannung).toBe('231')
    expect(again.pruefergebnis.keineMaengel).toBe(true)
  })
})

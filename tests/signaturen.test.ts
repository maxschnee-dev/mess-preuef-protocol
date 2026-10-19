import { describe, expect, it } from 'vitest'
import { createProtokollStore, type KeyValueStorage } from '../app/utils/protokoll-store'
import { entwurfSignatur, isSignatureComplete, isGesperrt } from '../app/utils/signaturen'

function fakeStorage(): KeyValueStorage {
  const data = new Map<string, string>()
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}
const PNG = 'data:image/png;base64,AAAA'
const sig = { name: 'Max Muster', datum: '2026-10-01', bild: PNG }

describe('Unterschrift und Sperre', () => {
  it('starts unsigned and unlocked', () => {
    const p = createProtokollStore(fakeStorage()).create()
    expect(p.gesperrt).toBe(false)
    expect(p.signatur).toEqual({ name: '', datum: '', bild: '' })
    expect('signaturen' in p).toBe(false)
  })

  it('signing locks the Protokoll and stores name, Datum and PNG data URL', () => {
    const store = createProtokollStore(fakeStorage())
    const p = store.create()
    expect(store.sign(p.id, sig)).toBe(true)
    expect(store.selected!.gesperrt).toBe(true)
    expect(store.selected!.signatur).toEqual(sig)
    expect(isGesperrt(store.selected)).toBe(true)
  })

  it('signing again replaces the Unterschrift and stays locked', () => {
    const store = createProtokollStore(fakeStorage())
    const p = store.create()
    store.sign(p.id, sig)
    const zweite = { ...sig, name: 'Erika Beispiel' }
    expect(store.sign(p.id, zweite)).toBe(true)
    expect(store.selected!.gesperrt).toBe(true)
    expect(store.selected!.signatur).toEqual(zweite)
  })

  it('refuses a signature without drawing', () => {
    const store = createProtokollStore(fakeStorage())
    const p = store.create()
    expect(store.sign(p.id, { ...sig, bild: '' })).toBe(false)
    expect(store.selected!.gesperrt).toBe(false)
    expect(isSignatureComplete({ ...sig, bild: '' })).toBe(false)
  })

  it('takes the Mitarbeiter from the Kopf when the signer name is empty', () => {
    const store = createProtokollStore(fakeStorage())
    const p = store.create()
    store.update(p.id, { kopf: { ...p.kopf, mitarbeiter: 'Hans Muster' } })
    store.sign(p.id, { ...sig, name: '  ' })
    expect(store.selected!.signatur.name).toBe('Hans Muster')
  })

  it('pre-fills the draft name from the Mitarbeiter of the Kopf and today as Datum', () => {
    const p = createProtokollStore(fakeStorage()).create()
    p.kopf.mitarbeiter = 'Hans Muster'
    expect(entwurfSignatur(p.kopf, '2026-10-19')).toEqual({ name: 'Hans Muster', datum: '2026-10-19', bild: '' })
  })

  it('ignores updates on a locked Protokoll', () => {
    const store = createProtokollStore(fakeStorage())
    const p = store.create()
    store.update(p.id, { netzspannung: '230' })
    store.sign(p.id, sig)
    expect(store.update(p.id, { netzspannung: '240' })).toBe(false)
    expect(store.selected!.netzspannung).toBe('230')
  })

  it('unlocking clears the Unterschrift and allows edits again', () => {
    const store = createProtokollStore(fakeStorage())
    const p = store.create()
    store.sign(p.id, sig)
    store.unlock(p.id)
    const after = store.selected!
    expect(after.gesperrt).toBe(false)
    expect(after.signatur).toEqual({ name: '', datum: '', bild: '' })
    expect(store.update(p.id, { netzspannung: '240' })).toBe(true)
  })

  it('keeps the lock after reload and defaults data without signature fields to unlocked', () => {
    const storage = fakeStorage()
    const store = createProtokollStore(storage)
    const p = store.create()
    store.sign(p.id, sig)
    expect(createProtokollStore(storage).selected!.gesperrt).toBe(true)

    const imported = createProtokollStore(fakeStorage())
    imported.importJson(JSON.stringify({ schemaVersion: 2, protokolle: [{ id: 'x' }] }))
    expect(imported.selected!.gesperrt).toBe(false)
    expect(imported.selected!.signatur.bild).toBe('')
  })

  it('a duplicate of a signed Protokoll is unsigned and editable', () => {
    const store = createProtokollStore(fakeStorage())
    const p = store.create()
    store.sign(p.id, sig)
    const copy = store.duplicate(p.id)!
    expect(copy.gesperrt).toBe(false)
    expect(copy.signatur.bild).toBe('')
    expect(store.protokolle.find((x) => x.id === p.id)!.gesperrt).toBe(true)
  })
})

describe('Protokolle mit zwei Unterschriften (v2, vor #23)', () => {
  const kontrolleur = { name: 'Karl Kontrolleur', datum: '2026-10-01', bild: PNG }
  const unternehmer = { name: 'Uwe Unternehmer', datum: '2026-10-02', bild: PNG }
  const leer = { name: '', datum: '', bild: '' }
  const laden = (p: Record<string, unknown>) => {
    const s = createProtokollStore(fakeStorage())
    s.importJson(JSON.stringify({ schemaVersion: 2, protokolle: [{ id: 'x', ...p }] }))
    return s.selected!
  }

  it('keeps the Kontrolleur Unterschrift and the lock when both signed', () => {
    const p = laden({ gesperrt: true, signaturen: { kontrolleur, unternehmer } })
    expect(p.signatur).toEqual(kontrolleur)
    expect(p.gesperrt).toBe(true)
    expect('signaturen' in p).toBe(false)
  })

  it('falls back to the Unternehmer Unterschrift when only that one exists', () => {
    const p = laden({ gesperrt: true, signaturen: { kontrolleur: leer, unternehmer } })
    expect(p.signatur).toEqual(unternehmer)
    expect(p.gesperrt).toBe(true)
  })

  it('fills an empty name from the Mitarbeiter of the Kopf', () => {
    const p = laden({ gesperrt: true, kopf: { mitarbeiter: 'Hans Muster' }, signaturen: { kontrolleur: { ...kontrolleur, name: '' }, unternehmer: leer } })
    expect(p.signatur.name).toBe('Hans Muster')
  })

  it('unlocks a locked Protokoll that has no usable Unterschrift', () => {
    const p = laden({ gesperrt: true, signaturen: { kontrolleur: leer, unternehmer: leer } })
    expect(p.signatur).toEqual(leer)
    expect(p.gesperrt).toBe(false)
  })

  it('leaves an unlocked Protokoll unsigned', () => {
    expect(laden({ signaturen: { kontrolleur: leer, unternehmer: leer } }).signatur).toEqual(leer)
  })
})

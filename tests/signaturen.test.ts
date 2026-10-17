import { describe, expect, it } from 'vitest'
import { createProtokollStore, type KeyValueStorage } from '../app/utils/protokoll-store'
import { isSignatureComplete, isGesperrt } from '../app/utils/signaturen'

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

describe('Signaturen und Sperre', () => {
  it('starts unsigned and unlocked', () => {
    const p = createProtokollStore(fakeStorage()).create()
    expect(p.gesperrt).toBe(false)
    expect(p.signaturen.kontrolleur).toEqual({ name: '', datum: '', bild: '' })
    expect(p.signaturen.unternehmer).toEqual({ name: '', datum: '', bild: '' })
  })

  it('signing locks the Protokoll and stores name, Datum and PNG data URL', () => {
    const store = createProtokollStore(fakeStorage())
    const p = store.create()
    expect(store.sign(p.id, 'kontrolleur', sig)).toBe(true)
    expect(store.selected!.gesperrt).toBe(true)
    expect(store.selected!.signaturen.kontrolleur).toEqual(sig)
    expect(isGesperrt(store.selected)).toBe(true)
  })

  it('refuses a signature without drawing', () => {
    const store = createProtokollStore(fakeStorage())
    const p = store.create()
    expect(store.sign(p.id, 'kontrolleur', { ...sig, bild: '' })).toBe(false)
    expect(store.selected!.gesperrt).toBe(false)
    expect(isSignatureComplete({ ...sig, bild: '' })).toBe(false)
  })

  it('ignores updates on a locked Protokoll', () => {
    const store = createProtokollStore(fakeStorage())
    const p = store.create()
    store.update(p.id, { ortDerInstallation: 'Bern' })
    store.sign(p.id, 'unternehmer', sig)
    expect(store.update(p.id, { ortDerInstallation: 'Thun' })).toBe(false)
    expect(store.selected!.ortDerInstallation).toBe('Bern')
  })

  it('unlocking clears both signatures and allows edits again', () => {
    const store = createProtokollStore(fakeStorage())
    const p = store.create()
    store.sign(p.id, 'kontrolleur', sig)
    store.sign(p.id, 'unternehmer', sig)
    store.unlock(p.id)
    const after = store.selected!
    expect(after.gesperrt).toBe(false)
    expect(after.signaturen.kontrolleur.bild).toBe('')
    expect(after.signaturen.unternehmer).toEqual({ name: '', datum: '', bild: '' })
    expect(store.update(p.id, { ortDerInstallation: 'Thun' })).toBe(true)
  })

  it('keeps the lock after reload and defaults old data to unlocked', () => {
    const storage = fakeStorage()
    const store = createProtokollStore(storage)
    const p = store.create()
    store.sign(p.id, 'kontrolleur', sig)
    expect(createProtokollStore(storage).selected!.gesperrt).toBe(true)

    const old = JSON.stringify({ protokolle: [{ id: 'x', ortDerInstallation: 'Alt' }] })
    const imported = createProtokollStore(fakeStorage())
    imported.importJson(old)
    expect(imported.selected!.gesperrt).toBe(false)
    expect(imported.selected!.signaturen.kontrolleur.bild).toBe('')
  })

  it('a duplicate of a signed Protokoll is unsigned and editable', () => {
    const store = createProtokollStore(fakeStorage())
    const p = store.create()
    store.sign(p.id, 'kontrolleur', sig)
    const copy = store.duplicate(p.id)!
    expect(copy.gesperrt).toBe(false)
    expect(copy.signaturen.kontrolleur.bild).toBe('')
    expect(store.protokolle.find((x) => x.id === p.id)!.gesperrt).toBe(true)
  })
})

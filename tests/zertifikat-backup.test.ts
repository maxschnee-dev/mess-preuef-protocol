import { describe, expect, it } from 'vitest'
import { letzterAuftragnehmer, type Zertifikat } from '../app/utils/digitale-signatur'
import { createProtokollStore, type KeyValueStorage } from '../app/utils/protokoll-store'

function fakeStorage(): KeyValueStorage {
  const data = new Map<string, string>()
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) }
}

const z: Zertifikat = {
  name: 'Muster AG',
  certPem: '-----BEGIN CERTIFICATE-----\nx\n-----END CERTIFICATE-----',
  keyPem: '-----BEGIN RSA PRIVATE KEY-----\nx\n-----END RSA PRIVATE KEY-----',
  erstellt: '2026-10-01T00:00:00.000Z',
}

describe('Zertifikat im Backup', () => {
  it('round-trips through export and import', () => {
    const a = createProtokollStore(fakeStorage())
    a.create()
    a.setZertifikat(z)
    const b = createProtokollStore(fakeStorage())
    b.importJson(a.exportJson())
    expect(b.zertifikat).toEqual(z)
  })

  it('imports older backups without a Zertifikat', () => {
    const a = createProtokollStore(fakeStorage())
    a.create()
    const old = JSON.parse(a.exportJson())
    delete old.zertifikat
    const b = createProtokollStore(fakeStorage())
    b.importJson(JSON.stringify(old))
    expect(b.zertifikat).toBeNull()
    expect(b.protokolle).toHaveLength(1)
  })

  it('persists across reloads and ignores a malformed Zertifikat', () => {
    const storage = fakeStorage()
    createProtokollStore(storage).setZertifikat(z)
    expect(createProtokollStore(storage).zertifikat).toEqual(z)
    const bad = createProtokollStore(fakeStorage())
    bad.importJson(JSON.stringify({ protokolle: [], zertifikat: { name: 'x' } }))
    expect(bad.zertifikat).toBeNull()
  })

  it('proposes the most recent non-empty Auftragnehmer name', () => {
    const p = (name1: string) => ({ auftragnehmer: { name1 } })
    expect(letzterAuftragnehmer([p('Alt AG'), p('Neu AG'), p(' ')])).toBe('Neu AG')
    expect(letzterAuftragnehmer([])).toBe('')
  })
})

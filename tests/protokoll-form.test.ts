import { describe, expect, it } from 'vitest'
import { createProtokoll, createProtokollStore, STORAGE_KEY } from '../app/utils/protokoll-store'
import { VERWENDETES_MESSGERAET } from '../app/utils/protokoll-form'

function fakeStorage(initial?: string) {
  const m = new Map<string, string>(initial ? [[STORAGE_KEY, initial]] : [])
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
}

describe('new Protokoll Kopf', () => {
  it('starts empty except for the pre-filled Verwendetes Messgerät', () => {
    expect(createProtokoll().kopf).toEqual({
      stromkunde: '', interneAuftragsnummer: '', installationsAnzeigeNr: '', zaehlerNummer: '',
      ausfuehrungsort: '', verteilung: '', ausgefuehrteArbeiten: '',
      verwendetesMessgeraet: 'Fluke 1663 / Erd-Tester ET15',
      zeitraumDerMessungen: '', mitarbeiter: '',
    })
    expect(VERWENDETES_MESSGERAET).toBe('Fluke 1663 / Erd-Tester ET15')
  })

  it('does not share the Kopf between Protokolle', () => {
    const a = createProtokoll()
    const b = createProtokoll()
    a.kopf.stromkunde = 'x'
    expect(b.kopf.stromkunde).toBe('')
  })

  it('has no VSEI-only fields', () => {
    const keys = Object.keys(createProtokoll())
    for (const k of ['auftraggeber', 'auftragnehmer', 'installation', 'kontrolle', 'kontrolldatum', 'anlageteile', 'sichtpruefung', 'funktionspruefung', 'pruefergebnis', 'messgeraete']) {
      expect(keys).not.toContain(k)
    }
  })
})

describe('loading partial data', () => {
  it('fills missing Kopf fields with defaults and keeps stored ones', () => {
    const s = createProtokollStore(fakeStorage())
    s.importJson(JSON.stringify({ schemaVersion: 2, protokolle: [{ id: 'a', kopf: { verteilung: 'HV 1' } }] }))
    const p = s.selected!
    expect(p.kopf.verteilung).toBe('HV 1')
    expect(p.kopf.stromkunde).toBe('')
    expect(p.kopf.verwendetesMessgeraet).toBe(VERWENDETES_MESSGERAET)
  })

  it('persists edited Kopf fields', () => {
    const st = fakeStorage()
    const s = createProtokollStore(st)
    const p = s.create()
    s.update(p.id, { kopf: { ...p.kopf, mitarbeiter: 'Hans Muster' }, netzspannung: '231' })
    const again = createProtokollStore(st).selected!
    expect(again.kopf.mitarbeiter).toBe('Hans Muster')
    expect(again.netzspannung).toBe('231')
  })
})

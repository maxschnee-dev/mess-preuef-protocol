import { describe, expect, it } from 'vitest'
import { createProtokoll, createProtokollStore, STORAGE_KEY } from '../app/utils/protokoll-store'
import { PRUEFPUNKTE, VERWENDETES_MESSGERAET } from '../app/utils/protokoll-form'

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

describe('Prüfpunkte', () => {
  const KEYS = ['basisschutz', 'brandabschottungen', 'betriebsmittel', 'stromkreiseBezeichnung', 'schemas']

  it('are five labelled checks that start blank (not confirmed)', () => {
    expect(PRUEFPUNKTE.map((x) => x.label)).toEqual([
      'Basisschutz erfüllt',
      'Brandabschottungen',
      'Richtige Auswahl und Bezeichnung der Betriebsmittel',
      'Bemessung / Kennzeichnung der Stromkreise / Leitungen',
      'Schemas und Legenden elektronisch nachgeführt',
    ])
    const p = createProtokoll()
    expect(Object.keys(p.pruefpunkte)).toEqual(KEYS)
    expect(Object.values(p.pruefpunkte)).toEqual([false, false, false, false, false])
  })

  it('default to blank when a schemaVersion 2 Protokoll without Prüfpunkte is loaded, keeping its data', () => {
    const s = createProtokollStore(fakeStorage())
    s.importJson(JSON.stringify({ schemaVersion: 2, protokolle: [{ id: 'a', netzspannung: '231', kopf: { verteilung: 'HV 1' } }] }))
    const p = s.selected!
    expect(Object.values(p.pruefpunkte)).toEqual([false, false, false, false, false])
    expect(p.netzspannung).toBe('231')
    expect(p.kopf.verteilung).toBe('HV 1')
  })

  it('keeps stored ticks, defaults missing ones and ignores non-boolean values', () => {
    const s = createProtokollStore(fakeStorage())
    s.importJson(JSON.stringify({ schemaVersion: 2, protokolle: [{ id: 'a', pruefpunkte: { basisschutz: true, schemas: 'ja' } }] }))
    expect(s.selected!.pruefpunkte).toEqual({ basisschutz: true, brandabschottungen: false, betriebsmittel: false, stromkreiseBezeichnung: false, schemas: false })
  })

  it('persist when edited', () => {
    const st = fakeStorage()
    const s = createProtokollStore(st)
    const p = s.create()
    expect(s.update(p.id, { pruefpunkte: { ...p.pruefpunkte, brandabschottungen: true } })).toBe(true)
    expect(createProtokollStore(st).selected!.pruefpunkte.brandabschottungen).toBe(true)
  })

  it('and Gemessene Spannung are read-only once the Protokoll is locked', () => {
    const s = createProtokollStore(fakeStorage())
    const p = s.create()
    s.update(p.id, { netzspannung: '230' })
    s.sign(p.id, 'kontrolleur', { name: 'Hans Muster', datum: '2026-10-19', bild: 'data:image/png;base64,AAAA' })
    expect(s.selected!.gesperrt).toBe(true)
    expect(s.update(p.id, { pruefpunkte: { ...p.pruefpunkte, basisschutz: true }, netzspannung: '240' })).toBe(false)
    expect(s.selected!.pruefpunkte.basisschutz).toBe(false)
    expect(s.selected!.netzspannung).toBe('230')
  })
})

describe('loading Stromkreise stored before L-PE / L-N', () => {
  const alt = { id: 's1', nr: '1', bezeichnung: 'Küche', rIso: '500', ikAnfang: '300', ikEnde: '260' }
  const laden = (stromkreise: unknown[]) => {
    const s = createProtokollStore(fakeStorage())
    s.importJson(JSON.stringify({ schemaVersion: 2, protokolle: [{ id: 'a', stromkreise }] }))
    return s.selected!.stromkreise
  }

  it('maps the old single I_K pair to L-PE, leaves L-N and Bemerkungen empty and drops the old keys', () => {
    const [sk] = laden([alt])
    expect(sk).toMatchObject({ bezeichnung: 'Küche', rIso: '500', ikLpeAnfang: '300', ikLpeEnde: '260', ikLnAnfang: '', ikLnEnde: '', bemerkungen: '' })
    expect(sk).not.toHaveProperty('ikAnfang')
    expect(sk).not.toHaveProperty('ikEnde')
  })

  it('keeps new values over old ones and fills every missing field', () => {
    const [sk] = laden([{ id: 's2', ikAnfang: '1', ikLpeAnfang: '400', bemerkungen: 'ok' }])
    expect(sk).toMatchObject({ ikLpeAnfang: '400', ikLpeEnde: '', bemerkungen: 'ok', schutzleiter: '', ueberstromschutzArt: '' })
  })

  it('survives garbage entries and persists the migrated shape', () => {
    const st = fakeStorage()
    const s = createProtokollStore(st)
    s.importJson(JSON.stringify({ schemaVersion: 2, protokolle: [{ id: 'a', stromkreise: [alt, null, 'x'] }] }))
    expect(s.selected!.stromkreise).toHaveLength(1)
    expect(createProtokollStore(st).selected!.stromkreise[0]!.ikLpeEnde).toBe('260')
  })
})

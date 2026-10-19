import { describe, expect, it } from 'vitest'
import type { PruefFeldKey } from '../app/utils/grenzwerte'
import { createStromkreis } from '../app/utils/stromkreis'
import {
  parseZahl,
  pruefeAusloesezeit,
  grenzwertText,
  pruefeIk,
  pruefeNetzspannung,
  pruefeRIso,
  pruefeSchutzleiter,
  pruefeStromkreis,
  verstoesseDerStromkreise,
  verstoesseDesProtokolls,
} from '../app/utils/grenzwerte'

function sk(patch: Record<string, string>) {
  return { ...createStromkreis('1'), ...patch } as ReturnType<typeof createStromkreis>
}

describe('parseZahl', () => {
  it('ignores a leading < or > (Schnellwert)', () => {
    expect(parseZahl('>500')).toBe(500)
    expect(parseZahl('< 0.1')).toBe(0.1)
    expect(parseZahl('>')).toBeNull()
    expect(parseZahl('5>')).toBeNull()
  })
  it('parses dot and comma decimals, rejects empty/garbage', () => {
    expect(parseZahl('0,5')).toBe(0.5)
    expect(parseZahl(' 1.25 ')).toBe(1.25)
    expect(parseZahl('')).toBeNull()
    expect(parseZahl('abc')).toBeNull()
  })
})

describe('R_ISO >= 1.0 MOhm', () => {
  it('boundary', () => {
    expect(pruefeRIso('1,0').ok).toBe(true)
    expect(pruefeRIso('0,99')).toEqual({ ok: false, boundary: '≥ 1.0 MΩ' })
    expect(pruefeRIso('0,5').ok).toBe(false)
  })
  it('empty is not a Verstoss', () => expect(pruefeRIso('').ok).toBe(true))
})

describe('Schutzleiter <= 1 Ohm', () => {
  it('boundary', () => {
    expect(pruefeSchutzleiter('1').ok).toBe(true)
    expect(pruefeSchutzleiter('1,01')).toEqual({ ok: false, boundary: '≤ 1 Ω' })
    expect(pruefeSchutzleiter('').ok).toBe(true)
  })
})

describe('I_K >= I_a', () => {
  it('LS B: 5 x I_N', () => {
    expect(pruefeIk(sk({ ueberstromschutzArt: 'LS-B', ueberstromschutzIn: '51' }), '255').ok).toBe(true)
    expect(pruefeIk(sk({ ueberstromschutzArt: 'LS-B', ueberstromschutzIn: '51' }), '254')).toEqual({ ok: false, boundary: '≥ 255 A' })
  })
  it('LS C: 10 x I_N, LS D: 20 x I_N', () => {
    expect(pruefeIk(sk({ ueberstromschutzArt: 'LS-C', ueberstromschutzIn: '16' }), '159').boundary).toBe('≥ 160 A')
    expect(pruefeIk(sk({ ueberstromschutzArt: 'LS-C', ueberstromschutzIn: '16' }), '160').ok).toBe(true)
    expect(pruefeIk(sk({ ueberstromschutzArt: 'LS-D', ueberstromschutzIn: '10' }), '199').ok).toBe(false)
    expect(pruefeIk(sk({ ueberstromschutzArt: 'LS-D', ueberstromschutzIn: '10' }), '200').ok).toBe(true)
  })
  it('gG: 0.4 s column up to 32 A, 5 s column above', () => {
    expect(pruefeIk(sk({ ueberstromschutzArt: 'gG', ueberstromschutzIn: '16' }), '106')).toEqual({ ok: false, boundary: '≥ 107 A' })
    expect(pruefeIk(sk({ ueberstromschutzArt: 'gG', ueberstromschutzIn: '16' }), '107').ok).toBe(true)
    expect(pruefeIk(sk({ ueberstromschutzArt: 'gG', ueberstromschutzIn: '32' }), '264').boundary).toBe('≥ 265 A')
    expect(pruefeIk(sk({ ueberstromschutzArt: 'gG', ueberstromschutzIn: '35' }), '172').boundary).toBe('≥ 173 A')
    expect(pruefeIk(sk({ ueberstromschutzArt: 'gG', ueberstromschutzIn: '63' }), '320').ok).toBe(true)
  })
  it('gG without table value is a neutral hint, not a Verstoss', () => {
    const r = pruefeIk(sk({ ueberstromschutzArt: 'gG', ueberstromschutzIn: '13' }), '1')
    expect(r).toMatchObject({ ok: true, boundary: 'gG ohne Tabellenwert – nicht geprüft', nichtGeprueft: true })
    expect(pruefeStromkreis(sk({ ueberstromschutzArt: 'gG', ueberstromschutzIn: '13', ikEnde: '1' }))).toEqual({})
  })
  it('unchecked: other device, unknown gG size, missing I_N, empty I_K', () => {
    expect(pruefeIk(sk({ ueberstromschutzArt: 'andere', ueberstromschutzIn: '16' }), '1').ok).toBe(true)
    expect(pruefeIk(sk({ ueberstromschutzArt: 'gG', ueberstromschutzIn: '13' }), '1').ok).toBe(true)
    expect(pruefeIk(sk({ ueberstromschutzArt: 'LS-B', ueberstromschutzIn: '' }), '1').ok).toBe(true)
    expect(pruefeIk(sk({ ueberstromschutzArt: 'LS-B', ueberstromschutzIn: '16' }), '').ok).toBe(true)
  })
})

describe('alle vier I_K gegen denselben Grenzwert', () => {
  const ls = { ueberstromschutzArt: 'LS-B', ueberstromschutzIn: '16' }
  it.each(['ikLpeAnfang', 'ikLpeEnde', 'ikLnAnfang', 'ikLnEnde'])('%s: Verstoss unter I_a, ok ab I_a', (key) => {
    expect(pruefeStromkreis(sk({ ...ls, [key]: '79' }))).toEqual({ [key]: '≥ 80 A' })
    expect(pruefeStromkreis(sk({ ...ls, [key]: '80' }))).toEqual({})
    expect(grenzwertText(sk(ls), key as PruefFeldKey)).toBe('≥ 80 A')
  })
  it('L-PE and L-N are independent', () => {
    expect(Object.keys(pruefeStromkreis(sk({ ...ls, ikLpeEnde: '10', ikLnAnfang: '500' })))).toEqual(['ikLpeEnde'])
  })
  it('no Überstromschutz, no Grenzwert', () => expect(pruefeStromkreis(sk({ ikLnEnde: '1' }))).toEqual({}))
})

describe('Auslösezeit', () => {
  it('normal RCD <= 300 ms', () => {
    expect(pruefeAusloesezeit(sk({ rcdArt: 'A', ausloesezeit: '300' })).ok).toBe(true)
    expect(pruefeAusloesezeit(sk({ rcdArt: 'A', ausloesezeit: '301' }))).toEqual({ ok: false, boundary: '≤ 300 ms' })
    expect(pruefeAusloesezeit(sk({ rcdArt: '', ausloesezeit: '301' })).ok).toBe(false)
  })
  it('selective (-S) 130-500 ms', () => {
    expect(pruefeAusloesezeit(sk({ rcdArt: 'A-S', ausloesezeit: '130' })).ok).toBe(true)
    expect(pruefeAusloesezeit(sk({ rcdArt: 'B-S', ausloesezeit: '500' })).ok).toBe(true)
    expect(pruefeAusloesezeit(sk({ rcdArt: 'A-S', ausloesezeit: '129' }))).toEqual({ ok: false, boundary: '130–500 ms' })
    expect(pruefeAusloesezeit(sk({ rcdArt: 'A-S', ausloesezeit: '501' })).ok).toBe(false)
  })
  it('empty ok', () => expect(pruefeAusloesezeit(sk({ rcdArt: 'A', ausloesezeit: '' })).ok).toBe(true))
})

describe('Netzspannung L–N 207-253 V', () => {
  it.each([['207', true], ['253', true], ['206', false], ['254', false], ['400', false], ['360', false]])(
    '%s V -> %s',
    (v, ok) => expect(pruefeNetzspannung(v as string).ok).toBe(ok),
  )
  it('parses commas and Schnellwert-style prefixes', () => {
    expect(pruefeNetzspannung('230,5').ok).toBe(true)
    expect(pruefeNetzspannung('253,5')).toEqual({ ok: false, boundary: '207–253 V' })
    expect(pruefeNetzspannung('>230').ok).toBe(true)
  })
  it('old free-text entries are a Verstoss', () => {
    expect(pruefeNetzspannung('230/400 V')).toEqual({ ok: false, boundary: '207–253 V' })
    expect(pruefeNetzspannung('230 V').ok).toBe(false)
  })
  it('empty is not a Verstoss', () => expect(pruefeNetzspannung('').ok).toBe(true))
})

describe('grenzwertText', () => {
  it('gives the limit without a value, null without a Grenzwert', () => {
    const s = sk({ ueberstromschutzArt: 'LS-B', ueberstromschutzIn: '16' })
    expect(grenzwertText(s, 'rIso')).toBe('≥ 1.0 MΩ')
    expect(grenzwertText(s, 'ikLpeEnde')).toBe('≥ 80 A')
    expect(grenzwertText(sk({}), 'ikLpeEnde')).toBeNull()
  })
})

describe('pruefeStromkreis / verstoesseDesProtokolls', () => {
  it('collects Verstösse per field', () => {
    const s = sk({ rIso: '0,5', schutzleiter: '0,2', ueberstromschutzArt: 'LS-B', ueberstromschutzIn: '16', ikLpeAnfang: '10', ikLnEnde: '20', ikLnAnfang: '90' })
    const r = pruefeStromkreis(s)
    expect(Object.keys(r).sort()).toEqual(['ikLnEnde', 'ikLpeAnfang', 'rIso'])
    expect(r.rIso).toBe('≥ 1.0 MΩ')
  })
  it('counts across Stromkreise and Netzspannung', () => {
    const p = { stromkreise: [sk({ rIso: '0,5' }), sk({ rIso: '5' }), sk({ rIso: '0,1', schutzleiter: '2' })], netzspannung: '300' }
    const v = verstoesseDesProtokolls(p)
    expect(v.anzahl).toBe(4)
    expect(v.proStromkreis[p.stromkreise[2]!.id]).toBe(2)
    expect(v.netzspannung).toBe('207–253 V')
  })
})

describe('verstoesseDerStromkreise', () => {
  it('counts Stromkreis Verstösse without Netzspannung', () => {
    const a = sk({ rIso: '0,5', schutzleiter: '2' })
    const v = verstoesseDerStromkreise([a, sk({ rIso: '5' })])
    expect(v.anzahl).toBe(2)
    expect(v.proStromkreis[a.id]).toBe(2)
  })
})

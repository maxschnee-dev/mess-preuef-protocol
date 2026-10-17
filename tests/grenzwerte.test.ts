import { describe, expect, it } from 'vitest'
import { createStromkreis } from '../app/utils/stromkreis'
import {
  parseZahl,
  pruefeAusloesezeit,
  grenzwertText,
  pruefeIkAnfang,
  pruefeIkEnde,
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

describe('I_K Ende >= I_a', () => {
  it('LS B: 5 x I_N', () => {
    expect(pruefeIkEnde(sk({ ueberstromschutzArt: 'LS-B', ueberstromschutzIn: '51', ikEnde: '255' })).ok).toBe(true)
    expect(pruefeIkEnde(sk({ ueberstromschutzArt: 'LS-B', ueberstromschutzIn: '51', ikEnde: '254' }))).toEqual({ ok: false, boundary: '≥ 255 A' })
  })
  it('LS C: 10 x I_N, LS D: 20 x I_N', () => {
    expect(pruefeIkEnde(sk({ ueberstromschutzArt: 'LS-C', ueberstromschutzIn: '16', ikEnde: '159' })).boundary).toBe('≥ 160 A')
    expect(pruefeIkEnde(sk({ ueberstromschutzArt: 'LS-C', ueberstromschutzIn: '16', ikEnde: '160' })).ok).toBe(true)
    expect(pruefeIkEnde(sk({ ueberstromschutzArt: 'LS-D', ueberstromschutzIn: '10', ikEnde: '199' })).ok).toBe(false)
    expect(pruefeIkEnde(sk({ ueberstromschutzArt: 'LS-D', ueberstromschutzIn: '10', ikEnde: '200' })).ok).toBe(true)
  })
  it('gG: 0.4 s column up to 32 A, 5 s column above', () => {
    expect(pruefeIkEnde(sk({ ueberstromschutzArt: 'gG', ueberstromschutzIn: '16', ikEnde: '106' }))).toEqual({ ok: false, boundary: '≥ 107 A' })
    expect(pruefeIkEnde(sk({ ueberstromschutzArt: 'gG', ueberstromschutzIn: '16', ikEnde: '107' })).ok).toBe(true)
    expect(pruefeIkEnde(sk({ ueberstromschutzArt: 'gG', ueberstromschutzIn: '32', ikEnde: '264' })).boundary).toBe('≥ 265 A')
    expect(pruefeIkEnde(sk({ ueberstromschutzArt: 'gG', ueberstromschutzIn: '35', ikEnde: '172' })).boundary).toBe('≥ 173 A')
    expect(pruefeIkEnde(sk({ ueberstromschutzArt: 'gG', ueberstromschutzIn: '63', ikEnde: '320' })).ok).toBe(true)
  })
  it('gG without table value is a neutral hint, not a Verstoss', () => {
    const r = pruefeIkEnde(sk({ ueberstromschutzArt: 'gG', ueberstromschutzIn: '13', ikEnde: '1' }))
    expect(r).toMatchObject({ ok: true, boundary: 'gG ohne Tabellenwert – nicht geprüft', nichtGeprueft: true })
    expect(pruefeStromkreis(sk({ ueberstromschutzArt: 'gG', ueberstromschutzIn: '13', ikEnde: '1' }))).toEqual({})
  })
  it('unchecked: other device, unknown gG size, missing I_N, empty I_K', () => {
    expect(pruefeIkEnde(sk({ ueberstromschutzArt: 'andere', ueberstromschutzIn: '16', ikEnde: '1' })).ok).toBe(true)
    expect(pruefeIkEnde(sk({ ueberstromschutzArt: 'gG', ueberstromschutzIn: '13', ikEnde: '1' })).ok).toBe(true)
    expect(pruefeIkEnde(sk({ ueberstromschutzArt: 'LS-B', ueberstromschutzIn: '', ikEnde: '1' })).ok).toBe(true)
    expect(pruefeIkEnde(sk({ ueberstromschutzArt: 'LS-B', ueberstromschutzIn: '16', ikEnde: '' })).ok).toBe(true)
  })
})

describe('I_K Anfang >= I_K Ende', () => {
  it('boundary', () => {
    expect(pruefeIkAnfang(sk({ ikAnfang: '300', ikEnde: '300' })).ok).toBe(true)
    expect(pruefeIkAnfang(sk({ ikAnfang: '299', ikEnde: '300' }))).toEqual({ ok: false, boundary: '≥ 300 A (I_K Ende)' })
  })
  it('needs both values', () => {
    expect(pruefeIkAnfang(sk({ ikAnfang: '', ikEnde: '300' })).ok).toBe(true)
    expect(pruefeIkAnfang(sk({ ikAnfang: '10', ikEnde: '' })).ok).toBe(true)
  })
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
    expect(grenzwertText(s, 'ikEnde')).toBe('≥ 80 A')
    expect(grenzwertText(sk({}), 'ikEnde')).toBeNull()
  })
})

describe('pruefeStromkreis / verstoesseDesProtokolls', () => {
  it('collects Verstösse per field', () => {
    const s = sk({ rIso: '0,5', schutzleiter: '0,2', ikAnfang: '10', ikEnde: '20' })
    const r = pruefeStromkreis(s)
    expect(Object.keys(r).sort()).toEqual(['ikAnfang', 'rIso'])
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

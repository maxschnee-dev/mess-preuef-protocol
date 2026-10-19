import { describe, expect, it } from 'vitest'
import { FELD_INFO, bereinige, naechstesZiel, targetKey, tippe, type KeypadTarget } from '../app/utils/keypad'

const m = (id: string, key: string) => ({ kind: 'messwert', id, key }) as KeypadTarget
const st = (id: string, key: string) => ({ kind: 'stamm', id, key }) as KeypadTarget

describe('Schnellwerte', () => {
  it('match the spec', () => {
    expect(FELD_INFO.rIso.schnellwerte).toEqual(['>500', '>999'])
    expect(FELD_INFO.schutzleiter.schnellwerte).toEqual(['<0,1'])
    expect(FELD_INFO.iLeck.schnellwerte).toEqual(['<0,1'])
    expect(FELD_INFO.leiterAnzahl.schnellwerte).toEqual(['3', '5'])
    expect(FELD_INFO.leiterQuerschnitt.schnellwerte).toEqual(['1,5', '2,5', '4', '6', '10', '16'])
    expect(FELD_INFO.ueberstromschutzIn.schnellwerte).toEqual(['6', '10', '13', '16', '20', '25', '32', '40', '63'])
    expect(FELD_INFO.rcdIn.schnellwerte).toEqual(['25', '40', '63'])
    expect(FELD_INFO.rcdIdn.schnellwerte).toEqual(['10', '30', '300'])
  })
  it('I_K, Auslösezeit and Netzspannung have none', () => {
    for (const k of ['ikLpeAnfang', 'ikLpeEnde', 'ikLnAnfang', 'ikLnEnde', 'ausloesezeit', 'netzspannung'] as const) expect(FELD_INFO[k].schnellwerte).toEqual([])
  })
})

describe('naechstesZiel (Weiter)', () => {
  const ids = ['a', 'b']
  it('walks the Messwerte in entry order', () => {
    const order = ['schutzleiter', 'rIso', 'iLeck', 'ikLpeAnfang', 'ikLpeEnde', 'ikLnAnfang', 'ikLnEnde', 'ausloesezeit']
    for (let i = 0; i < order.length - 1; i++) expect(naechstesZiel(m('a', order[i]!), ids)).toEqual(m('a', order[i + 1]!))
  })
  it('after Auslösezeit goes to the first Messwert of the next Stromkreis', () => {
    expect(naechstesZiel(m('a', 'ausloesezeit'), ids)).toEqual(m('b', 'schutzleiter'))
  })
  it('closes after the last Messwert of the last Stromkreis (no auto-create)', () => {
    expect(naechstesZiel(m('b', 'ausloesezeit'), ids)).toBeNull()
    expect(naechstesZiel(m('gone', 'ausloesezeit'), ids)).toBeNull()
  })
  it('Stammdaten run through, then lead to the first Messwert', () => {
    expect(naechstesZiel(st('a', 'leiterAnzahl'), ids)).toEqual(st('a', 'leiterQuerschnitt'))
    expect(naechstesZiel(st('a', 'leiterQuerschnitt'), ids)).toEqual(st('a', 'ueberstromschutzIn'))
    expect(naechstesZiel(st('a', 'ueberstromschutzIn'), ids)).toEqual(st('a', 'rcdIn'))
    expect(naechstesZiel(st('a', 'rcdIn'), ids)).toEqual(st('a', 'rcdIdn'))
    expect(naechstesZiel(st('a', 'rcdIdn'), ids)).toEqual(m('a', 'schutzleiter'))
  })
  it('Netzspannung closes', () => expect(naechstesZiel({ kind: 'netz' }, ids)).toBeNull())
})

describe('bereinige / tippe', () => {
  it('keeps digits, one separator and a leading < or >', () => {
    expect(bereinige('1,5')).toBe('1,5')
    expect(bereinige('1.5.3')).toBe('1.53')
    expect(bereinige('> 500')).toBe('>500')
    expect(bereinige('5<')).toBe('5')
    expect(bereinige('abc12')).toBe('12')
    expect(bereinige('<>3')).toBe('<3')
  })
  it('digit keys append, comma starts with 0,', () => {
    expect(tippe('', '1')).toBe('1')
    expect(tippe('1', '6')).toBe('16')
    expect(tippe('', ',')).toBe('0,')
    expect(tippe('2', ',')).toBe('2,')
    expect(tippe('2,5', ',')).toBe('2,5')
  })
  it('back deletes one char', () => {
    expect(tippe('16', 'back')).toBe('1')
    expect(tippe('', 'back')).toBe('')
    expect(tippe('>500', 'back', true)).toBe('>50')
  })
  it('first key replaces when ersetzen', () => {
    expect(tippe('>500', '7', true)).toBe('7')
    expect(tippe('>500', ',', true)).toBe('0,')
  })
})

describe('targetKey', () => {
  it('is unique per field', () => {
    expect(targetKey(m('a', 'rIso'))).not.toBe(targetKey(m('b', 'rIso')))
    expect(targetKey({ kind: 'netz' })).toBe('netzspannung')
  })
})

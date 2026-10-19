/**
 * Pure logic of the keypad bottom sheet (#15): which fields exist, their Schnellwerte,
 * the Weiter order and text editing. No Vue, no store.
 */

export type StammKey = 'leiterAnzahl' | 'leiterQuerschnitt' | 'ueberstromschutzIn' | 'rcdIn' | 'rcdIdn'
export type MesswertKey = 'schutzleiter' | 'rIso' | 'iLeck' | 'ikAnfang' | 'ikEnde' | 'ausloesezeit'

/** The field the keypad edits. Stromkreis fields are addressed by Stromkreis id (stable when reordering). */
export type KeypadTarget =
  | { kind: 'stamm'; id: string; key: StammKey }
  | { kind: 'messwert'; id: string; key: MesswertKey }
  | { kind: 'netz' }

export interface FeldInfo {
  label: string
  /** Display only; the stored value is the bare number. */
  unit: string
  schnellwerte: readonly string[]
}

export const STAMM_REIHENFOLGE: readonly StammKey[] = ['leiterAnzahl', 'leiterQuerschnitt', 'ueberstromschutzIn', 'rcdIn', 'rcdIdn']
/** Entry order of the Messwert cards; Weiter follows it. */
export const MESSWERT_REIHENFOLGE: readonly MesswertKey[] = ['schutzleiter', 'rIso', 'iLeck', 'ikAnfang', 'ikEnde', 'ausloesezeit']

export const FELD_INFO: Record<StammKey | MesswertKey | 'netzspannung', FeldInfo> = {
  // Comma decimals, like the keypad's comma key
  leiterAnzahl: { label: 'Leiteranzahl', unit: '', schnellwerte: ['3', '5'] },
  leiterQuerschnitt: { label: 'Querschnitt', unit: 'mm²', schnellwerte: ['1,5', '2,5', '4', '6', '10', '16'] },
  ueberstromschutzIn: { label: 'Überstromschutz I_N', unit: 'A', schnellwerte: ['6', '10', '13', '16', '20', '25', '32', '40', '63'] },
  rcdIn: { label: 'RCD I_N', unit: 'A', schnellwerte: ['25', '40', '63'] },
  rcdIdn: { label: 'RCD I_ΔN', unit: 'mA', schnellwerte: ['10', '30', '300'] },
  schutzleiter: { label: 'Schutzleiter', unit: 'Ω', schnellwerte: ['<0,1'] },
  rIso: { label: 'R_ISO', unit: 'MΩ', schnellwerte: ['>500', '>999'] },
  iLeck: { label: 'I_Leck', unit: 'mA', schnellwerte: ['<0,1'] },
  ikAnfang: { label: 'I_K Anfang', unit: 'A', schnellwerte: [] },
  ikEnde: { label: 'I_K Ende', unit: 'A', schnellwerte: [] },
  ausloesezeit: { label: 'Auslösezeit', unit: 'ms', schnellwerte: [] },
  netzspannung: { label: 'Gemessene Spannung', unit: 'V', schnellwerte: [] },
}

export const feldKey = (t: KeypadTarget): keyof typeof FELD_INFO => (t.kind === 'netz' ? 'netzspannung' : t.key)

export const sameTarget = (a: KeypadTarget | null, b: KeypadTarget | null): boolean =>
  !!a && !!b && targetKey(a) === targetKey(b)

/** Stable string for a target; also the `data-keypad` attribute on the card that opens it. */
export const targetKey = (t: KeypadTarget): string => (t.kind === 'netz' ? 'netzspannung' : `${t.id}:${t.key}`)

/**
 * Where Weiter leads from `t`; `null` = close the keypad.
 * Stammdaten -> next numeric Stammdaten field -> first Messwert. Messwert -> next Messwert of the
 * same Stromkreis -> first Messwert of the next Stromkreis (never auto-created) -> end. Netzspannung -> end.
 * `ids` are the Stromkreis ids in list order.
 */
export function naechstesZiel(t: KeypadTarget, ids: readonly string[]): KeypadTarget | null {
  if (t.kind === 'netz') return null
  if (t.kind === 'stamm') {
    const next = STAMM_REIHENFOLGE[STAMM_REIHENFOLGE.indexOf(t.key) + 1]
    return next ? { kind: 'stamm', id: t.id, key: next } : { kind: 'messwert', id: t.id, key: MESSWERT_REIHENFOLGE[0]! }
  }
  const next = MESSWERT_REIHENFOLGE[MESSWERT_REIHENFOLGE.indexOf(t.key) + 1]
  if (next) return { kind: 'messwert', id: t.id, key: next }
  const i = ids.indexOf(t.id)
  const nextId = i >= 0 ? ids[i + 1] : undefined
  return nextId ? { kind: 'messwert', id: nextId, key: MESSWERT_REIHENFOLGE[0]! } : null
}

const MAX_LAENGE = 10

/**
 * Cleans typed/pasted text: only digits, one decimal separator (, or .) and a leading < or >.
 * Spaces are dropped (">500" and "> 500" are the same entry).
 */
export function bereinige(text: string): string {
  let out = ''
  let hatTrenner = false
  for (const c of text) {
    if (c >= '0' && c <= '9') out += c
    else if ((c === ',' || c === '.') && !hatTrenner) {
      out += c
      hatTrenner = true
    } else if ((c === '<' || c === '>') && out === '') out += c
  }
  return out.slice(0, MAX_LAENGE)
}

export type TastenKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | ',' | 'back'

/** Applies one on-screen key. `ersetzen`: the first digit/comma replaces the whole current value. */
export function tippe(aktuell: string, taste: TastenKey, ersetzen = false): string {
  if (taste === 'back') return aktuell.slice(0, -1)
  const basis = ersetzen ? '' : aktuell
  // a bare comma starts "0,"
  const eingabe = taste === ',' && (basis === '' || /^[<>]$/.test(basis)) ? '0,' : taste
  return bereinige(basis + eingabe)
}

import type { RcdArt, Stromkreis, UeberstromschutzArt } from './protokoll-store'

/**
 * Grenzwerte (ADR-0003, ADR-0004). The single place for every limit; the rule
 * functions below read only from GRENZWERTE. 230/400 V installation assumed.
 *
 * ACHTUNG: Alle Werte, insbesondere GG_ABSCHALTSTROM, muessen vor dem produktiven
 * Einsatz von einer Fachperson gegen die aktuelle NIN (SN 411000) geprueft werden.
 */
export const GRENZWERTE = {
  /** R_ISO in MΩ, minimum */
  rIsoMin: 1.0,
  /** Leitfähigkeit Schutzleiter in Ω, maximum */
  schutzleiterMax: 1,
  /** Faktor k: I_a = k · I_N for Leitungsschutzschalter */
  lsFaktor: { 'LS-B': 5, 'LS-C': 10, 'LS-D': 20 } as Partial<Record<UeberstromschutzArt, number>>,
  /** gG: up to this I_N (A) the 0.4 s column applies, above it the 5 s column */
  ggGrenzeSchnell: 32,
  /** RCD-Auslösezeit in ms */
  ausloesezeit: { max: 300, selektiv: { min: 130, max: 500 } },
  /** RCD-Arten with selective (time-delayed) characteristic */
  selektiveRcdArten: ['A-S', 'B-S'] as readonly RcdArt[],
  /** Netzspannung L–N in V: allowed range (230 V system) */
  netzspannung: { min: 207, max: 253 },
} as const

/**
 * gG-Sicherungen: Abschaltstrom I_a (A) je Nennstrom I_N (A), TN-System, U0 = 230 V.
 * Source: elektrofachkraft.de "Schutz durch automatische Abschaltung", Tabelle NB.1 (Auszug)
 * (DIN VDE 0100-600 / -410). I_N 80 A has no 0.4 s value (only needed up to 32 A).
 * MUSS VON EINER FACHPERSON GEGEN DIE AKTUELLE NIN GEPRUEFT WERDEN (ADR-0004).
 */
export const GG_ABSCHALTSTROM_HINWEIS =
  'gG-Sicherungstabelle: Werte aus VDE-0100-Tabelle (Auszug), vor Einsatz durch Fachperson gegen aktuelle NIN prüfen.'
export const GG_ABSCHALTSTROM: Record<number, { s5: number; s04?: number }> = {
  2: { s5: 9.2, s04: 16 },
  4: { s5: 19, s04: 32 },
  6: { s5: 27, s04: 47 },
  10: { s5: 47, s04: 82 },
  16: { s5: 65, s04: 107 },
  20: { s5: 85, s04: 145 },
  25: { s5: 110, s04: 180 },
  32: { s5: 150, s04: 265 },
  35: { s5: 173, s04: 295 },
  40: { s5: 190, s04: 310 },
  50: { s5: 260, s04: 460 },
  63: { s5: 320, s04: 550 },
  80: { s5: 440 },
}

export interface Pruefung {
  ok: boolean
  /** Required boundary text, e.g. "≥ 255 A"; null when nothing was checked. */
  boundary: string | null
  /** true when a check was not possible for a known reason (neutral hint in `boundary`, never a Verstoss). */
  nichtGeprueft?: true
}

const OK: Pruefung = { ok: true, boundary: null }

/**
 * Parses "0,5" / "0.5"; empty or non-numeric -> null (= not measured).
 * A leading "<" / ">" (Schnellwert such as ">500", "< 0,1") is ignored: checked as the number itself.
 */
export function parseZahl(text: string | undefined | null): number | null {
  const t = (text ?? '').trim().replace(/^[<>]\s*/, '').replace(',', '.')
  if (t === '' || !/^[-+]?\d*\.?\d+$/.test(t)) return null
  return Number(t)
}

function fmt(n: number): string {
  return String(Math.round(n * 100) / 100)
}

/** Shared shape of every rule: not measured -> OK; otherwise compare and report the boundary. */
function vergleiche(wert: number | null, erfuellt: (v: number) => boolean, boundary: string): Pruefung {
  if (wert === null) return OK
  return erfuellt(wert) ? { ok: true, boundary } : { ok: false, boundary }
}

export function pruefeRIso(rIso: string): Pruefung {
  const min = GRENZWERTE.rIsoMin
  return vergleiche(parseZahl(rIso), (v) => v >= min, `≥ ${min.toFixed(1)} MΩ`)
}

export function pruefeSchutzleiter(schutzleiter: string): Pruefung {
  const max = GRENZWERTE.schutzleiterMax
  return vergleiche(parseZahl(schutzleiter), (v) => v <= max, `≤ ${max} Ω`)
}

/** Required I_a in A for the Überstromschutz, or null when it cannot be determined (unchecked). */
export function abschaltstrom(art: UeberstromschutzArt, inText: string): number | null {
  const iN = parseZahl(inText)
  if (iN === null || iN <= 0) return null
  const k = GRENZWERTE.lsFaktor[art]
  if (k !== undefined) return k * iN
  if (art === 'gG') {
    const row = GG_ABSCHALTSTROM[iN]
    if (!row) return null
    return iN <= GRENZWERTE.ggGrenzeSchnell ? (row.s04 ?? null) : row.s5
  }
  return null
}

export function pruefeIkEnde(s: Pick<Stromkreis, 'ueberstromschutzArt' | 'ueberstromschutzIn' | 'ikEnde'>): Pruefung {
  const ik = parseZahl(s.ikEnde)
  const ia = abschaltstrom(s.ueberstromschutzArt, s.ueberstromschutzIn)
  if (ia === null) {
    const iN = parseZahl(s.ueberstromschutzIn)
    if (ik !== null && s.ueberstromschutzArt === 'gG' && iN !== null && iN > 0) {
      return { ok: true, boundary: 'gG ohne Tabellenwert – nicht geprüft', nichtGeprueft: true }
    }
    return OK
  }
  return vergleiche(ik, (v) => v >= ia, `≥ ${fmt(ia)} A`)
}

export function pruefeIkAnfang(s: Pick<Stromkreis, 'ikAnfang' | 'ikEnde'>): Pruefung {
  const ende = parseZahl(s.ikEnde)
  if (ende === null) return OK
  return vergleiche(parseZahl(s.ikAnfang), (v) => v >= ende, `≥ ${fmt(ende)} A (I_K Ende)`)
}

export function pruefeAusloesezeit(s: Pick<Stromkreis, 'rcdArt' | 'ausloesezeit'>): Pruefung {
  const t = parseZahl(s.ausloesezeit)
  const g = GRENZWERTE.ausloesezeit
  if (GRENZWERTE.selektiveRcdArten.includes(s.rcdArt)) {
    return vergleiche(t, (v) => v >= g.selektiv.min && v <= g.selektiv.max, `${g.selektiv.min}–${g.selektiv.max} ms`)
  }
  return vergleiche(t, (v) => v <= g.max, `≤ ${g.max} ms`)
}

/** Netzspannung L–N: a single value (also ">230"). Non-empty text that is not a number is a Verstoss. */
export function pruefeNetzspannung(text: string): Pruefung {
  const { min, max } = GRENZWERTE.netzspannung
  const boundary = `${min}–${max} V`
  const wert = parseZahl(text)
  if (wert === null) return (text ?? '').trim() === '' ? OK : { ok: false, boundary }
  return vergleiche(wert, (v) => v >= min && v <= max, boundary)
}

/** Fields of a Stromkreis that have a Grenzwert. */
export type PruefFeldKey = 'schutzleiter' | 'rIso' | 'ikAnfang' | 'ikEnde' | 'ausloesezeit'
const PRUEF_FELD_KEYS: readonly string[] = ['schutzleiter', 'rIso', 'ikAnfang', 'ikEnde', 'ausloesezeit']
export function isPruefFeldKey(key: string): key is PruefFeldKey {
  return PRUEF_FELD_KEYS.includes(key)
}

/** Per-field full result (ok + boundary); boundary also set when ok, for display of the limit. */
export function pruefeFelder(s: Stromkreis): Partial<Record<PruefFeldKey, Pruefung>> {
  return {
    schutzleiter: pruefeSchutzleiter(s.schutzleiter),
    rIso: pruefeRIso(s.rIso),
    ikAnfang: pruefeIkAnfang(s),
    ikEnde: pruefeIkEnde(s),
    ausloesezeit: pruefeAusloesezeit(s),
  }
}

/** Grenzwert text of one field regardless of its current value (for the keypad hint), null when it has none. */
export function grenzwertText(s: Stromkreis, key: PruefFeldKey): string | null {
  return pruefeFelder({ ...s, [key]: '0' })[key]?.boundary ?? null
}

/** Only the Verstösse of a Stromkreis: field -> required boundary. */
export function pruefeStromkreis(s: Stromkreis): Partial<Record<PruefFeldKey, string>> {
  const out: Partial<Record<PruefFeldKey, string>> = {}
  for (const [key, r] of Object.entries(pruefeFelder(s)) as [PruefFeldKey, Pruefung][]) {
    if (!r.ok && r.boundary) out[key] = r.boundary
  }
  return out
}

export interface Verstoesse {
  /** Total number of Verstösse (Stromkreis fields + Netzspannung). */
  anzahl: number
  /** Verstoss count per Stromkreis id (only Stromkreise with at least one). */
  proStromkreis: Record<string, number>
  /** Required boundary text when Netzspannung is a Verstoss, else null. */
  netzspannung: string | null
}

/** Verstösse of the Stromkreise only (no Netzspannung). */
export function verstoesseDerStromkreise(stromkreise: Stromkreis[]): Pick<Verstoesse, 'anzahl' | 'proStromkreis'> {
  const proStromkreis: Record<string, number> = {}
  let anzahl = 0
  for (const s of stromkreise) {
    const n = Object.keys(pruefeStromkreis(s)).length
    if (n > 0) {
      proStromkreis[s.id] = n
      anzahl += n
    }
  }
  return { anzahl, proStromkreis }
}

export function verstoesseDesProtokolls(p: { stromkreise: Stromkreis[]; netzspannung: string }): Verstoesse {
  const { anzahl, proStromkreis } = verstoesseDerStromkreise(p.stromkreise)
  const netz = pruefeNetzspannung(p.netzspannung)
  const netzspannung = netz.ok ? null : netz.boundary
  return { anzahl: anzahl + (netzspannung ? 1 : 0), proStromkreis, netzspannung }
}

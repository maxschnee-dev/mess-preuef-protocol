/**
 * Form sections of page 1 of the Protokoll (header, Sichtprüfung, Funktionsprüfung, Prüfergebnis).
 * Framework-free. Kontrolldatum, Ort der Installation and Stromkreise live in protokoll-store.ts.
 */

export const AUFTRAGGEBER_ARTEN = [
  { value: 'eigentuemer', label: 'Eigentümer' },
  { value: 'verwaltung', label: 'Verwaltung' },
  { value: 'stromkunde', label: 'Stromkunde' },
] as const
export const AUFTRAGNEHMER_ARTEN = [
  { value: 'elektro-installateur', label: 'Elektro-Installateur' },
  { value: 'kontrollorgan', label: 'Kontrollorgan' },
] as const

export interface Partei {
  /** value of AUFTRAGGEBER_ARTEN / AUFTRAGNEHMER_ARTEN, or '' */
  art: string
  name1: string
  name2: string
  strasse: string
  plzOrt: string
}

export interface Installation {
  gebaeudeart: string
  objektNr: string
  instAnzeige: string
  anlage: string
  stromkunde: string
  stockwerkRaum: string
  zaehlerNr: string
  anlageNr: string
}

export interface Kontrolle {
  durchgefuehrteKontrolle: string
  kontrollperiode: string
  kontrollumfang: string
}

/** One row of the Anlage/Anlageteil x Verbraucher grid (free text). */
export interface AnlageteilZeile {
  id: string
  anlageteil: string
  verbraucher: string
}

export const SICHTPRUEFUNG_ITEMS = [
  { key: 'leiterFarbkennzeichnung', label: 'Leiter, Farbkennzeichnung' },
  { key: 'schutzDirektesBeruehren', label: 'Schutz gegen direktes Berühren' },
  { key: 'ueberstromschutz', label: 'Überstromschutzeinrichtungen, Bemessung' },
  { key: 'kennzeichnung', label: 'Beschriftung, Kennzeichnung' },
  { key: 'verlegungBefestigung', label: 'Verlegung, Befestigung' },
  { key: 'brandschutz', label: 'Brandschutz, Abschottungen' },
  { key: 'potentialausgleich', label: 'Potentialausgleich' },
  { key: 'zugaenglichkeit', label: 'Zugänglichkeit, Schemas, Dokumentation' },
] as const

export const SCHUTZ_SYSTEME = ['TN-S', 'TN-C', 'TN-C-S', 'TT', 'IT'] as const

export interface Sichtpruefung {
  checks: Record<string, boolean>
  /** one of SCHUTZ_SYSTEME or '' */
  schutzSystem: string
  erder: string
}

export const FUNKTIONSPRUEFUNG_ITEMS = [
  { key: 'schutzeinrichtungen', label: 'Schutzeinrichtungen (RCD-Prüftaste, Überstromschutz)' },
  { key: 'schalter', label: 'Schalter, Steuerungen, Verriegelungen' },
  { key: 'drehfeld', label: 'Drehfeld' },
  { key: 'notbeleuchtung', label: 'Sicherheitsbeleuchtung, Notausschalter' },
  { key: 'steckdosen', label: 'Steckdosen, Polarität' },
] as const

export interface Funktionspruefung {
  checks: Record<string, boolean>
}

export interface Pruefergebnis {
  /** "Keine Mängel festgestellt" */
  keineMaengel: boolean
}

/** All form fields added to Protokoll by ticket #4. */
export interface ProtokollForm {
  auftraggeber: Partei
  auftragnehmer: Partei
  installation: Installation
  kontrolle: Kontrolle
  anlageteile: AnlageteilZeile[]
  sichtpruefung: Sichtpruefung
  funktionspruefung: Funktionspruefung
  /** Gemessene Netzspannung, free text (e.g. "230/400 V") */
  netzspannung: string
  bemerkungen: string
  /** names of the Messgeräte used */
  messgeraete: string[]
  pruefungNach: string
  schaltgeraetekombination: string
  dokumentation: string
  pruefergebnis: Pruefergebnis
}

function unchecked(items: readonly { key: string }[]): Record<string, boolean> {
  return Object.fromEntries(items.map((i) => [i.key, false]))
}

export function createProtokollForm(): ProtokollForm {
  const partei = (): Partei => ({ art: '', name1: '', name2: '', strasse: '', plzOrt: '' })
  return {
    auftraggeber: partei(),
    auftragnehmer: partei(),
    installation: {
      gebaeudeart: '', objektNr: '', instAnzeige: '', anlage: '', stromkunde: '',
      stockwerkRaum: '', zaehlerNr: '', anlageNr: '',
    },
    kontrolle: { durchgefuehrteKontrolle: '', kontrollperiode: '', kontrollumfang: '' },
    anlageteile: [],
    sichtpruefung: { checks: unchecked(SICHTPRUEFUNG_ITEMS), schutzSystem: '', erder: '' },
    funktionspruefung: { checks: unchecked(FUNKTIONSPRUEFUNG_ITEMS) },
    netzspannung: '',
    bemerkungen: '',
    messgeraete: [],
    pruefungNach: '',
    schaltgeraetekombination: '',
    dokumentation: '',
    pruefergebnis: { keineMaengel: false },
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** Deep-merges stored (possibly old/partial) data over the defaults; arrays are taken as stored. */
function mergeDeep<T>(defaults: T, stored: unknown): T {
  if (stored === undefined || stored === null) return defaults
  if (isObj(defaults)) {
    if (!isObj(stored)) return defaults
    const out: Record<string, unknown> = { ...stored }
    for (const k of Object.keys(defaults)) out[k] = mergeDeep((defaults as Record<string, unknown>)[k], stored[k])
    return out as T
  }
  if (Array.isArray(defaults)) return (Array.isArray(stored) ? stored : defaults) as T
  return (typeof stored === typeof defaults ? stored : defaults) as T
}

/** Fills every form field missing in `stored` with its default (migration for older Protokolle). */
export function withFormDefaults<T extends object>(stored: T): T & ProtokollForm {
  const merged = mergeDeep(createProtokollForm(), stored)
  return { ...stored, ...merged } as T & ProtokollForm
}

export function setAlleSichtpruefungIo(s: Sichtpruefung, value: boolean): Sichtpruefung {
  return { ...s, checks: Object.fromEntries(SICHTPRUEFUNG_ITEMS.map((i) => [i.key, value])) }
}

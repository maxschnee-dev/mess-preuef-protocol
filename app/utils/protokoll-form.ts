/**
 * Form sections of the Equans Erstprüfungsprotokoll (ADR 0001). Framework-free.
 * Stromkreise, Unterschrift and the lock live in protokoll-store.ts / signaturen.ts.
 */

/** The Elektro-Installateur is fixed; it is printed and never entered. */
export const ELEKTRO_INSTALLATEUR = 'Equans Switzerland Facility Management AG'
export const ELEKTRO_INSTALLATEUR_ADRESSE = ['Baarermattstrasse 6', '6340 Baar'] as const

export const VERWENDETES_MESSGERAET = 'Fluke 1663 / Erd-Tester ET15'

/** Kopf of a Protokoll. All fields are plain text. */
export interface Kopf {
  stromkunde: string
  interneAuftragsnummer: string
  installationsAnzeigeNr: string
  zaehlerNummer: string
  ausfuehrungsort: string
  verteilung: string
  ausgefuehrteArbeiten: string
  verwendetesMessgeraet: string
  /** free text, e.g. "14.–16.10.2026" */
  zeitraumDerMessungen: string
  mitarbeiter: string
}

/** The five Prüfpunkte, in the order of the template. */
export const PRUEFPUNKTE = [
  { key: 'basisschutz', label: 'Basisschutz erfüllt' },
  { key: 'brandabschottungen', label: 'Brandabschottungen' },
  { key: 'betriebsmittel', label: 'Richtige Auswahl und Bezeichnung der Betriebsmittel' },
  { key: 'stromkreiseBezeichnung', label: 'Bemessung / Kennzeichnung der Stromkreise / Leitungen' },
  { key: 'schemas', label: 'Schemas und Legenden elektronisch nachgeführt' },
] as const

export type PruefpunktKey = (typeof PRUEFPUNKTE)[number]['key']
/** true = confirmed; false = blank (not confirmed). There is no third state. */
export type Pruefpunkte = Record<PruefpunktKey, boolean>

/** All form fields of a Protokoll besides Stromkreise and Unterschrift. */
export interface ProtokollForm {
  kopf: Kopf
  pruefpunkte: Pruefpunkte
  /** Gemessene Spannung, single value in V (e.g. "230"). Named `netzspannung` since v1; the Grenzwert check is `pruefeNetzspannung`. */
  netzspannung: string
}

export function createKopf(): Kopf {
  return {
    stromkunde: '',
    interneAuftragsnummer: '',
    installationsAnzeigeNr: '',
    zaehlerNummer: '',
    ausfuehrungsort: '',
    verteilung: '',
    ausgefuehrteArbeiten: '',
    verwendetesMessgeraet: VERWENDETES_MESSGERAET,
    zeitraumDerMessungen: '',
    mitarbeiter: '',
  }
}

export function createPruefpunkte(): Pruefpunkte {
  return Object.fromEntries(PRUEFPUNKTE.map((x) => [x.key, false])) as Pruefpunkte
}

export function createProtokollForm(): ProtokollForm {
  return { kopf: createKopf(), pruefpunkte: createPruefpunkte(), netzspannung: '' }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** Deep-merges stored (possibly partial) data over the defaults; arrays are taken as stored. */
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

/** Fills every form field missing in `stored` with its default (e.g. partial backup files). */
export function withFormDefaults<T extends object>(stored: T): T & ProtokollForm {
  const merged = mergeDeep(createProtokollForm(), stored)
  return { ...stored, ...merged } as T & ProtokollForm
}

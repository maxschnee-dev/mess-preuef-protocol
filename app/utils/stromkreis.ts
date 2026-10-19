import type { Stromkreis } from './protokoll-store'

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function createStromkreis(nr: string): Stromkreis {
  return {
    id: newId(),
    nr,
    bezeichnung: '',
    leitungArtTyp: '',
    leiterAnzahl: '',
    leiterQuerschnitt: '',
    ueberstromschutzArt: '',
    ueberstromschutzAndere: '',
    ueberstromschutzIn: '',
    rcdIn: '',
    rcdArt: '',
    rcdIdn: '',
    schutzleiter: '',
    rIso: '',
    iLeck: '',
    ikLpeAnfang: '',
    ikLpeEnde: '',
    ikLnAnfang: '',
    ikLnEnde: '',
    ausloesezeit: '',
    bemerkungen: '',
  }
}

export function addStromkreis(list: Stromkreis[]): Stromkreis[] {
  return [...list, createStromkreis(String(list.length + 1))]
}

export function updateStromkreis(list: Stromkreis[], id: string, patch: Partial<Omit<Stromkreis, 'id'>>): Stromkreis[] {
  return list.map((s) => (s.id === id ? { ...s, ...patch } : s))
}

export function removeStromkreis(list: Stromkreis[], id: string): Stromkreis[] {
  return list.filter((s) => s.id !== id)
}

/** Moves one position up (-1) or down (+1); out-of-range moves return the list unchanged. */
export function moveStromkreis(list: Stromkreis[], id: string, direction: -1 | 1): Stromkreis[] {
  const from = list.findIndex((s) => s.id === id)
  const to = from + direction
  if (from < 0 || to < 0 || to >= list.length) return list
  const next = [...list]
  next.splice(to, 0, next.splice(from, 1)[0]!)
  return next
}

/** "Vorherigen kopieren": appends a Stromkreis with the Stammdaten (not the Messwerte) of the last one. */
export function copyPrevious(list: Stromkreis[]): Stromkreis[] {
  const prev = list[list.length - 1]
  const fresh = createStromkreis(String(list.length + 1))
  if (!prev) return [...list, fresh]
  const copy: Stromkreis = {
    ...fresh,
    bezeichnung: prev.bezeichnung,
    leitungArtTyp: prev.leitungArtTyp,
    leiterAnzahl: prev.leiterAnzahl,
    leiterQuerschnitt: prev.leiterQuerschnitt,
    ueberstromschutzArt: prev.ueberstromschutzArt,
    ueberstromschutzAndere: prev.ueberstromschutzAndere,
    ueberstromschutzIn: prev.ueberstromschutzIn,
    rcdIn: prev.rcdIn,
    rcdArt: prev.rcdArt,
    rcdIdn: prev.rcdIdn,
  }
  return [...list, copy]
}

export const UEBERSTROMSCHUTZ_ARTEN: { value: Exclude<Stromkreis['ueberstromschutzArt'], ''>; label: string }[] = [
  { value: 'LS-B', label: 'LS B' },
  { value: 'LS-C', label: 'LS C' },
  { value: 'LS-D', label: 'LS D' },
  { value: 'gG', label: 'gG' },
  { value: 'andere', label: 'Andere' },
]

export const RCD_ARTEN: { value: Exclude<Stromkreis['rcdArt'], ''>; label: string }[] = [
  { value: 'A', label: 'A' },
  { value: 'AC', label: 'AC' },
  { value: 'F', label: 'F' },
  { value: 'B', label: 'B' },
  { value: 'A-S', label: 'A-S' },
  { value: 'B-S', label: 'B-S' },
  { value: 'andere', label: 'Andere' },
]

/** Route param "3" -> index 2; anything that is not a positive integer -> null. */
export function parseStromkreisNr(param: unknown): number | null {
  const s = Array.isArray(param) ? param[0] : param
  return typeof s === 'string' && /^[1-9]\d*$/.test(s) ? Number(s) - 1 : null
}

/** Index to show for a requested one: clamped into the list, first when missing/invalid, null for an empty list. */
export function clampIndex(index: number | null, length: number): number | null {
  if (length === 0) return null
  return index === null ? 0 : Math.min(Math.max(index, 0), length - 1)
}

/**
 * Brings a stored Stromkreis (possibly from before L-PE / L-N and Bemerkungen) into the current shape.
 * The old single I_K pair (ikAnfang / ikEnde) was measured Phase to PE in practice, so it becomes L-PE;
 * L-N and Bemerkungen start empty. Missing or non-string fields become ''. Unknown keys are kept.
 */
export function normalisiereStromkreis(raw: unknown): Stromkreis | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const stored = raw as Record<string, unknown>
  const { ikAnfang, ikEnde, ...rest } = stored
  const base = createStromkreis('')
  const out: Record<string, unknown> = { ...rest }
  for (const k of Object.keys(base) as (keyof Stromkreis)[]) {
    out[k] = typeof rest[k] === 'string' ? rest[k] : base[k]
  }
  if (typeof out.id !== 'string' || out.id === '') out.id = base.id
  if (out.ikLpeAnfang === '' && typeof ikAnfang === 'string') out.ikLpeAnfang = ikAnfang
  if (out.ikLpeEnde === '' && typeof ikEnde === 'string') out.ikLpeEnde = ikEnde
  return out as unknown as Stromkreis
}

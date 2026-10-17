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
    ikAnfang: '',
    ikEnde: '',
    ausloesezeit: '',
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

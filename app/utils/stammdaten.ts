/**
 * Autocomplete logic for companies and Messgeräte (ticket #7). Framework-free.
 * The lists live in the store's `companies` / `messgeraete` slots, separate
 * from the Protokolle, so they survive Protokoll deletion and are part of the
 * JSON backup.
 */

import type { Company, Messgeraet, Protokoll } from './protokoll-store'
import type { Partei } from './protokoll-form'

const norm = (s: string) => s.trim().toLowerCase()

/**
 * Merges the Auftraggeber/Auftragnehmer of all Protokolle into `existing`.
 * Dedupe by Name 1 (case/whitespace-insensitive). A later entry replaces an
 * earlier one only if it carries address data (newest address wins).
 */
export function collectCompanies(existing: Company[], protokolle: Pick<Protokoll, 'auftraggeber' | 'auftragnehmer'>[]): Company[] {
  const byKey = new Map<string, Company>()
  for (const c of existing) {
    if (norm(c.name)) byKey.set(norm(c.name), { name: c.name, name2: c.name2 ?? '', strasse: c.strasse ?? '', plzOrt: c.plzOrt ?? '' })
  }
  for (const p of protokolle) {
    for (const partei of [p.auftraggeber, p.auftragnehmer]) {
      const name = partei.name1.trim()
      if (!name) continue
      const c: Company = { name, name2: partei.name2.trim(), strasse: partei.strasse.trim(), plzOrt: partei.plzOrt.trim() }
      const hasAddress = !!(c.name2 || c.strasse || c.plzOrt)
      const key = norm(name)
      if (!byKey.has(key) || hasAddress) byKey.set(key, c)
    }
  }
  return [...byKey.values()]
}

/** Merges Messgeräte names of all Protokolle into `existing` (first spelling wins). */
export function collectMessgeraete(existing: Messgeraet[], protokolle: Pick<Protokoll, 'messgeraete'>[]): Messgeraet[] {
  const byKey = new Map<string, Messgeraet>()
  const names = [...existing.map((m) => m.name), ...protokolle.flatMap((p) => p.messgeraete)]
  for (const n of names) {
    const name = n.trim()
    if (name && !byKey.has(norm(name))) byKey.set(norm(name), { name })
  }
  return [...byKey.values()]
}

/** Entries matching the typed text: prefix matches first, then contains. Exact matches are not suggested. */
export function suggest<T extends { name: string }>(list: T[], query: string, limit = 5): T[] {
  const q = norm(query)
  if (!q) return []
  const starts = list.filter((x) => norm(x.name).startsWith(q) && norm(x.name) !== q)
  const contains = list.filter((x) => !norm(x.name).startsWith(q) && norm(x.name).includes(q))
  return [...starts, ...contains].slice(0, limit)
}

export interface FillPlan {
  patch: Pick<Partei, 'name1'> & Partial<Pick<Partei, 'name2' | 'strasse' | 'plzOrt'>>
  /** true if a target field already holds a different non-empty value; the caller must ask before applying */
  conflict: boolean
}

/**
 * What picking `company` would write into `partei` (Name 1, Name 2, Strasse,
 * PLZ/Ort; Art stays). Empty company fields are never written. A field is a
 * conflict if it holds a different non-empty value; Name 1 only if it isn't the
 * search text that matched the suggestion (see `suggest`).
 */
export function planFill(partei: Partei, company: Company): FillPlan {
  const patch: FillPlan['patch'] = { name1: company.name }
  let conflict = !!partei.name1.trim() && !norm(company.name).includes(norm(partei.name1))
  for (const f of ['name2', 'strasse', 'plzOrt'] as const) {
    if (!company[f]) continue
    patch[f] = company[f]
    if (partei[f].trim() && norm(partei[f]) !== norm(company[f])) conflict = true
  }
  return { patch, conflict }
}

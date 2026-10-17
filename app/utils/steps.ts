export const STEPS = [
  { key: 'auftrag', label: 'Auftrag' },
  { key: 'pruefungen', label: 'Prüfungen' },
  { key: 'stromkreise', label: 'Stromkreise' },
  { key: 'abschluss', label: 'Abschluss' },
] as const

export type StepKey = (typeof STEPS)[number]['key']

export const isStepKey = (v: unknown): v is StepKey => STEPS.some((s) => s.key === v)

/** Neighbouring steps; `null` at the ends (Zurück of the first step leads to the home screen). */
export function neighbours(key: StepKey): { prev: StepKey | null; next: StepKey | null } {
  const i = STEPS.findIndex((s) => s.key === key)
  return { prev: STEPS[i - 1]?.key ?? null, next: STEPS[i + 1]?.key ?? null }
}

export const stepPath = (id: string, key: StepKey) => `/protokoll/${id}/${key}`

/** Step key of a `/protokoll/<id>/<step>[/...]` path (sub-routes like `/stromkreise/2` count as their step). */
export function stepFromPath(path: string): StepKey | null {
  const key = path.match(/^\/protokoll\/[^/]+\/([^/?#]+)/)?.[1]
  return isStepKey(key) ? key : null
}

/** Route of one Stromkreis; `nr` is its 1-based position in the list. */
export const stromkreisPath = (id: string, nr: number) => `${stepPath(id, 'stromkreise')}/${nr}`

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

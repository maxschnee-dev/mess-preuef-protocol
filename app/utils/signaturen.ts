/** Finger signatures + lock (ticket #8). Pure, framework-free. */

export interface Signatur {
  name: string
  /** ISO date (YYYY-MM-DD) or '' */
  datum: string
  /** PNG data URL (embedded in the PDF later) or '' = not signed */
  bild: string
}

export type Unterzeichner = 'kontrolleur' | 'unternehmer'

export interface Signaturen {
  /** Elektro-Kontrolleur */
  kontrolleur: Signatur
  /** Verantwortlicher Unternehmer */
  unternehmer: Signatur
}

export const UNTERZEICHNER_LABELS: Record<Unterzeichner, string> = {
  kontrolleur: 'Elektro-Kontrolleur',
  unternehmer: 'Verantwortlicher Unternehmer',
}

export const leereSignatur = (): Signatur => ({ name: '', datum: '', bild: '' })
export const leereSignaturen = (): Signaturen => ({ kontrolleur: leereSignatur(), unternehmer: leereSignatur() })

export function isSignatureComplete(s: Signatur): boolean {
  return s.bild.startsWith('data:image/png')
}

export function isGesperrt(p: { gesperrt: boolean } | null | undefined): boolean {
  return !!p?.gesperrt
}

/** Patch that signs and locks. */
export function signPatch(p: { signaturen: Signaturen }, who: Unterzeichner, s: Signatur) {
  return { signaturen: { ...p.signaturen, [who]: { ...s } }, gesperrt: true }
}

/** Patch that removes both signatures and unlocks. */
export function unlockPatch() {
  return { signaturen: leereSignaturen(), gesperrt: false }
}

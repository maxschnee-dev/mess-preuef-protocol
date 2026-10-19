/** Finger signatures + lock (ticket #8). Pure, framework-free. */

export interface Signatur {
  name: string
  /** ISO date (YYYY-MM-DD) or '' */
  datum: string
  /** PNG data URL (embedded in the PDF later) or '' = not signed */
  bild: string
}

export const leereSignatur = (): Signatur => ({ name: '', datum: '', bild: '' })

/** Draft for the Mitarbeiter about to sign: name pre-filled from the Kopf, Datum = `heute` (YYYY-MM-DD). */
export function entwurfSignatur(kopf: { mitarbeiter: string }, heute: string): Signatur {
  return { name: kopf.mitarbeiter, datum: heute, bild: '' }
}

export function isSignatureComplete(s: Signatur): boolean {
  return s.bild.startsWith('data:image/png')
}

export function isGesperrt(p: { gesperrt: boolean } | null | undefined): boolean {
  return !!p?.gesperrt
}

/** Patch that signs and locks. An empty signer name falls back to the Mitarbeiter of the Kopf. */
export function signPatch(p: { kopf: { mitarbeiter: string } }, s: Signatur) {
  return { signatur: { ...s, name: s.name.trim() || p.kopf.mitarbeiter }, gesperrt: true }
}

/** Patch that removes the Unterschrift and unlocks. */
export function unlockPatch() {
  return { signatur: leereSignatur(), gesperrt: false }
}

/**
 * Protokolle stored before #23 carry `signaturen: { kontrolleur, unternehmer }`. The Mitarbeiter
 * Unterschrift is the Kontrolleur one, else the Unternehmer one. A locked Protokoll without any
 * usable Unterschrift is unlocked; an empty signer name is taken from the Kopf.
 */
export function migriereSignatur<T extends { kopf: { mitarbeiter: string }, gesperrt: boolean, signatur?: Signatur }>(stored: T & { signaturen?: unknown }): Omit<T, 'signaturen'> & { signatur: Signatur } {
  const { signaturen, ...rest } = stored
  const alt = (signaturen && typeof signaturen === 'object' ? signaturen : {}) as Partial<Record<'kontrolleur' | 'unternehmer', Signatur>>
  const kandidaten = [stored.signatur, alt.kontrolleur, alt.unternehmer]
  const gefunden = kandidaten.find((s): s is Signatur => !!s && typeof s.bild === 'string' && isSignatureComplete(s))
  const signatur = gefunden
    ? { name: (gefunden.name ?? '').trim() || stored.kopf.mitarbeiter, datum: gefunden.datum ?? '', bild: gefunden.bild }
    : leereSignatur()
  return { ...rest, signatur, gesperrt: stored.gesperrt && !!gefunden }
}

export interface Masse {
  breite: number
  hoehe: number
}

/**
 * Where an existing drawing goes when the pad changes size (e.g. phone rotated): uniform scale so
 * nothing is distorted or cut off, centred in the new pad. Sizes are in CSS pixels.
 */
export function einpassen(alt: Masse, neu: Masse): { faktor: number, dx: number, dy: number } {
  const faktor = Math.min(neu.breite / alt.breite, neu.hoehe / alt.hoehe)
  return { faktor, dx: (neu.breite - alt.breite * faktor) / 2, dy: (neu.hoehe - alt.hoehe * faktor) / 2 }
}

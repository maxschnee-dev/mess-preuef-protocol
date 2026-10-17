/** Digitale Signatur certificate record (ADR-0005). Pure data helpers; crypto lives in `pdf-sign`. */

export interface Zertifikat {
  /** certificate CN */
  name: string
  certPem: string
  keyPem: string
  /** ISO timestamp */
  erstellt: string
}

export const ZERTIFIKAT_FALLBACK_NAME = 'Mess- + Prüfprotokoll'

export function zertifikatName(name1: string): string {
  return name1.trim() || ZERTIFIKAT_FALLBACK_NAME
}

export function isZertifikat(v: unknown): v is Zertifikat {
  const z = v as Partial<Zertifikat> | null
  return !!z && typeof z === 'object' && typeof z.name === 'string' && typeof z.certPem === 'string' && typeof z.keyPem === 'string'
    && z.certPem.includes('BEGIN CERTIFICATE') && z.keyPem.includes('PRIVATE KEY')
}

/** Most recent non-empty Auftragnehmer Name 1 (last Protokoll wins). */
export function letzterAuftragnehmer(protokolle: { auftragnehmer: { name1: string } }[]): string {
  for (let i = protokolle.length - 1; i >= 0; i--) {
    const n = protokolle[i]!.auftragnehmer.name1.trim()
    if (n) return n
  }
  return ''
}

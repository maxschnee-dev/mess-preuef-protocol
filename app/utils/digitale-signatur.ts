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

export function zertifikatName(name: string): string {
  return name.trim() || ZERTIFIKAT_FALLBACK_NAME
}

export function isZertifikat(v: unknown): v is Zertifikat {
  const z = v as Partial<Zertifikat> | null
  return !!z && typeof z === 'object' && typeof z.name === 'string' && typeof z.certPem === 'string' && typeof z.keyPem === 'string'
    && z.certPem.includes('BEGIN CERTIFICATE') && z.keyPem.includes('PRIVATE KEY')
}

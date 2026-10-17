/**
 * Protokoll model and persistence (framework-free; wrapped by `useProtokolle`).
 * Everything lives under ONE localStorage key so writes are atomic.
 */

import { isGesperrt, isSignatureComplete, leereSignaturen, signPatch, unlockPatch, type Signatur, type Signaturen, type Unterzeichner } from './signaturen'
import { isZertifikat, type Zertifikat } from './digitale-signatur'
import { createProtokollForm, withFormDefaults, type ProtokollForm } from './protokoll-form'

export const SCHEMA_VERSION = 1
export const STORAGE_KEY = 'mpp:v1:state'

/** Überstromschutz Art/Charakteristik ('' = not set). */
export type UeberstromschutzArt = '' | 'LS-B' | 'LS-C' | 'LS-D' | 'gG' | 'andere'
/** RCD (FI) type ('' = no RCD / not set). */
export type RcdArt = '' | 'A' | 'AC' | 'F' | 'B' | 'A-S' | 'B-S' | 'andere'

/**
 * One Stromkreis. All free-form values are strings (raw input, '' = not
 * measured / not set) so validation (#6) can parse them as needed.
 */
export interface Stromkreis {
  id: string
  // Stammdaten
  nr: string
  bezeichnung: string
  leitungArtTyp: string
  leiterAnzahl: string
  leiterQuerschnitt: string
  ueberstromschutzArt: UeberstromschutzArt
  /** Free text, only meaningful when ueberstromschutzArt === 'andere'. */
  ueberstromschutzAndere: string
  /** I_N in A */
  ueberstromschutzIn: string
  /** RCD I_N in A */
  rcdIn: string
  rcdArt: RcdArt
  /** RCD I_ΔN in mA */
  rcdIdn: string
  // Spannungsfrei-Messungen
  /** Leitfähigkeit Schutzleiter (Durchgang) in Ω */
  schutzleiter: string
  /** R_ISO in MΩ */
  rIso: string
  /** I_Leck in mA */
  iLeck: string
  // Messungen unter Spannung
  /** I_K Anfang in A */
  ikAnfang: string
  /** I_K Ende in A */
  ikEnde: string
  /** RCD-Auslösezeit in ms */
  ausloesezeit: string
}

/** Autocomplete store entries (ticket #7). `name` is the Partei's Name 1. */
export interface Company {
  name: string
  name2: string
  strasse: string
  plzOrt: string
}
export interface Messgeraet {
  name: string
}

export interface Protokoll extends ProtokollForm {
  schemaVersion: number
  id: string
  /** ISO date (YYYY-MM-DD) or '' */
  kontrolldatum: string
  ortDerInstallation: string
  stromkreise: Stromkreis[]
  /** Finger signatures (#8) */
  signaturen: Signaturen
  /** true once signed: the whole Protokoll is read-only (store guard + UI) */
  gesperrt: boolean
}

export interface BackupData {
  schemaVersion: number
  protokolle: Protokoll[]
  selectedId: string | null
  companies: Company[]
  messgeraete: Messgeraet[]
  /** Digitale Signatur certificate (key + cert); absent in older backups */
  zertifikat: Zertifikat | null
}

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function createProtokoll(): Protokoll {
  return { schemaVersion: SCHEMA_VERSION, id: newId(), kontrolldatum: '', ortDerInstallation: '', stromkreise: [], signaturen: leereSignaturen(), gesperrt: false, ...createProtokollForm() }
}

/** "01.10.2026 · Bern" */
export function protokollLabel(p: Pick<Protokoll, 'kontrolldatum' | 'ortDerInstallation'>): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.kontrolldatum)
  const datum = m ? `${m[3]}.${m[2]}.${m[1]}` : p.kontrolldatum || 'Ohne Datum'
  return `${datum} · ${p.ortDerInstallation || 'Ohne Ort'}`
}

function parseBackup(json: string): BackupData {
  const raw = JSON.parse(json) as Partial<BackupData> | null
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.protokolle)) {
    throw new Error('Ungültige Sicherungsdatei')
  }
  // Migrations from older schemaVersions go here.
  const protokolle = raw.protokolle.map((p) => withFormDefaults({ ...createProtokoll(), ...p }))
  const selectedId = protokolle.some((p) => p.id === raw.selectedId) ? raw.selectedId! : (protokolle[0]?.id ?? null)
  return {
    schemaVersion: SCHEMA_VERSION,
    protokolle,
    selectedId,
    companies: Array.isArray(raw.companies) ? raw.companies : [],
    messgeraete: Array.isArray(raw.messgeraete) ? raw.messgeraete : [],
    zertifikat: isZertifikat(raw.zertifikat) ? raw.zertifikat : null,
  }
}

export function createProtokollStore(storage: KeyValueStorage) {
  let data: BackupData = { schemaVersion: SCHEMA_VERSION, protokolle: [], selectedId: null, companies: [], messgeraete: [], zertifikat: null }
  const listeners = new Set<() => void>()

  try {
    const stored = storage.getItem(STORAGE_KEY)
    if (stored) data = parseBackup(stored)
  } catch {
    // corrupt data: start empty
  }

  function commit() {
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
    listeners.forEach((l) => l())
  }

  return {
    get protokolle() { return data.protokolle },
    get selectedId() { return data.selectedId },
    get companies() { return data.companies },
    get messgeraete() { return data.messgeraete },
    get zertifikat() { return data.zertifikat },
    get selected(): Protokoll | null { return data.protokolle.find((p) => p.id === data.selectedId) ?? null },

    /** Notified after every persisted change. Returns an unsubscribe function. */
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },

    create(): Protokoll {
      const p = createProtokoll()
      data.protokolle = [...data.protokolle, p]
      data.selectedId = p.id
      commit()
      return p
    },
    /** Returns false (and changes nothing) if the Protokoll is locked or unknown. Use sign/unlock for the lock. */
    update(id: string, patch: Partial<Omit<Protokoll, 'id' | 'schemaVersion' | 'signaturen' | 'gesperrt'>>): boolean {
      const target = data.protokolle.find((p) => p.id === id)
      if (!target || isGesperrt(target)) return false
      data.protokolle = data.protokolle.map((p) => (p.id === id ? { ...p, ...patch } : p))
      commit()
      return true
    },
    /** Stores the signature and locks the Protokoll. False if unknown or no drawing. */
    sign(id: string, who: Unterzeichner, signatur: Signatur): boolean {
      const target = data.protokolle.find((p) => p.id === id)
      if (!target || !isSignatureComplete(signatur)) return false
      data.protokolle = data.protokolle.map((p) => (p.id === id ? { ...p, ...signPatch(p, who, signatur) } : p))
      commit()
      return true
    },
    /** Clears both signatures and unlocks (UI must ask first). */
    unlock(id: string) {
      if (!data.protokolle.some((p) => p.id === id)) return
      data.protokolle = data.protokolle.map((p) => (p.id === id ? { ...p, ...unlockPatch() } : p))
      commit()
    },
    select(id: string) {
      if (!data.protokolle.some((p) => p.id === id)) return
      data.selectedId = id
      commit()
    },
    duplicate(id: string): Protokoll | null {
      const src = data.protokolle.find((p) => p.id === id)
      if (!src) return null
      const copy: Protokoll = { ...structuredClone(src), id: newId(), ...unlockPatch() }
      data.protokolle = [...data.protokolle, copy]
      data.selectedId = copy.id
      commit()
      return copy
    },
    remove(id: string) {
      data.protokolle = data.protokolle.filter((p) => p.id !== id)
      if (data.selectedId === id) data.selectedId = data.protokolle[0]?.id ?? null
      commit()
    },
    setStammdaten(s: { companies?: Company[]; messgeraete?: Messgeraet[] }) {
      if (s.companies) data.companies = s.companies
      if (s.messgeraete) data.messgeraete = s.messgeraete
      commit()
    },

    setZertifikat(z: Zertifikat | null) {
      data.zertifikat = z
      commit()
    },

    exportJson(): string {
      return JSON.stringify(data, null, 2)
    },
    /** Replaces everything. Throws (and changes nothing) on invalid input. */
    importJson(json: string) {
      data = parseBackup(json)
      commit()
    },
  }
}

export type ProtokollStore = ReturnType<typeof createProtokollStore>

/**
 * Protokoll model and persistence (framework-free; wrapped by `useProtokolle`).
 * Everything lives under ONE localStorage key so writes are atomic.
 */

import { isGesperrt, isSignatureComplete, leereSignaturen, signPatch, unlockPatch, type Signatur, type Signaturen, type Unterzeichner } from './signaturen'
import { isZertifikat, type Zertifikat } from './digitale-signatur'
import { createProtokollForm, withFormDefaults, type ProtokollForm } from './protokoll-form'

/** 2 = Equans Erstprüfungsprotokoll (ADR 0001); VSEI 133-D Protokolle (1) are dropped on load/import. */
export const SCHEMA_VERSION = 2
/** Key kept from v1 because the same state also holds the Digitale-Signatur Zertifikat, which must survive. */
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
  // Stammdaten of the Stromkreis
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

export interface Protokoll extends ProtokollForm {
  schemaVersion: number
  id: string
  /** ISO timestamp of the last edit */
  geaendert: string
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
  /** Digitale Signatur certificate (key + cert); absent in older backups */
  zertifikat: Zertifikat | null
}

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const now = () => new Date().toISOString()

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function createProtokoll(): Protokoll {
  return { schemaVersion: SCHEMA_VERSION, id: newId(), geaendert: now(), stromkreise: [], signaturen: leereSignaturen(), gesperrt: false, ...createProtokollForm() }
}

/** "Ausführungsort · Verteilung · Zeitraum der Messungen"; empty parts are left out. */
export function protokollLabel(p: Pick<Protokoll, 'kopf'>): string {
  const k = p.kopf
  return [k.ausfuehrungsort, k.verteilung, k.zeitraumDerMessungen].map((t) => t.trim()).filter(Boolean).join(' · ') || 'Ohne Angaben'
}

/** "19.10.2026 14:32" (local time) */
export function formatGeaendert(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const z = (n: number) => String(n).padStart(2, '0')
  return `${z(d.getDate())}.${z(d.getMonth() + 1)}.${d.getFullYear()} ${z(d.getHours())}:${z(d.getMinutes())}`
}

function parseBackup(json: string): BackupData {
  const raw = JSON.parse(json) as Partial<BackupData> | null
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.protokolle)) {
    throw new Error('Ungültige Sicherungsdatei')
  }
  // Older schemaVersions are VSEI 133-D Protokolle: dropped, not migrated (ADR 0001). The Zertifikat is kept.
  const aktuell = typeof raw.schemaVersion === 'number' && raw.schemaVersion >= SCHEMA_VERSION
  const protokolle = (aktuell ? raw.protokolle : []).map((p) => withFormDefaults({ ...createProtokoll(), ...p }))
  const selectedId = protokolle.some((p) => p.id === raw.selectedId) ? raw.selectedId! : (protokolle[0]?.id ?? null)
  return {
    schemaVersion: SCHEMA_VERSION,
    protokolle,
    selectedId,
    zertifikat: isZertifikat(raw.zertifikat) ? raw.zertifikat : null,
  }
}

export function createProtokollStore(storage: KeyValueStorage) {
  let data: BackupData = { schemaVersion: SCHEMA_VERSION, protokolle: [], selectedId: null, zertifikat: null }
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
    update(id: string, patch: Partial<Omit<Protokoll, 'id' | 'schemaVersion' | 'geaendert' | 'signaturen' | 'gesperrt'>>): boolean {
      const target = data.protokolle.find((p) => p.id === id)
      if (!target || isGesperrt(target)) return false
      data.protokolle = data.protokolle.map((p) => (p.id === id ? { ...p, ...patch, geaendert: now() } : p))
      commit()
      return true
    },
    /** Stores the signature and locks the Protokoll. False if unknown or no drawing. */
    sign(id: string, who: Unterzeichner, signatur: Signatur): boolean {
      const target = data.protokolle.find((p) => p.id === id)
      if (!target || !isSignatureComplete(signatur)) return false
      data.protokolle = data.protokolle.map((p) => (p.id === id ? { ...p, ...signPatch(p, who, signatur), geaendert: now() } : p))
      commit()
      return true
    },
    /** Clears both signatures and unlocks (UI must ask first). */
    unlock(id: string) {
      if (!data.protokolle.some((p) => p.id === id)) return
      data.protokolle = data.protokolle.map((p) => (p.id === id ? { ...p, ...unlockPatch(), geaendert: now() } : p))
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
      const copy: Protokoll = { ...structuredClone(src), id: newId(), geaendert: now(), ...unlockPatch() }
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

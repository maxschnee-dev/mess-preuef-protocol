import { describe, expect, it } from 'vitest'
import { buildDocDefinition, pdfFilename } from '../app/utils/pdf-doc'
import { createProtokoll, type Protokoll } from '../app/utils/protokoll-store'
import { addStromkreis, updateStromkreis } from '../app/utils/stromkreis'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

type Node = Record<string, any>
/** all nodes of a doc definition tree, depth first */
function walk(n: unknown, out: Node[] = []): Node[] {
  if (Array.isArray(n)) n.forEach((c) => walk(c, out))
  else if (n && typeof n === 'object') {
    out.push(n as Node)
    Object.values(n).forEach((c) => walk(c, out))
  }
  return out
}
const texts = (doc: unknown) => walk((doc as Node).content).flatMap((n) => (typeof n.text === 'string' ? [n.text] : []))
const tableWith = (doc: unknown, header: string) =>
  walk((doc as Node).content).find((n) => n.table && JSON.stringify(n.table.body[0]).includes(header))!

function filled(): Protokoll {
  const p = createProtokoll()
  p.kopf = {
    stromkunde: 'Muster AG', interneAuftragsnummer: 'A-4711', installationsAnzeigeNr: 'IA-77', zaehlerNummer: '55512',
    ausfuehrungsort: 'Musterweg 3, Bern', verteilung: 'HV 1', ausgefuehrteArbeiten: 'Neuinstallation',
    verwendetesMessgeraet: 'Fluke 1663 / Erd-Tester ET15', zeitraumDerMessungen: '14.–16.10.2026', mitarbeiter: 'Hans Muster',
  }
  return p
}

describe('buildDocDefinition', () => {
  it('prints the Kopf values', () => {
    const t = texts(buildDocDefinition(filled()))
    for (const v of ['Muster AG', 'A-4711', 'IA-77', '55512', 'Musterweg 3, Bern', 'HV 1', 'Neuinstallation', 'Fluke 1663 / Erd-Tester ET15', '14.–16.10.2026', 'Hans Muster']) {
      expect(t).toContain(v)
    }
  })

  it('leaves out the removed VSEI sections', () => {
    const json = JSON.stringify(buildDocDefinition(filled()))
    for (const w of ['VSEI', 'Auftraggeber', 'Auftragnehmer', 'Kontrolldatum', 'Sichtprüfung', 'Funktionsprüfung', 'Prüfergebnis', 'Anlageteil']) {
      expect(json).not.toContain(w)
    }
  })

  it('is landscape A4 with a "Seite x von y" footer', () => {
    const doc = buildDocDefinition(filled()) as Node
    expect(doc.pageSize).toBe('A4')
    expect(doc.pageOrientation).toBe('landscape')
    expect(doc.footer(2, 5)).toMatchObject({ text: expect.stringContaining('Seite 2 von 5') })
  })

  it('lists all 25 Stromkreise in a table whose header repeats on new pages', () => {
    const p = filled()
    for (let i = 0; i < 25; i++) p.stromkreise = addStromkreis(p.stromkreise)
    p.stromkreise = updateStromkreis(p.stromkreise, p.stromkreise[24]!.id, { bezeichnung: 'Waschküche', rIso: '500' })
    const t = tableWith(buildDocDefinition(p), 'Bezeichnung').table
    expect(t.headerRows).toBe(2)
    expect(t.body).toHaveLength(t.headerRows + 25)
    const last = t.body[t.body.length - 1].map((c: Node) => c.text)
    expect(last).toContain('Waschküche')
    expect(last).toContain('500')
    expect(last).toContain('25')
    expect(t.body.every((r: unknown[]) => r.length === t.body[0].length)).toBe(true)
  })

  it('embeds signature images only when signed', () => {
    const p = filled()
    expect(walk((buildDocDefinition(p) as Node).content).some((n) => n.image)).toBe(false)
    p.signaturen.kontrolleur = { name: 'Hans Muster', datum: '2026-10-02', bild: PNG }
    const doc = buildDocDefinition(p)
    expect(walk((doc as Node).content).filter((n) => n.image === PNG)).toHaveLength(1)
    expect(texts(doc)).toContain('Hans Muster')
    expect(texts(doc)).toContain('02.10.2026')
  })

  it('adds the legend page only when opted in', () => {
    const without = JSON.stringify(buildDocDefinition(filled()))
    const withLegend = buildDocDefinition(filled(), { legende: true })
    expect(without).not.toContain('Legende')
    expect(texts(withLegend)).toContain('Legende')
    expect(walk((withLegend as Node).content).some((n) => n.pageBreak === 'before')).toBe(true)
  })

  it('never blocks: an empty Protokoll still builds', () => {
    expect(() => buildDocDefinition(createProtokoll())).not.toThrow()
  })
})

describe('pdfFilename', () => {
  it('combines Ausführungsort, Verteilung and Zeitraum in a file-safe way', () => {
    expect(pdfFilename(filled())).toBe('Musterweg-3-Bern_HV-1_14-16-10-2026.pdf')
    expect(pdfFilename(createProtokoll())).toBe('Protokoll.pdf')
  })
})

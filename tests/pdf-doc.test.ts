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
  const p: Protokoll = { ...createProtokoll(), kontrolldatum: '2026-10-01', ortDerInstallation: 'Musterweg 3, Bern' }
  p.auftraggeber = { art: 'eigentuemer', name1: 'Muster AG', name2: '', strasse: 'Hauptstr. 1', plzOrt: '3000 Bern' }
  p.installation.gebaeudeart = 'Wohnhaus'
  p.netzspannung = '230/400 V'
  p.bemerkungen = 'Alles gut'
  p.messgeraete = ['Fluke 1664']
  p.sichtpruefung.checks.potentialausgleich = true
  return p
}

describe('buildDocDefinition', () => {
  it('prints the header values', () => {
    const t = texts(buildDocDefinition(filled()))
    expect(t).toContain('Muster AG')
    expect(t).toContain('3000 Bern')
    expect(t).toContain('Wohnhaus')
    expect(t).toContain('01.10.2026')
    expect(t).toContain('Musterweg 3, Bern')
    expect(t).toContain('230/400 V')
    expect(t).toContain('Fluke 1664')
    expect(t).toContain('Alles gut')
  })

  it('is landscape A4 with a "Seite x von y" footer', () => {
    const doc = buildDocDefinition(filled()) as Node
    expect(doc.pageSize).toBe('A4')
    expect(doc.pageOrientation).toBe('landscape')
    expect(doc.footer(2, 5)).toMatchObject({ text: expect.stringContaining('Seite 2 von 5') })
  })

  it('draws a checked and an unchecked box for Sichtprüfung items', () => {
    const doc = buildDocDefinition(filled())
    const boxes = walk((doc as Node).content).filter((n) => n.checkbox !== undefined)
    const byLabel = (label: string) => boxes.find((b) => b.label === label)!
    expect(byLabel('Potentialausgleich').checkbox).toBe(true)
    expect(byLabel('Brandschutz, Abschottungen').checkbox).toBe(false)
    // a checked box has strokes (an X), an unchecked one only the frame
    const lines = (b: Node) => walk(b.columns).filter((n) => n.type === 'line').length
    expect(lines(byLabel('Potentialausgleich'))).toBeGreaterThan(lines(byLabel('Brandschutz, Abschottungen')))
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
  it('combines Kontrolldatum and Ort in a file-safe way', () => {
    expect(pdfFilename(filled())).toBe('2026-10-01_Musterweg-3-Bern.pdf')
    expect(pdfFilename(createProtokoll())).toBe('Protokoll.pdf')
  })
})

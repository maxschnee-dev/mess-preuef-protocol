import { describe, expect, it } from 'vitest'
import { buildDocDefinition, pdfFilename, STROMKREISE_AUF_SEITE_1 } from '../app/utils/pdf-doc'
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
const headerOf = (doc: unknown, page = 1, pages = 1) => (doc as Node).header(page, pages) as Node
const headerTexts = (doc: unknown, page = 1, pages = 1) => walk(headerOf(doc, page, pages)).flatMap((n) => (typeof n.text === 'string' ? [n.text] : []))
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
  it('prints the Kopf values in the page header, so they repeat on every page', () => {
    const doc = buildDocDefinition(filled())
    for (const page of [1, 2, 3]) {
      const t = headerTexts(doc, page, 3)
      for (const v of ['Muster AG', 'A-4711', 'IA-77', '55512', 'Musterweg 3, Bern', 'HV 1', 'Neuinstallation', 'Fluke 1663 / Erd-Tester ET15', '14.–16.10.2026', 'Hans Muster']) {
        expect(t).toContain(v)
      }
    }
    expect(texts(doc)).not.toContain('Muster AG')
  })

  it('prints the fixed Elektro-Installateur block and the logo in the header', () => {
    const doc = buildDocDefinition(filled(), { logo: PNG })
    const t = headerTexts(doc, 2, 2)
    expect(t).toContain('Equans Switzerland Facility Management AG')
    expect(t).toContain('Baarermattstrasse 6')
    expect(t).toContain('6340 Baar')
    expect(walk(headerOf(doc)).filter((n) => n.image === PNG)).toHaveLength(1)
    expect(walk(headerOf(buildDocDefinition(filled()))).some((n) => n.image)).toBe(false)
  })

  it('keeps the page header clear of the content', () => {
    const doc = buildDocDefinition(filled()) as Node
    expect(doc.pageMargins[1]).toBeGreaterThanOrEqual(100)
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

  it('has the template column groups in order, with the Stromkreis columns under them', () => {
    const t = tableWith(buildDocDefinition(filled()), 'Ort / Anlagenteil').table
    const groups = t.body[0].map((c: Node) => c.text).filter(Boolean)
    expect(groups).toEqual([
      'Stromkreis Nr.', 'Ort / Anlagenteil', 'Leitung / Kabel', 'Überstromschutz-Einrichtungen',
      'Messungen (gemessener Wert)', 'Fehlerstromschutz-Einrichtungen (RCD)', 'Weiteres / Bemerkungen',
    ])
    expect(t.body[1].map((c: Node) => c.text).filter(Boolean)).toEqual([
      'Art / Typ', 'Anz.', 'mm²', 'Art', 'I_N [A]',
      'Schutzleiter [Ω]', 'R_ISO [MΩ]', 'I_Leck [mA]', 'I_K Anfang [A]', 'I_K Ende [A]',
      'I_N [A]', 'Art', 'I_ΔN [mA]', 'Auslösezeit [ms]',
    ])
    expect(t.widths).toHaveLength(t.body[0].length)
  })

  it('puts a Stromkreis into the columns of its groups', () => {
    const p = filled()
    p.stromkreise = addStromkreis([])
    p.stromkreise = updateStromkreis(p.stromkreise, p.stromkreise[0]!.id, { bezeichnung: 'Waschküche', schutzleiter: '0.2', rIso: '500', ikEnde: '300', rcdIdn: '30', ausloesezeit: '22' })
    const t = tableWith(buildDocDefinition(p), 'Ort / Anlagenteil').table
    const row = t.body[2].map((c: Node) => c.text)
    expect(row).toHaveLength(17)
    expect(row.slice(0, 2)).toEqual(['1', 'Waschküche'])
    expect(row.slice(7, 12)).toEqual(['0.2', '500', '', '', '300'])
    expect(row.slice(14, 16)).toEqual(['30', '22'])
    expect(row[16]).toBe('')
  })

  it('lists all 25 Stromkreise, the first ones on page 1 and the rest in a table on a new page', () => {
    const p = filled()
    for (let i = 0; i < 25; i++) p.stromkreise = addStromkreis(p.stromkreise)
    p.stromkreise = updateStromkreis(p.stromkreise, p.stromkreise[24]!.id, { bezeichnung: 'Waschküche', rIso: '500' })
    const tables = (doc: unknown) => ((doc as Node).content as Node[]).filter((n) => n.table && JSON.stringify(n.table.body[0]).includes('Ort / Anlagenteil'))
    const [first, rest, ...more] = tables(buildDocDefinition(p))
    expect(more).toHaveLength(0)
    expect(first!.pageBreak).toBeUndefined()
    expect(first!.table.body).toHaveLength(2 + STROMKREISE_AUF_SEITE_1)
    expect(rest!.pageBreak).toBe('before')
    expect(rest!.table.headerRows).toBe(2)
    expect(rest!.table.body).toHaveLength(2 + 25 - STROMKREISE_AUF_SEITE_1)
    const last = rest!.table.body[rest!.table.body.length - 1].map((c: Node) => c.text)
    expect(last).toContain('Waschküche')
    expect(last).toContain('500')
    expect(last).toContain('25')
    expect(rest!.table.body.every((r: unknown[]) => r.length === rest!.table.body[0].length)).toBe(true)
  })

  it('keeps everything on one page for few Stromkreise', () => {
    const p = filled()
    for (let i = 0; i < STROMKREISE_AUF_SEITE_1; i++) p.stromkreise = addStromkreis(p.stromkreise)
    const content = (buildDocDefinition(p) as Node).content as Node[]
    expect(content.some((n) => n.pageBreak)).toBe(false)
  })

  it('reserves room on page 1, after the first Stromkreise, for Prüfpunkte, Gemessene Spannung and Unterschrift Mitarbeiter', () => {
    const p = filled()
    for (let i = 0; i < 20; i++) p.stromkreise = addStromkreis(p.stromkreise)
    const content = (buildDocDefinition(p) as Node).content as Node[]
    const row = content.findIndex((n) => n.columns)
    expect(row).toBe(1) // directly after the page-1 table, before the page break of the next one
    expect(content[2]!.pageBreak).toBe('before')
    const titles = walk(content[row]).flatMap((n) => (typeof n.text === 'string' ? [n.text] : []))
    expect(titles).toEqual(expect.arrayContaining(['Prüfpunkte', 'Gemessene Spannung', 'Unterschrift Mitarbeiter']))
  })

  it('prints the Gemessene Spannung that exists today', () => {
    const p = filled()
    p.netzspannung = '231'
    expect(texts(buildDocDefinition(p))).toContain('231 V')
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

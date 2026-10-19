/**
 * Maps a Protokoll to a pdfmake document definition (ADR-0002). Pure and framework-free;
 * rendering/sharing lives in `~/utils/pdf-export`. Layout: A4 landscape (the Stromkreis table has
 * 16 columns), Kopf of the Equans Erstprüfungsprotokoll first. Verstoesse are not rendered.
 */
import { ELEKTRO_INSTALLATEUR } from './protokoll-form'
import { protokollLabel, type Protokoll, type Stromkreis } from './protokoll-store'
import type { Signatur } from './signaturen'
import { RCD_ARTEN, UEBERSTROMSCHUTZ_ARTEN } from './stromkreis'

/** pdfmake's doc definition; kept loose so this module needs no pdfmake import (lazy-loaded elsewhere). */
export type DocDefinition = Record<string, any>
type Node = Record<string, any>

export interface PdfOptions {
  /** append the legend page (page 2) */
  legende?: boolean
  /** adds the footer note that the PDF carries a Digitale Signatur */
  digitalSigniert?: boolean
}

export const DIGITAL_SIGNIERT_HINWEIS = 'Digital signiert – jede Änderung macht die Signatur ungültig.'

const TEAL = '#0f766e'
const GREY = '#e5e7eb'

export function formatDatum(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso
}

/** "Ausführungsort_Verteilung_Zeitraum" in a file-safe way */
export function pdfFilename(p: Pick<Protokoll, 'kopf'>): string {
  const k = p.kopf
  const teile = [k.ausfuehrungsort, k.verteilung, k.zeitraumDerMessungen]
    .map((t) => t.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
  return `${teile.join('_') || 'Protokoll'}.pdf`
}

// ---- building blocks -------------------------------------------------------

/** label above a value; the value is its own text node */
function field(label: string, value: string): Node {
  return { stack: [{ text: label, style: 'label' }, { text: value || ' ', style: 'value' }], margin: [0, 0, 0, 3] }
}

const boxLayout = {
  hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#6b7280', vLineColor: () => '#6b7280',
  paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 2, paddingBottom: () => 2,
}

function section(title: string, body: Node[] | Node): Node {
  return {
    table: {
      widths: ['*'],
      body: [[{ text: title, style: 'sectionTitle', fillColor: GREY }], [{ stack: Array.isArray(body) ? body : [body] }]],
    },
    layout: boxLayout,
  }
}

// ---- Stromkreis table ------------------------------------------------------

const SK_WIDTHS = [20, '*', 62, 22, 26, 34, 26, 26, 24, 26, 38, 34, 30, 34, 34, 34]

function cell(text: string, extra: Node = {}): Node {
  return { text, style: 'cell', ...extra }
}

function headCell(text: string, extra: Node = {}): Node {
  return { text, style: 'head', ...extra }
}

function ueberstromschutzArt(s: Stromkreis): string {
  if (s.ueberstromschutzArt === 'andere') return s.ueberstromschutzAndere || 'Andere'
  return UEBERSTROMSCHUTZ_ARTEN.find((a) => a.value === s.ueberstromschutzArt)?.label ?? ''
}

function rcdArt(s: Stromkreis): string {
  return RCD_ARTEN.find((a) => a.value === s.rcdArt)?.label ?? ''
}

function stromkreisRow(s: Stromkreis): Node[] {
  return [
    cell(s.nr, { alignment: 'center' }), cell(s.bezeichnung), cell(s.leitungArtTyp),
    cell(s.leiterAnzahl, { alignment: 'center' }), cell(s.leiterQuerschnitt, { alignment: 'center' }),
    cell(ueberstromschutzArt(s), { alignment: 'center' }), cell(s.ueberstromschutzIn, { alignment: 'center' }),
    cell(s.rcdIn, { alignment: 'center' }), cell(rcdArt(s), { alignment: 'center' }), cell(s.rcdIdn, { alignment: 'center' }),
    cell(s.schutzleiter, { alignment: 'center' }), cell(s.rIso, { alignment: 'center' }), cell(s.iLeck, { alignment: 'center' }),
    cell(s.ikAnfang, { alignment: 'center' }), cell(s.ikEnde, { alignment: 'center' }), cell(s.ausloesezeit, { alignment: 'center' }),
  ]
}

function stromkreisTable(list: Stromkreis[]): Node {
  const span = (text: string, n: number, extra: Node = {}): Node[] => [
    headCell(text, { colSpan: n, ...extra }), ...Array.from({ length: n - 1 }, () => ({})),
  ]
  const row1: Node[] = [
    headCell('Nr.', { rowSpan: 2 }), headCell('Bezeichnung', { rowSpan: 2 }), ...span('Leitung', 3),
    ...span('Überstromschutz', 2), ...span('RCD (FI)', 3),
    ...span('Spannungsfrei', 3, { fillColor: '#ccfbf1' }), ...span('Unter Spannung', 3, { fillColor: '#fef3c7' }),
  ]
  const row2: Node[] = [
    {}, {}, headCell('Art / Typ'), headCell('Anz.'), headCell('mm²'),
    headCell('Art'), headCell('I_N [A]'), headCell('I_N [A]'), headCell('Art'), headCell('I_ΔN [mA]'),
    headCell('Schutzleiter [Ω]'), headCell('R_ISO [MΩ]'), headCell('I_Leck [mA]'),
    headCell('I_K Anfang [A]'), headCell('I_K Ende [A]'), headCell('Auslösezeit [ms]'),
  ]
  return {
    table: { headerRows: 2, dontBreakRows: true, widths: SK_WIDTHS, body: [row1, row2, ...list.map(stromkreisRow)] },
    layout: { ...boxLayout, paddingLeft: () => 2, paddingRight: () => 2 },
  }
}

// ---- signatures ------------------------------------------------------------

function signaturBlock(titel: string, s: Signatur): Node {
  return {
    stack: [
      { text: titel, style: 'label' },
      s.bild ? { image: s.bild, fit: [170, 50], margin: [0, 2, 0, 2] } : { text: ' ', margin: [0, 25, 0, 25] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5 }] },
      { text: s.name || ' ', style: 'value', margin: [0, 2, 0, 0] },
      { text: s.datum ? formatDatum(s.datum) : ' ', style: 'value' },
    ],
  }
}

// ---- legend ----------------------------------------------------------------

const LEGENDE: [string, string][] = [
  ['I_N', 'Nennstrom der Überstromschutzeinrichtung bzw. des RCD'],
  ['I_ΔN', 'Nenn-Differenzstrom des RCD (Fehlerstromschutzeinrichtung)'],
  ['LS B / C / D', 'Leitungsschutzschalter mit Auslösecharakteristik B, C bzw. D'],
  ['gG', 'Schmelzsicherung, Betriebsklasse gG'],
  ['RCD Art A / AC / F / B', 'Typ des Fehlerstromschutzschalters; -S = selektiv (verzögert)'],
  ['Schutzleiter', 'Leitfähigkeit / Durchgang des Schutzleiters in Ω (spannungsfrei gemessen)'],
  ['R_ISO', 'Isolationswiderstand in MΩ (spannungsfrei gemessen)'],
  ['I_Leck', 'Ableitstrom in mA'],
  ['I_K Anfang / Ende', 'Kurzschlussstrom am Anfang bzw. Ende des Stromkreises in A (unter Spannung gemessen)'],
  ['Auslösezeit', 'Auslösezeit des RCD in ms (unter Spannung gemessen)'],
]

function legende(): Node[] {
  return [
    { text: 'Legende', style: 'sectionTitle', fontSize: 14, pageBreak: 'before', margin: [0, 0, 0, 8] },
    {
      table: { widths: [130, '*'], body: LEGENDE.map(([k, v]) => [{ text: k, style: 'value', bold: true }, { text: v, style: 'value' }]) },
      layout: boxLayout,
    },
  ]
}

// ---- document --------------------------------------------------------------

export function buildDocDefinition(p: Protokoll, options: PdfOptions = {}): DocDefinition {
  const k = p.kopf
  const zeile = (...felder: Node[]): Node => ({ columns: felder, columnGap: 8 })
  const content: Node[] = [
    {
      columns: [
        { text: 'Erstprüfungs-Protokoll', fontSize: 16, bold: true, color: TEAL, width: '*' },
        { text: ELEKTRO_INSTALLATEUR, fontSize: 9, alignment: 'right', width: 'auto' },
      ],
      margin: [0, 0, 0, 4],
    },
    section('Kopf', [
      zeile(field('Stromkunde', k.stromkunde), field('Interne Auftragsnummer', k.interneAuftragsnummer), field('Installations-Anzeige Nr.', k.installationsAnzeigeNr), field('Zähler Nummer', k.zaehlerNummer)),
      zeile(field('Ausführungsort', k.ausfuehrungsort), field('Verteilung', k.verteilung), field('Ausgeführte Arbeiten', k.ausgefuehrteArbeiten)),
      zeile(field('Verwendetes Messgerät', k.verwendetesMessgeraet), field('Zeitraum der Messungen', k.zeitraumDerMessungen), field('Mitarbeiter', k.mitarbeiter)),
    ]),
    { text: 'Stromkreise', style: 'sectionTitle', fontSize: 11, margin: [0, 8, 0, 3] },
    stromkreisTable(p.stromkreise),
    {
      columns: [
        signaturBlock('Elektro-Kontrolleur', p.signaturen.kontrolleur),
        signaturBlock('Verantwortlicher Unternehmer', p.signaturen.unternehmer),
      ],
      columnGap: 30,
      margin: [0, 14, 0, 0],
      unbreakable: true,
    },
  ]
  if (options.legende) content.push(...legende())

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [24, 24, 24, 34],
    info: { title: `Erstprüfungs-Protokoll ${protokollLabel(p)}` },
    defaultStyle: { font: 'Roboto', fontSize: 8 },
    styles: {
      label: { fontSize: 6.5, color: '#4b5563' },
      value: { fontSize: 8 },
      sectionTitle: { fontSize: 8.5, bold: true },
      head: { fontSize: 6.5, bold: true, alignment: 'center', fillColor: GREY },
      cell: { fontSize: 7.5 },
    },
    footer: (currentPage: number, pageCount: number): Node => {
      const seite = `Seite ${currentPage} von ${pageCount}`
      if (!options.digitalSigniert) return { text: seite, alignment: 'right', fontSize: 8, margin: [24, 10, 24, 0] }
      return {
        columns: [
          { text: DIGITAL_SIGNIERT_HINWEIS, fontSize: 7, color: '#4b5563' },
          { text: seite, alignment: 'right', fontSize: 8, width: 'auto' },
        ],
        margin: [24, 10, 24, 0],
      }
    },
    content,
  }
}

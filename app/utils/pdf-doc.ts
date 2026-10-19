/**
 * Maps a Protokoll to a pdfmake document definition (ADR-0002). Pure and framework-free;
 * rendering/sharing lives in `~/utils/pdf-export`. Layout follows the Equans "Erstprüfungs-Protokoll"
 * template (A4 landscape): logo, Elektro-Installateur and Kopf sit in the page header (every page);
 * page 1 holds the first Stromkreise followed by a reserved row (Prüfpunkte, Gemessene Spannung,
 * Unterschrift Mitarbeiter); further Stromkreise continue on the following pages. Verstoesse are
 * not rendered.
 */
import { ELEKTRO_INSTALLATEUR, ELEKTRO_INSTALLATEUR_ADRESSE, PRUEFPUNKTE } from './protokoll-form'
import { protokollLabel, type Protokoll, type Stromkreis } from './protokoll-store'
import type { Signatur } from './signaturen'
import { RCD_ARTEN, UEBERSTROMSCHUTZ_ARTEN } from './stromkreis'

/** pdfmake's doc definition; kept loose so this module needs no pdfmake import (lazy-loaded elsewhere). */
export type DocDefinition = Record<string, any>
type Node = Record<string, any>

export interface PdfOptions {
  /** append the legend page (page 2) */
  legende?: boolean
  /** PNG data URL of the Equans logo, printed top left on every page (omitted when absent) */
  logo?: string
  /** adds the footer note that the PDF carries a Digitale Signatur */
  digitalSigniert?: boolean
}

export const DIGITAL_SIGNIERT_HINWEIS = 'Digital signiert – jede Änderung macht die Signatur ungültig.'

const TEAL = '#0f766e'
const GREY = '#e5e7eb'

/** Stromkreise on page 1, which shares the page with the reserved row below the table. */
export const STROMKREISE_AUF_SEITE_1 = 16
/** Height (pt) of the reserved row on page 1. */
const RESERVIERT_HOEHE = 90
const PAGE_MARGINS = [24, 136, 24, 34]

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

function section(title: string, body: Node[] | Node, hoehe?: number): Node {
  return {
    table: {
      widths: ['*'],
      ...(hoehe ? { heights: [12, hoehe] } : {}),
      body: [[{ text: title, style: 'sectionTitle', fillColor: GREY }], [{ stack: Array.isArray(body) ? body : [body] }]],
    },
    layout: boxLayout,
  }
}

// ---- Stromkreis table ------------------------------------------------------

// Nr., Ort/Anlagenteil, Leitung/Kabel (3), Überstromschutz (2), Messungen (5), RCD (4), Weiteres/Bemerkungen
const SK_WIDTHS = [32, 90, 56, 22, 26, 34, 26, 38, 30, 30, 32, 32, 26, 30, 30, 38, '*']

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
  const mitte = { alignment: 'center' }
  return [
    cell(s.nr, mitte), cell(s.bezeichnung), cell(s.leitungArtTyp),
    cell(s.leiterAnzahl, mitte), cell(s.leiterQuerschnitt, mitte),
    cell(ueberstromschutzArt(s), mitte), cell(s.ueberstromschutzIn, mitte),
    cell(s.schutzleiter, mitte), cell(s.rIso, mitte), cell(s.iLeck, mitte), cell(s.ikAnfang, mitte), cell(s.ikEnde, mitte),
    cell(s.rcdIn, mitte), cell(rcdArt(s), mitte), cell(s.rcdIdn, mitte), cell(s.ausloesezeit, mitte),
    cell(''), // Weiteres/Bemerkungen: filled per Stromkreis by #22
  ]
}

/** Two header rows in the column order of the template, then one row per Stromkreis. */
function stromkreisTable(list: Stromkreis[], extra: Node = {}): Node {
  const span = (text: string, n: number, style: Node = {}): Node[] => [
    headCell(text, { colSpan: n, ...style }), ...Array.from({ length: n - 1 }, () => ({})),
  ]
  const row1: Node[] = [
    headCell('Stromkreis Nr.', { rowSpan: 2 }), headCell('Ort / Anlagenteil', { rowSpan: 2 }),
    ...span('Leitung / Kabel', 3), ...span('Überstromschutz-Einrichtungen', 2),
    ...span('Messungen (gemessener Wert)', 5), ...span('Fehlerstromschutz-Einrichtungen (RCD)', 4),
    headCell('Weiteres / Bemerkungen', { rowSpan: 2 }),
  ]
  const row2: Node[] = [
    {}, {}, headCell('Art / Typ'), headCell('Anz.'), headCell('mm²'),
    headCell('Art'), headCell('I_N [A]'),
    headCell('Schutzleiter [Ω]'), headCell('R_ISO [MΩ]'), headCell('I_Leck [mA]'), headCell('I_K Anfang [A]'), headCell('I_K Ende [A]'),
    headCell('I_N [A]'), headCell('Art'), headCell('I_ΔN [mA]'), headCell('Auslösezeit [ms]'),
    {},
  ]
  return {
    table: { headerRows: 2, dontBreakRows: true, widths: SK_WIDTHS, body: [row1, row2, ...list.map(stromkreisRow)] },
    layout: { ...boxLayout, paddingLeft: () => 2, paddingRight: () => 2 },
    ...extra,
  }
}

// ---- signatures ------------------------------------------------------------

function signaturBlock(s: Signatur): Node {
  return {
    stack: [
      s.bild ? { image: s.bild, fit: [170, 40], margin: [0, 0, 0, 2] } : { text: ' ', margin: [0, 18, 0, 18] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 170, y2: 0, lineWidth: 0.5 }] },
      { text: s.name || ' ', style: 'value', margin: [0, 2, 0, 0] },
      { text: s.datum ? formatDatum(s.datum) : ' ', style: 'value' },
    ],
  }
}

// ---- page 1: reserved row (Prüfpunkte | Gemessene Spannung | Unterschrift Mitarbeiter) ----------
// One function per box so that #21 (Prüfpunkte, Gemessene Spannung) and #23 (Unterschrift) only
// replace the body of their box; the row, titles and heights stay.

/** Drawn checkbox (no font glyph needed): an empty square, crossed when confirmed. */
function checkbox(bestaetigt: boolean): Node {
  const kante = 8
  return {
    canvas: [
      { type: 'rect', x: 0, y: 0, w: kante, h: kante, lineWidth: 0.7 },
      ...(bestaetigt
        ? [
            { type: 'line', x1: 1.5, y1: 1.5, x2: kante - 1.5, y2: kante - 1.5, lineWidth: 1 },
            { type: 'line', x1: kante - 1.5, y1: 1.5, x2: 1.5, y2: kante - 1.5, lineWidth: 1 },
          ]
        : []),
    ],
    width: 12,
  }
}

function pruefpunkteBox(p: Protokoll): Node {
  const zeilen = PRUEFPUNKTE.map(({ key, label }): Node => ({
    columns: [checkbox(p.pruefpunkte[key]), { text: label, style: 'value' }],
    margin: [0, 0, 0, 2],
  }))
  return section('Prüfpunkte', zeilen, RESERVIERT_HOEHE)
}

function gemesseneSpannungBox(p: Protokoll): Node {
  return section('Gemessene Spannung', [{ text: p.netzspannung ? `${p.netzspannung} V` : ' ', style: 'value' }], RESERVIERT_HOEHE)
}

function unterschriftMitarbeiterBox(p: Protokoll): Node {
  // until #23 there are still two signatures; the one that locked the Protokoll fills the slot
  const s = p.signaturen.kontrolleur.bild || !p.signaturen.unternehmer.bild ? p.signaturen.kontrolleur : p.signaturen.unternehmer
  return section('Unterschrift Mitarbeiter', [signaturBlock(s)], RESERVIERT_HOEHE)
}

function reservierteZeile(p: Protokoll): Node {
  return {
    columns: [
      { ...pruefpunkteBox(p), width: '*' },
      { ...gemesseneSpannungBox(p), width: 150 },
      { ...unterschriftMitarbeiterBox(p), width: 200 },
    ],
    columnGap: 6,
    margin: [0, 8, 0, 0],
    unbreakable: true,
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

// ---- page header (every page) ---------------------------------------------

function kopfSpalten(p: Protokoll): Node {
  const k = p.kopf
  return {
    columns: [
      { stack: [field('Stromkunde', k.stromkunde), field('Interne Auftragsnummer', k.interneAuftragsnummer), field('Installations-Anzeige Nr.', k.installationsAnzeigeNr), field('Zähler Nummer', k.zaehlerNummer)] },
      { stack: [field('Ausführungsort', k.ausfuehrungsort), field('Verteilung', k.verteilung), field('Ausgeführte Arbeiten', k.ausgefuehrteArbeiten)] },
      { stack: [field('Verwendetes Messgerät', k.verwendetesMessgeraet), field('Zeitraum der Messungen', k.zeitraumDerMessungen), field('Mitarbeiter', k.mitarbeiter)] },
    ],
    columnGap: 8,
  }
}

function seitenKopf(p: Protokoll, logo?: string): Node {
  return {
    margin: [PAGE_MARGINS[0]!, 16, PAGE_MARGINS[2]!, 0],
    stack: [
      {
        columns: [
          logo ? { image: logo, fit: [110, 33], width: 130 } : { text: '', width: 130 },
          { text: 'Erstprüfungs-Protokoll', fontSize: 16, bold: true, color: TEAL, width: '*', alignment: 'center' },
          { stack: [ELEKTRO_INSTALLATEUR, ...ELEKTRO_INSTALLATEUR_ADRESSE].map((text, i) => ({ text, fontSize: 8, bold: i === 0, alignment: 'right' })), width: 190 },
        ],
        margin: [0, 0, 0, 6],
      },
      section('Kopf', kopfSpalten(p)),
    ],
  }
}

// ---- document --------------------------------------------------------------

export function buildDocDefinition(p: Protokoll, options: PdfOptions = {}): DocDefinition {
  const seite1 = p.stromkreise.slice(0, STROMKREISE_AUF_SEITE_1)
  const weitere = p.stromkreise.slice(STROMKREISE_AUF_SEITE_1)
  const content: Node[] = [
    stromkreisTable(seite1),
    reservierteZeile(p),
    // further Stromkreise: own table on a new page; pdfmake repeats the two header rows when it runs over
    ...(weitere.length ? [stromkreisTable(weitere, { pageBreak: 'before' })] : []),
  ]
  if (options.legende) content.push(...legende())

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: PAGE_MARGINS,
    info: { title: `Erstprüfungs-Protokoll ${protokollLabel(p)}` },
    defaultStyle: { font: 'Roboto', fontSize: 8 },
    styles: {
      label: { fontSize: 6.5, color: '#4b5563' },
      value: { fontSize: 8 },
      sectionTitle: { fontSize: 8.5, bold: true },
      head: { fontSize: 6.5, bold: true, alignment: 'center', fillColor: GREY },
      cell: { fontSize: 7.5 },
    },
    header: (): Node => seitenKopf(p, options.logo),
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

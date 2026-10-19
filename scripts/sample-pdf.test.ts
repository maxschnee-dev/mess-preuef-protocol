// Manual helper (not part of `pnpm test`): `pnpm vitest run --dir scripts` writes /tmp/sample-protokoll.pdf
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { buildDocDefinition } from '../app/utils/pdf-doc'
import { createProtokoll } from '../app/utils/protokoll-store'
import { addStromkreis, updateStromkreis } from '../app/utils/stromkreis'

const require = createRequire(import.meta.url)

it('writes a 25-Stromkreis sample PDF', async () => {
  const pdfmake = require('pdfmake')
  const dir = require.resolve('pdfmake/package.json').replace('package.json', 'fonts/Roboto/')
  pdfmake.addFonts({ Roboto: { normal: dir + 'Roboto-Regular.ttf', bold: dir + 'Roboto-Medium.ttf', italics: dir + 'Roboto-Italic.ttf', bolditalics: dir + 'Roboto-MediumItalic.ttf' } })
  const p = createProtokoll()
  p.kopf = {
    stromkunde: 'Muster Verwaltungs AG', interneAuftragsnummer: 'A-4711', installationsAnzeigeNr: 'IA-77', zaehlerNummer: '55512',
    ausfuehrungsort: 'Musterweg 3, Bern', verteilung: 'HV 1', ausgefuehrteArbeiten: 'Neuinstallation Hauptverteilung',
    verwendetesMessgeraet: 'Fluke 1663 / Erd-Tester ET15', zeitraumDerMessungen: '14.–16.10.2026', mitarbeiter: 'Hans Muster',
  }
  for (let i = 0; i < 25; i++) p.stromkreise = addStromkreis(p.stromkreise)
  p.stromkreise = p.stromkreise.map((s, i) => ({ ...s, bezeichnung: `Steckdosen Zimmer ${i + 1}`, leitungArtTyp: 'NYM-J', leiterAnzahl: '3', leiterQuerschnitt: '1.5', ueberstromschutzArt: 'LS-B', ueberstromschutzIn: '16', rcdIn: '40', rcdArt: 'A', rcdIdn: '30', schutzleiter: '0.2', rIso: '>500', iLeck: '0.1', ikAnfang: '800', ikEnde: '300', ausloesezeit: '22' }))
  p.stromkreise = updateStromkreis(p.stromkreise, p.stromkreise[0]!.id, { bezeichnung: 'Licht Küche' })
  const buf: Buffer = await pdfmake.createPdf(buildDocDefinition(p, { legende: process.env.LEGENDE !== "0" })).getBuffer()
  writeFileSync('/tmp/sample-protokoll.pdf', buf)
})

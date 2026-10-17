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
  const p = { ...createProtokoll(), kontrolldatum: '2026-10-01', ortDerInstallation: 'Musterweg 3, Bern' }
  p.auftraggeber = { art: 'verwaltung', name1: 'Muster Verwaltungs AG', name2: 'Liegenschaften', strasse: 'Hauptstrasse 1', plzOrt: '3000 Bern' }
  p.auftragnehmer = { art: 'elektro-installateur', name1: 'Elektro Beispiel GmbH', name2: '', strasse: 'Werkstr. 5', plzOrt: '3001 Bern' }
  p.installation = { gebaeudeart: 'Mehrfamilienhaus', objektNr: '12', instAnzeige: 'IA-77', anlage: 'Neuanlage', stromkunde: 'Meier', stockwerkRaum: '2. OG', zaehlerNr: '55512', anlageNr: 'A1' }
  p.kontrolle = { durchgefuehrteKontrolle: 'Abnahmekontrolle', kontrollperiode: '5 Jahre', kontrollumfang: 'vollständig' }
  p.anlageteile = [{ id: '1', anlageteil: 'Hauptverteilung', verbraucher: 'Allgemein' }]
  p.netzspannung = '230/400 V'
  p.messgeraete = ['Fluke 1664 FC', 'Metrel MI 3152']
  p.bemerkungen = 'Keine.'
  p.sichtpruefung.checks.potentialausgleich = true
  p.sichtpruefung.schutzSystem = 'TN-S'
  p.funktionspruefung.checks.drehfeld = true
  p.pruefergebnis.keineMaengel = true
  for (let i = 0; i < 25; i++) p.stromkreise = addStromkreis(p.stromkreise)
  p.stromkreise = p.stromkreise.map((s, i) => ({ ...s, bezeichnung: `Steckdosen Zimmer ${i + 1}`, leitungArtTyp: 'NYM-J', leiterAnzahl: '3', leiterQuerschnitt: '1.5', ueberstromschutzArt: 'LS-B', ueberstromschutzIn: '16', rcdIn: '40', rcdArt: 'A', rcdIdn: '30', schutzleiter: '0.2', rIso: '>500', iLeck: '0.1', ikAnfang: '800', ikEnde: '300', ausloesezeit: '22' }))
  p.stromkreise = updateStromkreis(p.stromkreise, p.stromkreise[0]!.id, { bezeichnung: 'Licht Küche' })
  const buf: Buffer = await pdfmake.createPdf(buildDocDefinition(p, { legende: process.env.LEGENDE !== "0" })).getBuffer()
  writeFileSync('/tmp/sample-protokoll.pdf', buf)
})

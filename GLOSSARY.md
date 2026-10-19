# Glossary

Domain terms for the Mess- + Prüfprotokoll app. Use these words in code, issues and UI.

| Term | Meaning | Avoid |
|---|---|---|
| **Protokoll** | One filled-in Equans Erstprüfungsprotokoll: a Kopf, the five Prüfpunkte, a list of Stromkreise and one Unterschrift. The unit the app stores, switches between and exports as PDF. | report, document |
| **Kopf** | Header of a Protokoll: Stromkunde, Interne Auftragsnummer, Installations-Anzeige Nr., Zähler Nummer, Ausführungsort, Verteilung, Ausgeführte Arbeiten, Verwendetes Messgerät, Zeitraum der Messungen, Mitarbeiter. Repeated on every PDF page. | header |
| **Elektro-Installateur** | The company doing the work. Always Equans Switzerland Facility Management AG, printed on the Protokoll and never entered. | Auftragnehmer, vendor |
| **Stromkunde** | The customer of the installation, as one line of text. | Auftraggeber, customer |
| **Verteilung** | The distribution board a Protokoll covers ("Bezeichnung Verteilung"). Several Protokolle can belong to the same Verteilung. | Schaltgerätekombination (in the Kopf) |
| **Zeitraum der Messungen** | Free text saying when the measurements were taken, e.g. "14.–16.10.2026". It is not a date field. | Kontrolldatum |
| **Mitarbeiter** | The Equans employee who took the measurements and gives the Unterschrift. | Kontrolleur |
| **Prüfpunkt** | One of the five yes/blank checks on a Protokoll (Basisschutz erfüllt, Brandabschottungen, Richtige Auswahl und Bezeichnung der Betriebsmittel, Bemessung / Kennzeichnung der Stromkreise / Leitungen, Schemas und Legenden elektronisch nachgeführt). Blank means "not confirmed"; the reason goes in Bemerkungen. | Sichtprüfung, check |
| **Stromkreis** | One row of the measurement table: a circuit with its cable, Überstromschutzeinrichtung, Messungen, Fehlerstromschutzeinrichtung and its own Bemerkungen. Edited one at a time; each of its Messwerte is shown as a card. | row, line |
| **Messwert** | A single measured value entered for a Stromkreis (e.g. R_ISO, I_K Ende L-PE). | result, reading |
| **Grenzwert** | The allowed boundary a Messwert is checked against (e.g. "≥ 1.0 MΩ", "≥ 255 A"). Shown to the user when violated. | limit, threshold |
| **Verstoss** | A Messwert outside its Grenzwert. Marks the field; never blocks saving or the PDF. | error, failure |
| **Spannungsfrei-Messungen** | Messwerte taken with the installation switched off: Leitfähigkeit des Schutzleiters, R_ISO / I_Leck. Come first on each Stromkreis card. | dead tests |
| **Messungen unter Spannung** | Messwerte taken with power on: I_K Anfang/Ende for L-PE and for L-N, RCD-Auslösezeit (plus Gemessene Spannung for the Protokoll). Come after the Spannungsfrei-Messungen. | live tests |
| **Unterschrift** | Handwritten finger signature of the Mitarbeiter, drawn in a dialog. Giving it locks the Protokoll. Called "signature" in code. | Signatur (in UI) |
| **Digitale Signatur** | Cryptographic signature embedded in the exported PDF of a locked Protokoll. Any later change to the file invalidates it. | Unterschrift, seal |
| **Schnellwert** | A preset value offered on the keypad for a field, e.g. "> 500" for R_ISO or "16" for Überstromschutz I_N. Values like "> 500" / "< 0.1" are checked against the Grenzwert as 500 / 0.1. | preset, shortcut |

# Glossary

Domain terms for the Mess- + Prüfprotokoll app. Use these words in code, issues and UI.

| Term | Meaning | Avoid |
|---|---|---|
| **Protokoll** | One filled-in Mess- + Prüfprotokoll (form VSEI 133-D) for one installation. The unit the app stores, switches between and exports as PDF. | report, document |
| **Stromkreis** | One row of the measurement table: a circuit with its cable, Überstromschutzeinrichtung, Messungen and Fehlerstromschutzeinrichtung. Edited one at a time; each of its Messwerte is shown as a card. | row, line |
| **Messwert** | A single measured value entered for a Stromkreis (e.g. R_ISO, I_K Ende). | result, reading |
| **Grenzwert** | The allowed boundary a Messwert is checked against (e.g. "≥ 1.0 MΩ", "≥ 255 A"). Shown to the user when violated. | limit, threshold |
| **Verstoss** | A Messwert outside its Grenzwert. Marks the field; never blocks saving or the PDF. | error, failure |
| **Auftraggeber** | Client side of the Protokoll (Eigentümer / Verwaltung / Stromkunde). | customer |
| **Auftragnehmer** | Contractor side (Elektro-Installateur / Kontrollorgan). | vendor |
| **Kontrolldatum** | Date of the inspection. Together with Ort der Installation it identifies a Protokoll in the switcher; Protokolle are not numbered. | protocol number |
| **Spannungsfrei-Messungen** | Messwerte taken with the installation switched off: Leitfähigkeit des Schutzleiters, R_ISO. Come first on each Stromkreis card. | dead tests |
| **Messungen unter Spannung** | Messwerte taken with power on: I_K Anfang/Ende, RCD-Auslösezeit (plus Netzspannung L–N, Drehfeld for the Protokoll). Come after the Spannungsfrei-Messungen. | live tests |
| **Unterschrift** | Handwritten finger signature of the Elektro-Kontrolleur or Verantwortlicher Unternehmer. Giving one locks the Protokoll. Called "signature" in code. | Signatur (in UI) |
| **Digitale Signatur** | Cryptographic signature embedded in the exported PDF of a locked Protokoll. Any later change to the file invalidates it. | Unterschrift, seal |
| **Schnellwert** | A preset value offered on the keypad for a field, e.g. "> 500" for R_ISO or "16" for Überstromschutz I_N. Values like "> 500" / "< 0.1" are checked against the Grenzwert as 500 / 0.1. | preset, shortcut |

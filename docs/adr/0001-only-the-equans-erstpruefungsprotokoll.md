# Only the Equans Erstprüfungsprotokoll, not VSEI 133-D

The app first digitised the full VSEI 133-D Mess- + Prüfprotokoll: Auftraggeber/Auftragnehmer parties, installation and Kontrolle blocks, Sichtprüfung and Funktionsprüfung lists, company and Messgerät Stammdaten, and two Unterschriften. That was more than the people using it need. We cut the scope to the one form they actually fill in, the Equans "Erstprüfungs-Protokoll" (Stand 01.06.2026, 2 pages): a short Kopf, five Prüfpunkte, the Stromkreis table and one Unterschrift. Requests for customer details or extra prüf sections should be checked against that template before they are built.

## Consequences

- Existing VSEI 133-D Protokolle are dropped when the new schema is introduced. They are not migrated.
- The Elektro-Installateur is fixed to Equans, so there are no company Stammdaten.
- The Digitale Signatur stays, since it doesn't depend on which fields the form has.

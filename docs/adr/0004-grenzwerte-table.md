# 0004 – Grenzwerte in one data table, 230/400 V assumed

Status: accepted (2026-10-17)

All Grenzwerte live in one data module; rules read from it, nothing hard-coded in components. We assume a standard 230/400 V installation, so the app asks for no extra per-Stromkreis inputs (no Nennspannung, no "zusätzlicher Schutz" flag) and the I_ΔN ≤ 30 mA rule is deliberately omitted.

| Messwert | Grenzwert |
|---|---|
| R_ISO | ≥ 1.0 MΩ |
| Leitfähigkeit Schutzleiter | ≤ 1 Ω |
| I_K Ende | ≥ I_a: LS B 5·I_N, C 10·I_N, D 20·I_N; gG per fuse table (0.4 s for I_N ≤ 32 A, else 5 s); other devices unchecked |
| I_K Anfang | ≥ I_K Ende (plausibility) |
| RCD-Auslösezeit | ≤ 300 ms; selective (…-S) 130–500 ms |
| Netzspannung | 207–253 V or 360–440 V |

Empty fields mean "not measured" and are never a Verstoss. Values must be verified by a qualified person against the current NIN before production use.

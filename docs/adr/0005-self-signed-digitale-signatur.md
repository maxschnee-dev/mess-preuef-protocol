# 0005 – Digitale Signatur with a self-signed certificate

Status: accepted (2026-10-17)

The PDF of a locked Protokoll carries a Digitale Signatur so any later change to the file is detectable. The signing key and a self-signed certificate are generated in the app and travel with the Backup. We chose this over a trusted/qualified signature provider (SwissSign, Skribble, …) because those need a server and cost per signature, which breaks the client-only design (ADR-0001). Consequence: PDF readers show the signature as intact but the signer as "identity unknown"; the Digitale Signatur proves integrity, not identity. Drafts (unlocked Protokolle) are exported unsigned.

import forge from 'node-forge'
import { PDFDocument } from 'pdf-lib'
import { beforeAll, describe, expect, it } from 'vitest'
import { verifySignature } from './helpers/verify-signature'
import { createProtokoll } from '../app/utils/protokoll-store'
import { buildDocDefinition, DIGITAL_SIGNIERT_HINWEIS } from '../app/utils/pdf-doc'
import { createZertifikat, signPdf } from '../app/utils/pdf-sign'
import type { Zertifikat } from '../app/utils/digitale-signatur'

async function smallPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.addPage([200, 200]).drawText('Mess- + Pruefprotokoll')
  return doc.save({ useObjectStreams: false })
}

describe('Digitale Signatur', () => {
  let z: Zertifikat
  let cert: forge.pki.Certificate
  beforeAll(async () => {
    z = await createZertifikat('Muster Elektro AG')
    cert = forge.pki.certificateFromPem(z.certPem)
  }, 60_000)

  it('creates a self-signed certificate with the given name as CN', () => {
    expect(z.name).toBe('Muster Elektro AG')
    expect(cert.subject.getField('CN').value).toBe('Muster Elektro AG')
    expect(cert.issuer.getField('CN').value).toBe('Muster Elektro AG')
    expect(cert.verify(cert)).toBe(true)
  })

  it('falls back to a generic CN when the name is empty', async () => {
    expect((await createZertifikat('  ')).name).toBe('Mess- + Prüfprotokoll')
  }, 60_000)

  it('signs a PDF so that the signature verifies, and any changed byte in the signed range breaks it', async () => {
    const signed = await signPdf(await smallPdf(), z)
    const text = Buffer.from(signed).toString('latin1')
    expect(text).toContain('/Type /Sig')
    expect(verifySignature(signed, cert)).toBe(true)
    await expect(PDFDocument.load(signed)).resolves.toBeTruthy()

    const b = Number(/\/ByteRange\s*\[\s*0\s+(\d+)/.exec(text)![1])
    for (const pos of [10, Math.floor(b / 2), b - 1]) {
      const tampered = new Uint8Array(signed)
      tampered[pos] = tampered[pos]! ^ 0x01
      expect(verifySignature(tampered, cert)).toBe(false)
    }
  })

  it('does not verify against a different certificate', async () => {
    const other = forge.pki.certificateFromPem((await createZertifikat('Andere AG')).certPem)
    expect(verifySignature(await signPdf(await smallPdf(), z), other)).toBe(false)
  }, 60_000)

  it('shows the footer note only on signed PDFs', () => {
    const footer = (digitalSigniert: boolean) => JSON.stringify((buildDocDefinition(createProtokoll(), { digitalSigniert }).footer as any)(1, 1))
    expect(footer(true)).toContain(DIGITAL_SIGNIERT_HINWEIS)
    expect(footer(false)).not.toContain('signiert')
  })
})

import forge from 'node-forge'
import { PDFDocument } from 'pdf-lib'
import { beforeAll, describe, expect, it } from 'vitest'
import { createProtokoll } from '../app/utils/protokoll-store'
import { buildDocDefinition, DIGITAL_SIGNIERT_HINWEIS } from '../app/utils/pdf-doc'
import { createZertifikat, signPdf } from '../app/utils/pdf-sign'
import type { Zertifikat } from '../app/utils/digitale-signatur'

/** Verifies a detached PKCS#7 signature over the ByteRange of `pdf` (SHA-256, signed attributes). */
function verifySignature(pdf: Uint8Array, cert: forge.pki.Certificate): boolean {
  const latin1 = Buffer.from(pdf).toString('latin1')
  const m = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/.exec(latin1)
  if (!m) return false
  const [a, b, c, d] = m.slice(1).map(Number) as [number, number, number, number]
  const signed = Buffer.concat([pdf.subarray(a, a + b), pdf.subarray(c, c + d)])
  const der = Buffer.from(latin1.slice(a + b + 1, c - 1), 'hex')
  const lenBytes = der[1]! & 0x80 ? der[1]! & 0x7f : 0
  const total = 2 + lenBytes + (lenBytes ? der.readUIntBE(2, lenBytes) : der[1]!)
  const p7 = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(der.subarray(0, total).toString('binary'))) as any
  const attrs: forge.asn1.Asn1[] = p7.rawCapture.authenticatedAttributes
  const digestAttr = attrs.find((x) => forge.asn1.derToOid((x.value as forge.asn1.Asn1[])[0]!.value as string) === forge.pki.oids.messageDigest)
  const expected = (((digestAttr!.value as forge.asn1.Asn1[])[1]!.value as forge.asn1.Asn1[])[0]!.value) as string
  const actual = forge.md.sha256.create().update(signed.toString('binary')).digest().bytes()
  if (expected !== actual) return false
  const set = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, attrs)
  const md = forge.md.sha256.create().update(forge.asn1.toDer(set).getBytes())
  try {
    return (cert.publicKey as forge.pki.rsa.PublicKey).verify(md.digest().bytes(), p7.rawCapture.signature)
  } catch {
    return false
  }
}

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

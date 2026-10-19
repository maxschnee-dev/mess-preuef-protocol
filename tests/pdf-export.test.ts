import forge from 'node-forge'
import { PDFDocument } from 'pdf-lib'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Zertifikat } from '../app/utils/digitale-signatur'
import { renderPdf } from '../app/utils/pdf-export'
import { createZertifikat } from '../app/utils/pdf-sign'
import { createProtokoll, type Protokoll } from '../app/utils/protokoll-store'
import { addStromkreis } from '../app/utils/stromkreis'
import { verifySignature } from './helpers/verify-signature'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

async function bytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer())
}

function gesperrtesProtokoll(stromkreise: number): Protokoll {
  const p = createProtokoll()
  p.kopf.stromkunde = 'Muster AG'
  for (let i = 0; i < stromkreise; i++) p.stromkreise = addStromkreis(p.stromkreise)
  p.signaturen.kontrolleur = { name: 'Hans Muster', datum: '2026-10-02', bild: PNG }
  p.gesperrt = true
  return p
}

describe('renderPdf', () => {
  let z: Zertifikat
  let cert: forge.pki.Certificate
  beforeAll(async () => {
    z = await createZertifikat('Equans')
    cert = forge.pki.certificateFromPem(z.certPem)
  }, 60_000)

  it('exports a locked Protokoll in the template layout with a Digitale Signatur that verifies', async () => {
    const pdf = await bytes(await renderPdf(gesperrtesProtokoll(3), {}, z))
    expect(verifySignature(pdf, cert)).toBe(true)
    const doc = await PDFDocument.load(pdf)
    expect(doc.getPageCount()).toBe(1)
    const { width, height } = doc.getPage(0).getSize()
    expect(width).toBeGreaterThan(height)
  }, 60_000)

  it('paginates long Stromkreis lists and keeps the signature valid', async () => {
    const pdf = await bytes(await renderPdf(gesperrtesProtokoll(60), {}, z))
    expect(verifySignature(pdf, cert)).toBe(true)
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(2)
  }, 60_000)

  it('does not sign an unlocked export', async () => {
    const pdf = await bytes(await renderPdf(gesperrtesProtokoll(1)))
    expect(Buffer.from(pdf).toString('latin1')).not.toContain('/ByteRange')
  }, 60_000)
})

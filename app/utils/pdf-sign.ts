/**
 * Digitale Signatur of the exported PDF (ADR-0005): self-signed RSA certificate generated in the
 * browser, invisible PAdES/PKCS#7 detached signature added as an incremental update. All crypto
 * libraries are lazy-loaded (like pdfmake) and precached for offline use. @signpdf needs a global
 * `Buffer`, which is polyfilled on demand.
 */
import { zertifikatName, type Zertifikat } from './digitale-signatur'

async function loadForge() {
  return (await import('node-forge')).default
}

/** New RSA-2048 key pair + self-signed certificate valid for 20 years. */
export async function createZertifikat(name1: string): Promise<Zertifikat> {
  const forge = await loadForge()
  const name = zertifikatName(name1)
  // WebCrypto generates the key natively and off the main thread; forge's pure-JS keygen freezes the UI for seconds.
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
  const pem = forge.pem.encode({ type: 'PRIVATE KEY', body: String.fromCharCode(...pkcs8) })
  const privateKey = forge.pki.privateKeyFromPem(pem) as import('node-forge').pki.rsa.PrivateKey
  const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e)
  const cert = forge.pki.createCertificate()
  cert.publicKey = publicKey
  cert.serialNumber = `01${forge.util.bytesToHex(forge.random.getBytesSync(8))}`
  const now = new Date()
  cert.validity.notBefore = new Date(now.getTime() - 24 * 3600 * 1000)
  cert.validity.notAfter = new Date(now.getTime())
  cert.validity.notAfter.setFullYear(now.getFullYear() + 20)
  const attrs = [{ name: 'commonName', value: name }]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, nonRepudiation: true },
  ])
  cert.sign(privateKey, forge.md.sha256.create())
  return {
    name,
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(privateKey),
    erstellt: now.toISOString(),
  }
}

/** Returns the PDF with an invisible detached PKCS#7 signature over the whole file. */
export async function signPdf(pdf: Uint8Array, z: Zertifikat): Promise<Uint8Array<ArrayBuffer>> {
  const { Buffer } = await import('buffer')
  globalThis.Buffer ??= Buffer
  const [forge, { PDFDocument }, { pdflibAddPlaceholder }, { default: signpdf }, { P12Signer }] = await Promise.all([
    loadForge(),
    import('pdf-lib'),
    import('@signpdf/placeholder-pdf-lib'),
    import('@signpdf/signpdf'),
    import('@signpdf/signer-p12'),
  ])
  const doc = await PDFDocument.load(pdf)
  pdflibAddPlaceholder({ pdfDoc: doc, reason: 'Digitale Signatur', contactInfo: '', name: z.name, location: '', signatureLength: 8192 })
  const prepared = Buffer.from(await doc.save({ useObjectStreams: false }))

  const p12 = forge.asn1.toDer(
    forge.pkcs12.toPkcs12Asn1(forge.pki.privateKeyFromPem(z.keyPem), [forge.pki.certificateFromPem(z.certPem)], '', { algorithm: '3des' }),
  ).getBytes()
  const signed = await signpdf.sign(prepared, new P12Signer(Buffer.from(p12, 'binary'), { passphrase: '' }))
  return new Uint8Array(signed)
}

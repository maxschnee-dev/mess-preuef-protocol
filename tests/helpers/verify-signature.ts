import forge from 'node-forge'

/** Verifies a detached PKCS#7 signature over the ByteRange of `pdf` (SHA-256, signed attributes). */
export function verifySignature(pdf: Uint8Array, cert: forge.pki.Certificate): boolean {
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

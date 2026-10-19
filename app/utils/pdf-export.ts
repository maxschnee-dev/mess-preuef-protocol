/**
 * Thin, untested rendering/download layer around pdfmake (ADR-0002). pdfmake and its bundled Roboto
 * fonts are lazy-loaded on first export so the main bundle stays small; both chunks are precached
 * by the service worker, so export works offline. Export is never blocked by Verstoesse or missing
 * signatures (ADR-0003).
 */
import { buildDocDefinition, pdfFilename, type PdfOptions } from './pdf-doc'
import type { Zertifikat } from './digitale-signatur'
import type { Protokoll } from './protokoll-store'

/** With a `zertifikat` the PDF is digitally signed (callers pass it for locked Protokolle only). */
export async function renderPdf(p: Protokoll, options: PdfOptions = {}, zertifikat?: Zertifikat): Promise<Blob> {
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  pdfMake.addVirtualFileSystem(vfs)
  const doc = pdfMake.createPdf(buildDocDefinition(p, { ...options, digitalSigniert: !!zertifikat }))
  if (!zertifikat) return doc.getBlob()
  const { signPdf } = await import('./pdf-sign')
  return new Blob([await signPdf(await doc.getBuffer(), zertifikat)], { type: 'application/pdf' })
}

/** Downloads the PDF as a file. Deliberately no Web Share API: it opens the share sheet instead of saving. */
export async function exportPdf(p: Protokoll, options: PdfOptions = {}, zertifikat?: Zertifikat): Promise<'downloaded'> {
  const blob = await renderPdf(p, options, zertifikat)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = pdfFilename(p)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  return 'downloaded'
}

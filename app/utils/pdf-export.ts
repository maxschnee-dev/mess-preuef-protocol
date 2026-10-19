/**
 * Thin, untested rendering/sharing layer around pdfmake (ADR-0002). pdfmake and its bundled Roboto
 * fonts are lazy-loaded on first export so the main bundle stays small; both chunks are precached
 * by the service worker, so export works offline. Export is never blocked by Verstoesse or missing
 * signatures (ADR-0003).
 */
import { buildDocDefinition, pdfFilename, type PdfOptions } from './pdf-doc'
import type { Zertifikat } from './digitale-signatur'
import type { Protokoll } from './protokoll-store'

/** With a `zertifikat` the PDF is digitally signed (callers pass it for locked Protokolle only). */
export async function renderPdf(p: Protokoll, options: PdfOptions = {}, zertifikat?: Zertifikat): Promise<Blob> {
  const [{ default: pdfMake }, { default: vfs }, { default: logo }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
    import('../assets/equans_logo.png?inline'), // data URL, bundled in this lazy chunk and precached
  ])
  pdfMake.addVirtualFileSystem(vfs)
  const doc = pdfMake.createPdf(buildDocDefinition(p, { logo, ...options, digitalSigniert: !!zertifikat }))
  if (!zertifikat) return doc.getBlob()
  const { signPdf } = await import('./pdf-sign')
  return new Blob([await signPdf(await doc.getBuffer(), zertifikat)], { type: 'application/pdf' })
}

/** Shares the PDF through the Web Share API where file sharing is supported, else downloads it. */
export async function exportPdf(p: Protokoll, options: PdfOptions = {}, zertifikat?: Zertifikat): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await renderPdf(p, options, zertifikat)
  const name = pdfFilename(p)
  const file = new File([blob], name, { type: 'application/pdf' })
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // any other share failure: fall through to the download
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  return 'downloaded'
}

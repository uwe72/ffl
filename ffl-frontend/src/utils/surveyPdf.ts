const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297

export function slugifyFileName(title: string): string {
  return title
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function exportSurveyPdf(node: HTMLElement, title: string): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  })

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const imgWidthMm = A4_WIDTH_MM
  const pxPerMm = canvas.width / imgWidthMm
  const pageHeightPx = Math.floor(A4_HEIGHT_MM * pxPerMm)

  let renderedPx = 0
  while (renderedPx < canvas.height) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - renderedPx)
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = sliceHeight
    const ctx = slice.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, slice.width, slice.height)
    ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)

    if (renderedPx > 0) pdf.addPage()
    pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, imgWidthMm, sliceHeight / pxPerMm)
    renderedPx += sliceHeight
  }

  pdf.save(`umfrage-${slugifyFileName(title) || 'vorschau'}.pdf`)
}

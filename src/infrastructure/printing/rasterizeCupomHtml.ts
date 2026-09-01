import html2canvas from 'html2canvas'

function waitIframeLoad(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Tempo esgotado ao montar o cupom gráfico.')), 8000)
    iframe.addEventListener(
      'load',
      () => {
        window.clearTimeout(timer)
        resolve()
      },
      { once: true }
    )
  })
}

function canvasToPngBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL('image/png')
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
}

function nextPaint(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function measureReceipt(receipt: HTMLElement, fallbackWidth: number) {
  return {
    width: Math.max(1, Math.ceil(receipt.scrollWidth || fallbackWidth)),
    height: Math.max(1, Math.ceil(receipt.scrollHeight), Math.ceil(receipt.offsetHeight)),
  }
}

export function graphicRasterScale(larguraMm: 58 | 80): number {
  return larguraMm === 58 ? 384 / 220 : 576 / 300
}

/**
 * Fotografa o HTML já layoutado no iframe (html2canvas).
 * Não usa SVG+foreignObject: perde ::before, bordas e a fonte do preview.
 */
export async function rasterizeCupomHtmlToPngBase64(
  html: string,
  options: { widthPx: number; scale?: number }
): Promise<string> {
  if (typeof document === 'undefined') {
    throw new Error('Modo gráfico só no navegador.')
  }
  const scale = options.scale ?? 2
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.scrolling = 'no'
  iframe.style.cssText = [
    'position:fixed',
    'left:-12000px',
    'top:0',
    'border:0',
    'background:#fff',
    `width:${options.widthPx}px`,
    'height:4000px',
  ].join(';')
  document.body.appendChild(iframe)
  try {
    const loaded = waitIframeLoad(iframe)
    iframe.srcdoc = html
    await loaded
    const doc = iframe.contentDocument
    if (!doc) throw new Error('Não foi possível montar o cupom gráfico.')
    if (doc.fonts?.ready) {
      await Promise.race([doc.fonts.ready, new Promise(resolve => window.setTimeout(resolve, 800))])
    }
    doc.documentElement.style.overflow = 'visible'
    doc.body.style.overflow = 'visible'
    doc.body.style.height = 'auto'
    const receipt = (doc.querySelector('.receipt') as HTMLElement | null) ?? doc.body
    receipt.style.overflow = 'visible'
    receipt.style.paddingBottom = '6px'
    const compact = receipt.dataset.densidade === 'compacto'
    const sepExtra = compact ? '6px' : '10px'
    for (const el of Array.from(doc.querySelectorAll('.separator'))) {
      const node = el as HTMLElement
      node.style.paddingTop = sepExtra
      node.style.marginTop = sepExtra
    }
    const afterQr = doc.querySelector('.whatsapp-qr + .separator') as HTMLElement | null
    if (afterQr) {
      const half = compact ? '3px' : '5px'
      afterQr.style.paddingTop = half
      afterQr.style.marginTop = half
    }
    for (const el of Array.from(doc.querySelectorAll('.brand'))) {
      const node = el as HTMLElement
      node.style.transform = 'translateY(-5px)'
    }
    for (const el of Array.from(doc.querySelectorAll('.obs-box'))) {
      const node = el as HTMLElement
      node.style.paddingTop = '2px'
      node.style.paddingBottom = '8px'
    }
    for (const el of Array.from(doc.querySelectorAll('.obs-title, .obs-text'))) {
      const node = el as HTMLElement
      node.style.transform = 'translateY(-3px)'
    }
    for (const el of Array.from(doc.querySelectorAll('.method'))) {
      const node = el as HTMLElement
      node.style.paddingTop = '1px'
      node.style.paddingBottom = '10px'
      node.style.lineHeight = '1'
      const wrap = doc.createElement('span')
      wrap.style.display = 'inline-block'
      wrap.style.transform = 'translateY(-6px)'
      while (node.firstChild) wrap.appendChild(node.firstChild)
      node.appendChild(wrap)
    }
    await nextPaint()
    let { width, height } = measureReceipt(receipt, options.widthPx)
    height += 8
    iframe.style.height = `${height}px`
    iframe.style.width = `${width}px`
    await nextPaint()
    const again = measureReceipt(receipt, options.widthPx)
    width = Math.max(width, again.width)
    height = Math.max(height, again.height + 8)
    iframe.style.height = `${height}px`
    iframe.style.width = `${width}px`

    const canvas = await html2canvas(receipt, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      letterRendering: true,
      width,
      height,
      windowWidth: width,
      windowHeight: height + 32,
    })
    if (canvas.width < 8 || canvas.height < 8) {
      throw new Error('Falha ao rasterizar o cupom.')
    }
    return canvasToPngBase64(canvas)
  } finally {
    iframe.remove()
  }
}

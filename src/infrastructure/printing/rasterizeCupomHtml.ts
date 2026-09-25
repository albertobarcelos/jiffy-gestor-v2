import { toPng } from 'html-to-image'
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

function dataUrlToBase64(dataUrl: string): string {
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

async function fotografarComMotorDoNavegador(
  receipt: HTMLElement,
  width: number,
  height: number,
  scale: number
): Promise<string> {
  const dataUrl = await toPng(receipt, {
    pixelRatio: scale,
    backgroundColor: '#ffffff',
    cacheBust: true,
    skipFonts: false,
    width,
    height,
    canvasWidth: Math.ceil(width * scale),
    canvasHeight: Math.ceil(height * scale),
    style: {
      margin: '0',
      transform: 'none',
    },
  })
  const base64 = dataUrlToBase64(dataUrl)
  if (!base64) throw new Error('Foto do cupom vazia.')
  return base64
}

async function fotografarComHtml2Canvas(
  receipt: HTMLElement,
  width: number,
  height: number,
  scale: number
): Promise<string> {
  const canvas = await html2canvas(receipt, {
    scale,
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: false,
    logging: false,
    width,
    height,
    windowWidth: width,
    windowHeight: height + 32,
    foreignObjectRendering: true,
  })
  if (canvas.width < 8 || canvas.height < 8) {
    throw new Error('Falha ao rasterizar o cupom.')
  }
  return dataUrlToBase64(canvas.toDataURL('image/png'))
}

/**
 * Fotografa o mesmo HTML do preview com o motor do navegador.
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
    if (doc.fonts?.load) {
      await Promise.race([
        doc.fonts.load('24px EscPosFontA'),
        new Promise(resolve => window.setTimeout(resolve, 800)),
      ])
    }
    doc.documentElement.style.overflow = 'visible'
    doc.body.style.overflow = 'visible'
    doc.body.style.height = 'auto'
    const receipt = (doc.querySelector('.receipt') as HTMLElement | null) ?? doc.body
    receipt.style.overflow = 'visible'
    await nextPaint()
    let { width, height } = measureReceipt(receipt, options.widthPx)
    height += 2
    iframe.style.height = `${height}px`
    iframe.style.width = `${width}px`
    await nextPaint()
    const again = measureReceipt(receipt, options.widthPx)
    width = Math.max(width, again.width)
    height = Math.max(height, again.height + 2)
    iframe.style.height = `${height}px`
    iframe.style.width = `${width}px`

    try {
      return await fotografarComMotorDoNavegador(receipt, width, height, scale)
    } catch {
      return await fotografarComHtml2Canvas(receipt, width, height, scale)
    }
  } finally {
    iframe.remove()
  }
}

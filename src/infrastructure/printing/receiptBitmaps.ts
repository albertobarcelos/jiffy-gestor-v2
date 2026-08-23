import QRCode from 'qrcode'

function qrModules(data: string) {
  return QRCode.create(data, { errorCorrectionLevel: 'H' }).modules
}

/** QR em PNG 1:1 com o tamanho da tela — módulo inteiro, sem reamostrar. */
export function renderQrSvg(data: string, sizePx: number): string {
  try {
    const modules = qrModules(data)
    const n = modules.size
    const margin = 2
    const cells = n + margin * 2
    const modulePx = Math.max(3, Math.floor(sizePx / cells))
    const dim = cells * modulePx
    if (typeof document === 'undefined') {
      return renderQrSvgMarkup(modules, n, margin, dim)
    }
    const canvas = document.createElement('canvas')
    canvas.width = dim
    canvas.height = dim
    const ctx = canvas.getContext('2d')
    if (!ctx) return renderQrSvgMarkup(modules, n, margin, dim)
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, dim, dim)
    ctx.fillStyle = '#000000'
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (!modules.get(y, x)) continue
        ctx.fillRect((x + margin) * modulePx, (y + margin) * modulePx, modulePx, modulePx)
      }
    }
    return `<img src="${canvas.toDataURL('image/png')}" alt="" width="${dim}" height="${dim}"/>`
  } catch {
    return ''
  }
}

function renderQrSvgMarkup(
  modules: { get(row: number, col: number): number },
  n: number,
  margin: number,
  dim: number
): string {
  const view = n + margin * 2
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${view} ${view}" shape-rendering="crispEdges">`,
    `<rect width="${view}" height="${view}" fill="#fff"/>`,
  ]
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (modules.get(y, x)) {
        parts.push(`<rect x="${x + margin}" y="${y + margin}" width="1" height="1" fill="#000"/>`)
      }
    }
  }
  parts.push('</svg>')
  return parts.join('')
}

/** Faixa --------- em pixels (preview e papel iguais). */
export function renderDashSeparatorHtml(widthPx: number, double = false): string {
  const dash = 10
  const gap = 5
  const thick = 3
  const gapY = 4
  const rows = double ? 2 : 1
  const h = rows * thick + (rows - 1) * gapY
  const w = Math.max(40, Math.floor(widthPx))
  const text = '-'.repeat(Math.max(12, Math.floor(w / 8)))
  if (typeof document === 'undefined') {
    return `<div class="separator">${double ? `${text}<br/>${text}` : text}</div>`
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return `<div class="separator">${double ? `${text}<br/>${text}` : text}</div>`
  }
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#000000'
  for (let row = 0; row < rows; row++) {
    const y = row * (thick + gapY)
    for (let x = 0; x < w; x += dash + gap) {
      ctx.fillRect(x, y, Math.min(dash, w - x), thick)
    }
  }
  return `<div class="separator"><img src="${canvas.toDataURL('image/png')}" width="${w}" height="${h}" alt=""/></div>`
}

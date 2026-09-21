/** Dimensões 80 mm alinhadas a `PRODUCAO_80MM` — sem importar a application. */
const PILULA_80MM = {
  larguraRasterPx: 576,
  margemPilulaPx: 12,
  gapAbaixoPilulaPx: 10,
  raioPilulaPx: 2,
} as const

export type VariantePilulaProducao = 'senha' | 'identidade' | 'codigo'

type EstiloPilula = {
  fontPx: number
  fontWeight: number
  paddingY: number
  paddingX: number
  letterSpacing: number
}

const ESTILO: Record<VariantePilulaProducao, EstiloPilula> = {
  senha: { fontPx: 40, fontWeight: 800, paddingY: 4, paddingX: 48, letterSpacing: 0 },
  codigo: { fontPx: 36, fontWeight: 800, paddingY: 6, paddingX: 28, letterSpacing: 0 },
  identidade: { fontPx: 30, fontWeight: 700, paddingY: 6, paddingX: 32, letterSpacing: 0 },
}

function canvas2d(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  return ctx
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * Pílula preta com texto branco. Não usa reverse nativo da impressora.
 * Retorna data URL PNG ou vazio se não houver canvas (teste Node).
 */
export function desenharPilulaProducaoPng(
  texto: string,
  variante: VariantePilulaProducao,
  larguraPx = PILULA_80MM.larguraRasterPx
): string {
  const t = texto.trim()
  if (!t) return ''
  const ctx = canvas2d()
  if (!ctx) return ''

  const estilo = ESTILO[variante]
  const margem = PILULA_80MM.margemPilulaPx
  const gap = PILULA_80MM.gapAbaixoPilulaPx
  const pillW = Math.max(8, larguraPx - margem * 2)
  ctx.font = `${estilo.fontWeight} ${estilo.fontPx}px "Arial", "Segoe UI", sans-serif`
  let fontPx = estilo.fontPx
  const fontMin = variante === 'codigo' ? 22 : variante === 'identidade' ? 24 : 12
  while (fontPx > fontMin && ctx.measureText(t).width + estilo.paddingX * 2 > pillW) {
    fontPx -= 1
    ctx.font = `${estilo.fontWeight} ${fontPx}px "Arial", "Segoe UI", sans-serif`
  }

  const textH = Math.ceil(fontPx * 1.15)
  const pillH = estilo.paddingY * 2 + textH
  const canvas = ctx.canvas
  canvas.width = larguraPx
  canvas.height = pillH + gap

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000000'
  roundRect(ctx, margem, 0, pillW, pillH, PILULA_80MM.raioPilulaPx)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `${estilo.fontWeight} ${fontPx}px "Arial", "Segoe UI", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (variante === 'senha' && 'letterSpacing' in ctx) {
    ctx.letterSpacing = '6px'
  }
  ctx.fillText(t, larguraPx / 2, pillH / 2)
  return canvas.toDataURL('image/png')
}

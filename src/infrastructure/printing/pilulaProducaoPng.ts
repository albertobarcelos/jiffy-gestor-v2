import type { VariantePilulaProducao } from '@/src/application/ports/IDesenharPilulaProducao'

/** Dimensões 80 mm alinhadas a `PRODUCAO_80MM` — sem importar layout da application. */
const PILULA_80MM = {
  larguraRasterPx: 576,
  margemPilulaPx: 12,
  gapAbaixoPilulaPx: 10,
  raioPilulaPx: 2,
} as const

type EstiloPilula = {
  fontPx: number
  fontWeight: number
  paddingY: number
  paddingX: number
  letterSpacing: number
  fontFamily: string
}

const FONTE_TITULO = 'Arial, Tahoma, sans-serif'

const ESTILO: Record<VariantePilulaProducao, EstiloPilula> = {
  senha: { fontPx: 40, fontWeight: 800, paddingY: 4, paddingX: 48, letterSpacing: 0, fontFamily: FONTE_TITULO },
  codigo: { fontPx: 30, fontWeight: 800, paddingY: 6, paddingX: 16, letterSpacing: 0, fontFamily: FONTE_TITULO },
  identidade: { fontPx: 30, fontWeight: 800, paddingY: 6, paddingX: 16, letterSpacing: 0, fontFamily: FONTE_TITULO },
}

const FONT_MIN_PILULA = 16
const FOLGA_TEXTO_PILULA_PX = 12

export function fontPxParaCaberNaPilula(
  larguraTextoPx: (fontPx: number) => number,
  larguraUtilPx: number,
  fontInicial: number,
  fontMin = FONT_MIN_PILULA
): number {
  let fontPx = Math.max(fontMin, fontInicial)
  while (fontPx > fontMin && larguraTextoPx(fontPx) > larguraUtilPx) {
    fontPx -= 1
  }
  return fontPx
}

function cssFonte(estilo: EstiloPilula, fontPx: number): string {
  return `${estilo.fontWeight} ${fontPx}px ${estilo.fontFamily}`
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

const ESPESSURA_CONTORNO_PILULA = 4

/**
 * Pílula só com contorno (sem preenchimento preto) — foodservice imprime o dia todo.
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
  const larguraUtil = Math.max(8, pillW - estilo.paddingX * 2 - FOLGA_TEXTO_PILULA_PX)
  const fontPx = fontPxParaCaberNaPilula(
    tamanho => {
      ctx.font = cssFonte(estilo, tamanho)
      return ctx.measureText(t).width
    },
    larguraUtil,
    estilo.fontPx,
    variante === 'senha' ? 12 : FONT_MIN_PILULA
  )

  const textH = Math.ceil(fontPx * 1.15)
  const pillH = estilo.paddingY * 2 + textH
  const canvas = ctx.canvas
  canvas.width = larguraPx
  canvas.height = pillH + gap

  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const meiaBorda = ESPESSURA_CONTORNO_PILULA / 2
  ctx.lineWidth = ESPESSURA_CONTORNO_PILULA
  ctx.strokeStyle = '#000000'
  ctx.setLineDash([10, 6])
  roundRect(
    ctx,
    margem + meiaBorda,
    meiaBorda,
    Math.max(1, pillW - ESPESSURA_CONTORNO_PILULA),
    Math.max(1, pillH - ESPESSURA_CONTORNO_PILULA),
    PILULA_80MM.raioPilulaPx
  )
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#000000'
  ctx.font = cssFonte(estilo, fontPx)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (variante === 'senha' && 'letterSpacing' in ctx) {
    ctx.letterSpacing = '6px'
  }
  ctx.fillText(t, larguraPx / 2, pillH / 2, larguraUtil)
  return canvas.toDataURL('image/png')
}

const PERNA_MOLDURA_PX = 16
/** Caixa mais larga que o texto 2×2: laterais fora das letras. */
export const MARGEM_LATERAL_MOLDURA_PX = 4

/** Teto ou base da caixa pontilhada — sem texto, para emoldurar Font A 2×2. */
export function desenharMolduraIdentidadePng(
  parte: 'topo' | 'base',
  larguraPx = PILULA_80MM.larguraRasterPx
): string {
  const ctx = canvas2d()
  if (!ctx) return ''
  const margem = MARGEM_LATERAL_MOLDURA_PX
  const meia = ESPESSURA_CONTORNO_PILULA / 2
  const x = margem + meia
  const w = Math.max(1, larguraPx - margem * 2 - ESPESSURA_CONTORNO_PILULA)
  const r = PILULA_80MM.raioPilulaPx
  const canvas = ctx.canvas
  canvas.width = larguraPx
  canvas.height = PERNA_MOLDURA_PX
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.lineWidth = ESPESSURA_CONTORNO_PILULA
  ctx.strokeStyle = '#000000'
  ctx.setLineDash([10, 6])
  ctx.beginPath()
  if (parte === 'topo') {
    const y = meia
    ctx.moveTo(x, PERNA_MOLDURA_PX)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, PERNA_MOLDURA_PX)
  } else {
    const y = PERNA_MOLDURA_PX - meia
    ctx.moveTo(x, 0)
    ctx.lineTo(x, y - r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y - r)
    ctx.lineTo(x + w, 0)
  }
  ctx.stroke()
  return canvas.toDataURL('image/png')
}

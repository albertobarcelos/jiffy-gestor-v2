import { modulosCode128B } from '@/src/application/expedicao/codigoBarras128'
import { barcodePedidoRasterSize } from '@/src/application/delivery/cupomPrintLayout'

const QUIET_ZONE = 10

function canvas2d(widthPx: number, heightPx: number): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = widthPx
  canvas.height = heightPx
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingEnabled = false
  return ctx
}

/** Code 128 em PNG na largura da térmica 80 mm. */
export function desenharCodigoBarras128Png(payload: string): string | null {
  const bits = modulosCode128B(payload)
  if (!bits.length) return null
  const { widthPx, heightPx } = barcodePedidoRasterSize(80)
  const cells = bits.length + QUIET_ZONE * 2
  const modulePx = Math.max(1, Math.floor(widthPx / cells))
  const w = cells * modulePx
  const ctx = canvas2d(w, heightPx)
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, heightPx)
  ctx.fillStyle = '#000000'
  for (let i = 0; i < bits.length; i++) {
    if (!bits[i]) continue
    ctx.fillRect((i + QUIET_ZONE) * modulePx, 0, modulePx, heightPx)
  }
  return ctx.canvas.toDataURL('image/png')
}

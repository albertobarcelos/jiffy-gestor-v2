import QRCode from 'qrcode'
import { qrPedidoModuleSizeForWidth } from '@/src/application/delivery/cupomPrintLayout'
import { PRODUCAO_80MM } from '@/src/application/delivery/layoutProducao80mm'
import { modulosCode128B } from '@/src/application/expedicao/codigoBarras128'
import type { DesenharSimboloPedidoLinha } from '@/src/application/ports/IDesenharSimboloPedidoLinha'

const GAP = 16
const QUIET_BARRAS = 10
const FONTE_PX = 22
const LINE_H = 26

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

function quebrarLinhas(ctx: CanvasRenderingContext2D, texto: string, maxW: number): string[] {
  const t = texto.trim()
  if (!t) return []
  if (ctx.measureText(t).width <= maxW) return [t]
  const out: string[] = []
  let linha = ''
  for (const palavra of t.split(/\s+/)) {
    const tentativa = linha ? `${linha} ${palavra}` : palavra
    if (ctx.measureText(tentativa).width <= maxW) {
      linha = tentativa
      continue
    }
    if (linha) out.push(linha)
    if (ctx.measureText(palavra).width <= maxW) {
      linha = palavra
      continue
    }
    let pedaco = ''
    for (const ch of palavra) {
      if (ctx.measureText(pedaco + ch).width <= maxW) {
        pedaco += ch
        continue
      }
      if (pedaco) out.push(pedaco)
      pedaco = ch
    }
    linha = pedaco
  }
  if (linha) out.push(linha)
  return out
}

function tamanhoQr(payload: string, modulePx: number): { size: number; modules: { get(row: number, col: number): number }; n: number } | null {
  try {
    const modules = QRCode.create(payload, { errorCorrectionLevel: 'H' }).modules
    const n = modules.size
    return { size: (n + 4) * modulePx, modules, n }
  } catch {
    return null
  }
}

function tamanhoBarras(payload: string, maxWidth: number): { width: number; height: number; bits: number[]; modulePx: number } | null {
  const bits = modulosCode128B(payload)
  if (!bits.length) return null
  const cells = bits.length + QUIET_BARRAS * 2
  const modulePx = Math.max(1, Math.floor(maxWidth / cells))
  return { width: cells * modulePx, height: 80, bits, modulePx }
}

export const desenharSimboloPedidoLinhaPng: DesenharSimboloPedidoLinha = input => {
  const payload = input.payload.trim()
  if (!payload) return null
  const paper = PRODUCAO_80MM.larguraRasterPx
  const maxSimbolo = Math.floor(paper * 0.48)
  const modulePx = qrPedidoModuleSizeForWidth(PRODUCAO_80MM.papelMm)
  const qr = input.tipo === 'qrcode' ? tamanhoQr(payload, modulePx) : null
  const barras = input.tipo === 'codigo_barras' ? tamanhoBarras(payload, maxSimbolo) : null
  const simboloW = qr?.size ?? barras?.width ?? 0
  const simboloH = qr?.size ?? barras?.height ?? 0
  if (!simboloW) return null
  const textoX = simboloW + GAP
  const textoW = Math.max(80, paper - textoX)
  const probe = canvas2d(8, 8)
  if (!probe) return null
  probe.font = `700 ${FONTE_PX}px Arial, Tahoma, sans-serif`
  const linhas = input.linhas.flatMap(linha => quebrarLinhas(probe, linha, textoW))
  const textoH = Math.max(LINE_H, linhas.length * LINE_H)
  const height = Math.max(simboloH, textoH) + 8
  const ctx = canvas2d(paper, height)
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, paper, height)
  ctx.fillStyle = '#000000'
  if (qr) {
    for (let y = 0; y < qr.n; y++) {
      for (let x = 0; x < qr.n; x++) {
        if (!qr.modules.get(y, x)) continue
        ctx.fillRect((x + 2) * modulePx, (y + 2) * modulePx, modulePx, modulePx)
      }
    }
  } else if (barras) {
    for (let i = 0; i < barras.bits.length; i++) {
      if (!barras.bits[i]) continue
      ctx.fillRect((i + QUIET_BARRAS) * barras.modulePx, 0, barras.modulePx, barras.height)
    }
  }
  ctx.font = `700 ${FONTE_PX}px Arial, Tahoma, sans-serif`
  ctx.textBaseline = 'alphabetic'
  const y0 = Math.max(FONTE_PX, Math.floor((height - textoH) / 2) + FONTE_PX)
  linhas.forEach((linha, i) => {
    ctx.fillText(linha, textoX, y0 + i * LINE_H)
  })
  return ctx.canvas.toDataURL('image/png')
}

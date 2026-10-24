import { modulosCode128B } from '@/src/application/expedicao/codigoBarras128'

const QUIET_ZONE = 10

/** SVG do Code 128B — sem DOM, serve no preview e nos testes. */
export function renderCode128Svg(texto: string, widthPx: number, heightPx: number): string {
  const bits = modulosCode128B(texto)
  if (!bits.length) return ''
  const cells = bits.length + QUIET_ZONE * 2
  const barras: string[] = []
  for (let i = 0; i < bits.length; i++) {
    if (!bits[i]) continue
    barras.push(`<rect x="${i + QUIET_ZONE}" y="0" width="1" height="1" fill="#000"/>`)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(1, Math.floor(widthPx))}" height="${Math.max(1, Math.floor(heightPx))}" viewBox="0 0 ${cells} 1" preserveAspectRatio="none" shape-rendering="crispEdges"><rect width="${cells}" height="1" fill="#fff"/>${barras.join('')}</svg>`
}

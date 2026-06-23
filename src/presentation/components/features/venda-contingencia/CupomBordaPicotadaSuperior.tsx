/** Largura de cada “dente” do zigzag (aumente para picotado mais largo). */
export const CUPOM_PICOTADO_TILE_WIDTH = 24
export const CUPOM_PICOTADO_TILE_HEIGHT = 10

const TILE_WIDTH = CUPOM_PICOTADO_TILE_WIDTH
const TILE_HEIGHT = CUPOM_PICOTADO_TILE_HEIGHT
const HALF = TILE_WIDTH / 4

/** Alinhado ao `border-slate-200/90` do cupom. */
const BORDER_STROKE = '#e2e8f0'

const ZIGZAG_TOP_LINE = `M0,${TILE_HEIGHT} L${HALF},0 L${HALF * 2},${TILE_HEIGHT} L${HALF * 3},0 L${TILE_WIDTH},${TILE_HEIGHT}`

const ZIGZAG_BOTTOM_LINE = `M0,0 L${HALF},${TILE_HEIGHT} L${HALF * 2},0 L${HALF * 3},${TILE_HEIGHT} L${TILE_WIDTH},0`

function buildPicotadoBg(line: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_WIDTH}" height="${TILE_HEIGHT}" viewBox="0 0 ${TILE_WIDTH} ${TILE_HEIGHT}">
  <path d="${line} Z" fill="white"/>
  <path d="${line}" fill="none" stroke="${BORDER_STROKE}" stroke-width="1"/>
</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

const PICOTADO_TOP_BG = buildPicotadoBg(ZIGZAG_TOP_LINE)
const PICOTADO_BOTTOM_BG = buildPicotadoBg(ZIGZAG_BOTTOM_LINE)

const picotadoStripStyle = (backgroundImage: string, backgroundPosition: string) => ({
  height: TILE_HEIGHT,
  backgroundImage,
  backgroundRepeat: 'repeat-x' as const,
  backgroundSize: `${TILE_WIDTH}px ${TILE_HEIGHT}px`,
  backgroundPosition,
})

/**
 * Borda superior picotada: preenchimento branco + contorno no zigzag (sem linha na base).
 */
export function CupomBordaPicotadaSuperior() {
  return (
    <div
      className="w-full shrink-0"
      aria-hidden
      style={picotadoStripStyle(PICOTADO_TOP_BG, 'top center')}
    />
  )
}

/**
 * Borda inferior picotada (espelho do topo): dentes para baixo, sem linha no topo do tile.
 */
export function CupomBordaPicotadaInferior() {
  return (
    <div
      className="w-full shrink-0"
      aria-hidden
      style={picotadoStripStyle(PICOTADO_BOTTOM_BG, 'bottom center')}
    />
  )
}

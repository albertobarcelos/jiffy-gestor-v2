import type { Area } from 'react-easy-crop'

/** Dimensões finais da logo de impressão (alinhado ao backend `LogoImpressaoPolicy`). */
export const LOGO_IMPRESSAO_WIDTH = 280
export const LOGO_IMPRESSAO_HEIGHT = 150
export const LOGO_IMPRESSAO_ASPECT = LOGO_IMPRESSAO_WIDTH / LOGO_IMPRESSAO_HEIGHT

/** Moldura fixa no modal (px CSS) — mesma sensação visual em qualquer foto. */
export const LOGO_CROP_DISPLAY_WIDTH = 280
export const LOGO_CROP_DISPLAY_HEIGHT = 150
/** Área escura ao redor da moldura (centralizada). */
export const LOGO_CROP_CONTAINER_WIDTH = 360
export const LOGO_CROP_CONTAINER_HEIGHT = 200

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('Falha ao carregar a imagem')))
    image.src = src
  })
}

/** Converte área em % (react-easy-crop) para pixels na imagem original. */
function cropPercentToNaturalPixels(
  image: HTMLImageElement,
  croppedAreaPercentages: Area
): { x: number; y: number; width: number; height: number } {
  const nw = image.naturalWidth
  const nh = image.naturalHeight
  return {
    x: Math.round((croppedAreaPercentages.x / 100) * nw),
    y: Math.round((croppedAreaPercentages.y / 100) * nh),
    width: Math.round((croppedAreaPercentages.width / 100) * nw),
    height: Math.round((croppedAreaPercentages.height / 100) * nh),
  }
}

/**
 * Coloca o recorte no canvas 280×150: centralizado, proporção mantida, sem ampliar.
 * Imagens menores que o cupom ganham margens transparentes; maiores são reduzidas.
 */
function composeLogoImpressaoCanvas(
  cropCanvas: HTMLCanvasElement,
  cropWidth: number,
  cropHeight: number
): HTMLCanvasElement {
  const scale = Math.min(
    LOGO_IMPRESSAO_WIDTH / cropWidth,
    LOGO_IMPRESSAO_HEIGHT / cropHeight,
    1
  )
  const scaledW = Math.round(cropWidth * scale)
  const scaledH = Math.round(cropHeight * scale)
  const offsetX = Math.floor((LOGO_IMPRESSAO_WIDTH - scaledW) / 2)
  const offsetY = Math.floor((LOGO_IMPRESSAO_HEIGHT - scaledH) / 2)

  const outCanvas = document.createElement('canvas')
  outCanvas.width = LOGO_IMPRESSAO_WIDTH
  outCanvas.height = LOGO_IMPRESSAO_HEIGHT
  const outCtx = outCanvas.getContext('2d')
  if (!outCtx) {
    throw new Error('Não foi possível processar a imagem.')
  }
  outCtx.clearRect(0, 0, LOGO_IMPRESSAO_WIDTH, LOGO_IMPRESSAO_HEIGHT)
  outCtx.imageSmoothingEnabled = true
  outCtx.imageSmoothingQuality = 'high'
  outCtx.drawImage(
    cropCanvas,
    0,
    0,
    cropWidth,
    cropHeight,
    offsetX,
    offsetY,
    scaledW,
    scaledH
  )
  return outCanvas
}

/**
 * Recorta a área visível no modal (via %) e exporta PNG 280×150 com alpha.
 * Usa percentagens — alinhado ao cálculo do react-easy-crop com `cropSize` fixo.
 */
export async function cropImageToLogoImpressao(
  imageSrc: string,
  croppedAreaPercentages: Area
): Promise<File> {
  const image = await loadImage(imageSrc)
  const { x, y, width, height } = cropPercentToNaturalPixels(image, croppedAreaPercentages)

  if (width <= 0 || height <= 0) {
    throw new Error('Área de recorte inválida.')
  }

  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = width
  cropCanvas.height = height
  const cropCtx = cropCanvas.getContext('2d')
  if (!cropCtx) {
    throw new Error('Não foi possível processar a imagem.')
  }
  cropCtx.drawImage(image, x, y, width, height, 0, 0, width, height)

  const outCanvas = composeLogoImpressaoCanvas(cropCanvas, width, height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    outCanvas.toBlob(
      result => {
        if (result) resolve(result)
        else reject(new Error('Falha ao gerar a imagem recortada.'))
      },
      'image/png',
      1
    )
  })

  return new File([blob], 'logo-impressao.png', { type: 'image/png' })
}

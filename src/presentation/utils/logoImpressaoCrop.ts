import type { MediaSize } from 'react-easy-crop'

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

/** Limites da moldura de recorte no modal (px CSS). */
export const LOGO_CROP_FRAME_MIN_WIDTH = 48
export const LOGO_CROP_FRAME_MIN_HEIGHT = 28

export type CropFrameSize = { width: number; height: number }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('Falha ao carregar a imagem')))
    image.src = src
  })
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

/**
 * Pixels na imagem original a partir da moldura (CSS), media exibida e pan.
 * Evita o teto de 100% do react-easy-crop quando a moldura é maior que a imagem no ecrã.
 */
export function getLogoCropNaturalArea(
  crop: { x: number; y: number },
  mediaSize: MediaSize,
  cropFrameSize: CropFrameSize,
  zoom: number
): { x: number; y: number; width: number; height: number } {
  const mediaW = mediaSize.width
  const mediaH = mediaSize.height
  const naturalW = mediaSize.naturalWidth
  const naturalH = mediaSize.naturalHeight
  const frameW = cropFrameSize.width / zoom
  const frameH = cropFrameSize.height / zoom

  const overlapW = Math.min(frameW, mediaW)
  const overlapH = Math.min(frameH, mediaH)

  const width = Math.round((overlapW / mediaW) * naturalW)
  const height = Math.round((overlapH / mediaH) * naturalH)

  const xPercent = clampPercent(
    (((mediaW - frameW) / 2 - crop.x / zoom) / mediaW) * 100
  )
  const yPercent = clampPercent(
    (((mediaH - frameH) / 2 - crop.y / zoom) / mediaH) * 100
  )

  const x = Math.round(
    Math.min(Math.max(0, (xPercent / 100) * naturalW), Math.max(0, naturalW - width))
  )
  const y = Math.round(
    Math.min(Math.max(0, (yPercent / 100) * naturalH), Math.max(0, naturalH - height))
  )

  return { x, y, width, height }
}

/**
 * Moldura inicial ao importar: encaixa na imagem sem ultrapassar o máximo do cupom.
 */
export function getInitialCropFrameSize(
  media: MediaSize,
  maxFrame: CropFrameSize
): CropFrameSize {
  return clampCropFrameSize(
    {
      width: Math.min(maxFrame.width, media.naturalWidth, LOGO_IMPRESSAO_WIDTH),
      height: Math.min(maxFrame.height, media.naturalHeight, LOGO_IMPRESSAO_HEIGHT),
    },
    maxFrame
  )
}

/**
 * Tamanho final do PNG: moldura (px), limites do cupom, recorte e imagem original.
 * Nunca amplia — só reduz quando a moldura ou o máximo exigem.
 */
export function getLogoOutputDimensions(
  cropFrameSize: CropFrameSize,
  naturalCrop: { width: number; height: number },
  naturalImageSize?: { width: number; height: number }
): { width: number; height: number } {
  const capW = naturalImageSize
    ? Math.min(LOGO_IMPRESSAO_WIDTH, naturalImageSize.width)
    : LOGO_IMPRESSAO_WIDTH
  const capH = naturalImageSize
    ? Math.min(LOGO_IMPRESSAO_HEIGHT, naturalImageSize.height)
    : LOGO_IMPRESSAO_HEIGHT

  const width = Math.min(cropFrameSize.width, capW, naturalCrop.width)
  const height = Math.min(cropFrameSize.height, capH, naturalCrop.height)

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  }
}

/** Estima px de saída (igual ao que será gravado ao aplicar). */
export function estimateOutputSizeFromCropFrame(
  crop: { x: number; y: number },
  mediaSize: MediaSize,
  cropFrameSize: CropFrameSize,
  zoom: number
): { width: number; height: number } {
  const naturalCrop = getLogoCropNaturalArea(crop, mediaSize, cropFrameSize, zoom)
  return getLogoOutputDimensions(cropFrameSize, naturalCrop, {
    width: mediaSize.naturalWidth,
    height: mediaSize.naturalHeight,
  })
}

export function clampCropFrameSize(
  size: CropFrameSize,
  max: CropFrameSize
): CropFrameSize {
  return {
    width: Math.min(
      max.width,
      Math.max(LOGO_CROP_FRAME_MIN_WIDTH, Math.round(size.width))
    ),
    height: Math.min(
      max.height,
      Math.max(LOGO_CROP_FRAME_MIN_HEIGHT, Math.round(size.height))
    ),
  }
}

export async function loadLogoImageNaturalSize(
  src: string
): Promise<{ width: number; height: number }> {
  const image = await loadImage(src)
  return { width: image.naturalWidth, height: image.naturalHeight }
}

/**
 * Recorta o que está dentro da moldura e grava PNG (sem ampliar além do recorte natural).
 */
export async function cropImageToLogoImpressao(
  imageSrc: string,
  cropFrameSize: CropFrameSize,
  naturalArea: { x: number; y: number; width: number; height: number }
): Promise<File> {
  const image = await loadImage(imageSrc)
  const { x, y, width, height } = naturalArea

  if (width <= 0 || height <= 0) {
    throw new Error('Área de recorte inválida.')
  }

  const { width: outW, height: outH } = getLogoOutputDimensions(
    cropFrameSize,
    { width, height },
    { width: image.naturalWidth, height: image.naturalHeight }
  )

  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = width
  cropCanvas.height = height
  const cropCtx = cropCanvas.getContext('2d')
  if (!cropCtx) {
    throw new Error('Não foi possível processar a imagem.')
  }
  cropCtx.drawImage(image, x, y, width, height, 0, 0, width, height)

  const outCanvas = document.createElement('canvas')
  outCanvas.width = outW
  outCanvas.height = outH
  const outCtx = outCanvas.getContext('2d')
  if (!outCtx) {
    throw new Error('Não foi possível processar a imagem.')
  }
  outCtx.imageSmoothingEnabled = true
  outCtx.imageSmoothingQuality = 'high'
  if (outW === width && outH === height) {
    outCtx.drawImage(cropCanvas, 0, 0)
  } else {
    outCtx.drawImage(cropCanvas, 0, 0, width, height, 0, 0, outW, outH)
  }

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

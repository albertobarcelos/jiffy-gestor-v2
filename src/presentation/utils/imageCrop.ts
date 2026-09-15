import type { MediaSize } from 'react-easy-crop'

export type CropFrameSize = { width: number; height: number }

export type ImageCropOutputMime = 'image/jpeg' | 'image/png' | 'image/webp'

export type ImageCropPreset = {
  id: string
  title: string
  descriptionLines: string[]
  /** Cap de saída em pixels. */
  maxOutputWidth: number
  maxOutputHeight: number
  /** Tamanho visual da moldura no modal (CSS px). */
  displayFrameWidth: number
  displayFrameHeight: number
  containerWidth: number
  containerHeight: number
  frameMinWidth: number
  frameMinHeight: number
  /** Se true, a moldura mantém o aspect de maxOutput. */
  lockAspectRatio: boolean
  /** MIME de fallback (e quando preserveSourceMimeType é false). */
  outputMimeType: ImageCropOutputMime
  outputQuality: number
  /** Nome de fallback; com preserveSourceMimeType usa o nome da fonte + extensão correta. */
  outputFileName: string
  /**
   * Se true, a saída mantém JPEG/PNG/WebP do ficheiro original
   * (em vez de forçar outputMimeType).
   */
  preserveSourceMimeType?: boolean
  maxSourceBytes: number
  acceptedMimeTypes: readonly string[]
  footerHint?: string
}

export function resolveCropOutputMime(
  sourceMimeType: string | undefined,
  preset: ImageCropPreset
): ImageCropOutputMime {
  if (
    preset.preserveSourceMimeType &&
    (sourceMimeType === 'image/jpeg' ||
      sourceMimeType === 'image/png' ||
      sourceMimeType === 'image/webp')
  ) {
    return sourceMimeType
  }
  return preset.outputMimeType
}

export function resolveCropOutputFileName(
  sourceFileName: string | undefined,
  mimeType: ImageCropOutputMime,
  preset: ImageCropPreset
): string {
  const ext =
    mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
  const baseFromSource = sourceFileName?.replace(/\.[^.]+$/, '').trim()
  if (baseFromSource) return `${baseFromSource}.${ext}`
  const baseFromPreset = preset.outputFileName.replace(/\.[^.]+$/, '')
  return `${baseFromPreset || preset.id}.${ext}`
}

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

export function getCropPresetAspect(preset: ImageCropPreset): number {
  return preset.maxOutputWidth / preset.maxOutputHeight
}

/**
 * Pixels na imagem original a partir da moldura (CSS), media exibida e pan.
 */
export function getCropNaturalArea(
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

  const xPercent = clampPercent((((mediaW - frameW) / 2 - crop.x / zoom) / mediaW) * 100)
  const yPercent = clampPercent((((mediaH - frameH) / 2 - crop.y / zoom) / mediaH) * 100)

  const x = Math.round(
    Math.min(Math.max(0, (xPercent / 100) * naturalW), Math.max(0, naturalW - width))
  )
  const y = Math.round(
    Math.min(Math.max(0, (yPercent / 100) * naturalH), Math.max(0, naturalH - height))
  )

  return { x, y, width, height }
}

export function clampCropFrameSize(
  size: CropFrameSize,
  max: CropFrameSize,
  preset: ImageCropPreset
): CropFrameSize {
  let width = Math.min(max.width, Math.max(preset.frameMinWidth, Math.round(size.width)))
  let height = Math.min(max.height, Math.max(preset.frameMinHeight, Math.round(size.height)))

  if (preset.lockAspectRatio) {
    const aspect = getCropPresetAspect(preset)
    const byWidthH = Math.round(width / aspect)
    const byHeightW = Math.round(height * aspect)

    if (byWidthH <= max.height && byWidthH >= preset.frameMinHeight) {
      height = byWidthH
    } else {
      width = Math.min(max.width, Math.max(preset.frameMinWidth, byHeightW))
      height = Math.min(max.height, Math.max(preset.frameMinHeight, Math.round(width / aspect)))
    }
  }

  return { width, height }
}

export function getInitialCropFrameSize(
  media: MediaSize,
  maxFrame: CropFrameSize,
  preset: ImageCropPreset
): CropFrameSize {
  // Moldura inicial = máxima visual do contentor (CSS).
  // Não misturar maxOutput/natural px com CSS — isso travava a saída em 280
  // quando displayFrame < maxOutput (logo 500, capa 1200).
  if (preset.lockAspectRatio) {
    const aspect = getCropPresetAspect(preset)
    let width = maxFrame.width
    let height = Math.round(width / aspect)
    if (height > maxFrame.height) {
      height = maxFrame.height
      width = Math.round(height * aspect)
    }
    // Em imagens menores que a moldura, encaixa sem ultrapassar o media renderizado.
    const mediaSide = Math.min(media.width, media.height)
    if (mediaSide > 0 && width > mediaSide) {
      width = Math.floor(mediaSide)
      height = Math.round(width / aspect)
    }
    return clampCropFrameSize({ width, height }, maxFrame, preset)
  }

  return clampCropFrameSize(
    {
      width: Math.min(maxFrame.width, media.width || maxFrame.width),
      height: Math.min(maxFrame.height, media.height || maxFrame.height),
    },
    maxFrame,
    preset
  )
}

/**
 * Tamanho final em pixels.
 *
 * - Moldura CSS cheia (`displayFrame`) mapeia para `maxOutput` (ex.: 280 CSS → 500 px).
 * - Ao redimensionar a moldura, o estimado sobe/desce de forma previsível.
 * - Nunca amplia além dos pixels reais do recorte na imagem fonte.
 */
export function getCropOutputDimensions(
  cropFrameSize: CropFrameSize,
  naturalCrop: { width: number; height: number },
  preset: ImageCropPreset,
  naturalImageSize?: { width: number; height: number }
): { width: number; height: number } {
  const displayW = Math.max(1, preset.displayFrameWidth)
  const displayH = Math.max(1, preset.displayFrameHeight)

  let width = Math.round((cropFrameSize.width / displayW) * preset.maxOutputWidth)
  let height = Math.round((cropFrameSize.height / displayH) * preset.maxOutputHeight)

  width = Math.min(width, preset.maxOutputWidth, naturalCrop.width)
  height = Math.min(height, preset.maxOutputHeight, naturalCrop.height)

  if (naturalImageSize) {
    width = Math.min(width, naturalImageSize.width)
    height = Math.min(height, naturalImageSize.height)
  }

  if (preset.lockAspectRatio) {
    const aspect = getCropPresetAspect(preset)
    const byW = Math.round(width / aspect)
    if (byW <= height) {
      height = Math.max(1, byW)
    } else {
      width = Math.max(1, Math.round(height * aspect))
    }
  }

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  }
}

export function estimateOutputSizeFromCropFrame(
  crop: { x: number; y: number },
  mediaSize: MediaSize,
  cropFrameSize: CropFrameSize,
  zoom: number,
  preset: ImageCropPreset
): { width: number; height: number } {
  const naturalCrop = getCropNaturalArea(crop, mediaSize, cropFrameSize, zoom)
  return getCropOutputDimensions(cropFrameSize, naturalCrop, preset, {
    width: mediaSize.naturalWidth,
    height: mediaSize.naturalHeight,
  })
}

export type CropImageWithPresetOptions = {
  sourceMimeType?: string
  sourceFileName?: string
}

export async function cropImageWithPreset(
  imageSrc: string,
  cropFrameSize: CropFrameSize,
  naturalArea: { x: number; y: number; width: number; height: number },
  preset: ImageCropPreset,
  options?: CropImageWithPresetOptions
): Promise<File> {
  const image = await loadImage(imageSrc)
  const { x, y, width, height } = naturalArea

  if (width <= 0 || height <= 0) {
    throw new Error('Área de recorte inválida.')
  }

  const { width: outW, height: outH } = getCropOutputDimensions(
    cropFrameSize,
    { width, height },
    preset,
    { width: image.naturalWidth, height: image.naturalHeight }
  )

  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = width
  cropCanvas.height = height
  const cropCtx = cropCanvas.getContext('2d')
  if (!cropCtx) {
    throw new Error('Não foi possível processar a imagem.')
  }
  // Fundo branco só para JPEG (sem alpha); PNG/WebP preservam transparência.
  const outputMime = resolveCropOutputMime(options?.sourceMimeType, preset)
  if (outputMime === 'image/jpeg') {
    cropCtx.fillStyle = '#ffffff'
    cropCtx.fillRect(0, 0, width, height)
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
  if (outputMime === 'image/jpeg') {
    outCtx.fillStyle = '#ffffff'
    outCtx.fillRect(0, 0, outW, outH)
  }
  if (outW === width && outH === height) {
    outCtx.drawImage(cropCanvas, 0, 0)
  } else {
    outCtx.drawImage(cropCanvas, 0, 0, width, height, 0, 0, outW, outH)
  }

  const outputFileName = resolveCropOutputFileName(
    options?.sourceFileName,
    outputMime,
    preset
  )

  const blob = await new Promise<Blob>((resolve, reject) => {
    outCanvas.toBlob(
      result => {
        if (result) resolve(result)
        else reject(new Error('Falha ao gerar a imagem recortada.'))
      },
      outputMime,
      outputMime === 'image/png' ? undefined : preset.outputQuality
    )
  })

  return new File([blob], outputFileName, { type: outputMime })
}

export function validateImageCropSourceFile(
  file: File,
  preset: ImageCropPreset
): string | null {
  if (file.size <= 0) return 'Arquivo vazio.'
  if (file.size > preset.maxSourceBytes) {
    const mb = preset.maxSourceBytes / (1024 * 1024)
    return `Arquivo muito grande. Máximo ${mb >= 1 ? `${mb} MB` : `${Math.round(preset.maxSourceBytes / 1024)} KB`}.`
  }
  if (!preset.acceptedMimeTypes.includes(file.type)) {
    return 'Formato inválido. Use PNG, JPEG ou WEBP.'
  }
  return null
}

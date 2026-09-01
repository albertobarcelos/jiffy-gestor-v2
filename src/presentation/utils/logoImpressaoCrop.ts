/**
 * Compatibilidade com logo de impressão — reexporta constantes e helpers
 * sobre o crop genérico + preset de logo.
 */
import type { MediaSize } from 'react-easy-crop'
import { LOGO_IMPRESSAO_CROP_PRESET } from '@/src/presentation/constants/imageCropPresets'
import {
  clampCropFrameSize as clampCropFrameSizeGeneric,
  cropImageWithPreset,
  estimateOutputSizeFromCropFrame as estimateOutputSizeFromCropFrameGeneric,
  getCropNaturalArea,
  getCropOutputDimensions,
  getInitialCropFrameSize as getInitialCropFrameSizeGeneric,
  type CropFrameSize,
} from '@/src/presentation/utils/imageCrop'

export type { CropFrameSize }

export const LOGO_IMPRESSAO_WIDTH = LOGO_IMPRESSAO_CROP_PRESET.maxOutputWidth
export const LOGO_IMPRESSAO_HEIGHT = LOGO_IMPRESSAO_CROP_PRESET.maxOutputHeight
export const LOGO_IMPRESSAO_ASPECT = LOGO_IMPRESSAO_WIDTH / LOGO_IMPRESSAO_HEIGHT

export const LOGO_CROP_DISPLAY_WIDTH = LOGO_IMPRESSAO_CROP_PRESET.displayFrameWidth
export const LOGO_CROP_DISPLAY_HEIGHT = LOGO_IMPRESSAO_CROP_PRESET.displayFrameHeight
export const LOGO_CROP_CONTAINER_WIDTH = LOGO_IMPRESSAO_CROP_PRESET.containerWidth
export const LOGO_CROP_CONTAINER_HEIGHT = LOGO_IMPRESSAO_CROP_PRESET.containerHeight
export const LOGO_CROP_FRAME_MIN_WIDTH = LOGO_IMPRESSAO_CROP_PRESET.frameMinWidth
export const LOGO_CROP_FRAME_MIN_HEIGHT = LOGO_IMPRESSAO_CROP_PRESET.frameMinHeight

export function getLogoCropNaturalArea(
  crop: { x: number; y: number },
  mediaSize: MediaSize,
  cropFrameSize: CropFrameSize,
  zoom: number
) {
  return getCropNaturalArea(crop, mediaSize, cropFrameSize, zoom)
}

export function getInitialCropFrameSize(media: MediaSize, maxFrame: CropFrameSize): CropFrameSize {
  return getInitialCropFrameSizeGeneric(media, maxFrame, LOGO_IMPRESSAO_CROP_PRESET)
}

export function getLogoOutputDimensions(
  cropFrameSize: CropFrameSize,
  naturalCrop: { width: number; height: number },
  naturalImageSize?: { width: number; height: number }
) {
  return getCropOutputDimensions(
    cropFrameSize,
    naturalCrop,
    LOGO_IMPRESSAO_CROP_PRESET,
    naturalImageSize
  )
}

export function estimateOutputSizeFromCropFrame(
  crop: { x: number; y: number },
  mediaSize: MediaSize,
  cropFrameSize: CropFrameSize,
  zoom: number
) {
  return estimateOutputSizeFromCropFrameGeneric(
    crop,
    mediaSize,
    cropFrameSize,
    zoom,
    LOGO_IMPRESSAO_CROP_PRESET
  )
}

export function clampCropFrameSize(size: CropFrameSize, max: CropFrameSize): CropFrameSize {
  return clampCropFrameSizeGeneric(size, max, LOGO_IMPRESSAO_CROP_PRESET)
}

export async function cropImageToLogoImpressao(
  imageSrc: string,
  cropFrameSize: CropFrameSize,
  naturalArea: { x: number; y: number; width: number; height: number }
): Promise<File> {
  return cropImageWithPreset(
    imageSrc,
    cropFrameSize,
    naturalArea,
    LOGO_IMPRESSAO_CROP_PRESET
  )
}

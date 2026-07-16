import { useLayoutEffect, useState, type RefObject } from 'react'
import { LOGO_IMPRESSAO_CROP_PRESET } from '@/src/presentation/constants/imageCropPresets'
import {
  getCropContainerStyle,
  useMaxCropFrameSize as useMaxCropFrameSizeGeneric,
} from '@/src/presentation/components/ui/useImageCropDisplaySize'
import type { CropFrameSize } from '@/src/presentation/utils/logoImpressaoCrop'

/**
 * Tamanho máximo da moldura no contentor (logo de impressão).
 */
export function useMaxCropFrameSize(
  containerRef: RefObject<HTMLDivElement | null>,
  enabled: boolean
): CropFrameSize {
  return useMaxCropFrameSizeGeneric(containerRef, enabled, LOGO_IMPRESSAO_CROP_PRESET)
}

export const logoCropContainerStyle: React.CSSProperties = getCropContainerStyle(
  LOGO_IMPRESSAO_CROP_PRESET
)

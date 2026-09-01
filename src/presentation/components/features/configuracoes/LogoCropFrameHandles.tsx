'use client'

import {
  clampCropFrameSize,
  type CropFrameSize,
} from '@/src/presentation/utils/logoImpressaoCrop'
import { LOGO_IMPRESSAO_CROP_PRESET } from '@/src/presentation/constants/imageCropPresets'
import { ImageCropFrameHandles } from '@/src/presentation/components/ui/ImageCropFrameHandles'

interface LogoCropFrameHandlesProps {
  size: CropFrameSize
  maxSize: CropFrameSize
  onSizeChange: (size: CropFrameSize) => void
  disabled?: boolean
}

/** Compat: injeta o preset da logo no handle genérico. */
export function LogoCropFrameHandles({
  size,
  maxSize,
  onSizeChange,
  disabled,
}: LogoCropFrameHandlesProps) {
  return (
    <ImageCropFrameHandles
      size={size}
      maxSize={maxSize}
      preset={LOGO_IMPRESSAO_CROP_PRESET}
      onSizeChange={next => onSizeChange(clampCropFrameSize(next, maxSize))}
      disabled={disabled}
    />
  )
}

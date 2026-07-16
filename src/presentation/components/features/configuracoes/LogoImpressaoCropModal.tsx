'use client'

import { ImageCropModal } from '@/src/presentation/components/ui/ImageCropModal'
import { LOGO_IMPRESSAO_CROP_PRESET } from '@/src/presentation/constants/imageCropPresets'

interface LogoImpressaoCropModalProps {
  open: boolean
  imageSrc: string | null
  onClose: () => void
  onConfirm: (file: File) => void
}

export function LogoImpressaoCropModal(props: LogoImpressaoCropModalProps) {
  return <ImageCropModal {...props} preset={LOGO_IMPRESSAO_CROP_PRESET} />
}

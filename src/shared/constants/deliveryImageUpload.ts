export const DELIVERY_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export const DELIVERY_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

export const DELIVERY_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type DeliveryImageMimeType = (typeof DELIVERY_IMAGE_MIME_TYPES)[number]

export function validateDeliveryImageFile(file: File): string | null {
  if (!DELIVERY_IMAGE_MIME_TYPES.includes(file.type as DeliveryImageMimeType)) {
    return 'Formato inválido. Use JPEG, PNG ou WebP.'
  }
  if (file.size > DELIVERY_IMAGE_MAX_BYTES) {
    return 'Arquivo muito grande. Máximo 5 MB.'
  }
  if (file.size <= 0) {
    return 'Arquivo vazio.'
  }
  return null
}

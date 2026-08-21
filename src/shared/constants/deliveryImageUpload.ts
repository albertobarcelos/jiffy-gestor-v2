export const DELIVERY_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export const DELIVERY_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

export const DELIVERY_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type DeliveryImageMimeType = (typeof DELIVERY_IMAGE_MIME_TYPES)[number]

export function detectDeliveryImageMimeFromBytes(bytes: Uint8Array): DeliveryImageMimeType | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }

  return null
}

export async function resolveDeliveryImageMimeTypeFromFile(
  file: File
): Promise<DeliveryImageMimeType | null> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  return detectDeliveryImageMimeFromBytes(head)
}

export async function validateDeliveryImageFile(file: File): Promise<string | null> {
  if (file.size <= 0) {
    return 'Arquivo vazio.'
  }

  if (file.size > DELIVERY_IMAGE_MAX_BYTES) {
    return 'Arquivo muito grande. Máximo 5 MB.'
  }

  const detectedMimeType = await resolveDeliveryImageMimeTypeFromFile(file)
  if (!detectedMimeType) {
    return `O arquivo "${file.name}" não é uma imagem JPEG, PNG ou WebP válida. Exporte ou salve a imagem novamente em um desses formatos.`
  }

  return null
}

export async function resolveDeliveryImageMimeTypeForUpload(
  file: File
): Promise<DeliveryImageMimeType | null> {
  return resolveDeliveryImageMimeTypeFromFile(file)
}

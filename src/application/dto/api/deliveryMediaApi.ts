export interface CreateImageUploadIntentRequestDTO {
  fileName: string
  mimeType: string
  sizeInBytes: number
}

export interface CreateImageUploadIntentResponseDTO {
  uploadIntentId: string
  imageId: string
  storageKey: string
  uploadUrl: string
  expiresAt: string
}

export interface ConfirmImageUploadIntentResponseDTO {
  uploadIntentId: string
  imageId: string
  status: 'CONFIRMED'
  imageStatus: 'ACTIVE'
  targetType: string
  targetId: string
  width: number
  height: number
}

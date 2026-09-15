import type {
  ConfirmImageUploadIntentResponseDTO,
  CreateImageUploadIntentResponseDTO,
} from '@/src/application/dto/api/deliveryMediaApi'
import {
  type DeliveryImageMimeType,
  resolveDeliveryImageMimeTypeForUpload,
  validateDeliveryImageFile,
} from '@/src/shared/constants/deliveryImageUpload'

export class DeliveryMediaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown
  ) {
    super(message)
    this.name = 'DeliveryMediaApiError'
  }
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (typeof record.error === 'string' && record.error.trim()) return record.error
    if (typeof record.message === 'string' && record.message.trim()) return record.message
  }
  return fallback
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = extractErrorMessage(data, `Erro ${response.status}`)
    throw new DeliveryMediaApiError(message, response.status, data)
  }
  return data as T
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

async function resolveMimeOrThrow(file: File): Promise<DeliveryImageMimeType> {
  const validationError = await validateDeliveryImageFile(file)
  if (validationError) {
    throw new DeliveryMediaApiError(validationError, 400)
  }

  const mimeType = await resolveDeliveryImageMimeTypeForUpload(file)
  if (!mimeType) {
    throw new DeliveryMediaApiError('Formato inválido. Use JPEG, PNG ou WebP.', 400)
  }

  return mimeType
}

export async function createGrupoComplementoUploadIntent(
  grupoComplementoId: string,
  file: File,
  token: string
): Promise<CreateImageUploadIntentResponseDTO> {
  return createUploadIntent(
    `/api/delivery/grupos-complemento/${encodeURIComponent(grupoComplementoId)}/upload-intent`,
    file,
    token,
    await resolveMimeOrThrow(file)
  )
}

export async function createGrupoProdutoUploadIntent(
  grupoProdutoId: string,
  file: File,
  token: string
): Promise<CreateImageUploadIntentResponseDTO> {
  return createUploadIntent(
    `/api/delivery/grupos-produto/${encodeURIComponent(grupoProdutoId)}/upload-intent`,
    file,
    token,
    await resolveMimeOrThrow(file)
  )
}

export async function createProdutoUploadIntent(
  produtoId: string,
  file: File,
  token: string
): Promise<CreateImageUploadIntentResponseDTO> {
  return createUploadIntent(
    `/api/delivery/produtos/${encodeURIComponent(produtoId)}/upload-intent`,
    file,
    token,
    await resolveMimeOrThrow(file)
  )
}

export async function createComplementoUploadIntent(
  complementoId: string,
  file: File,
  token: string
): Promise<CreateImageUploadIntentResponseDTO> {
  return createUploadIntent(
    `/api/delivery/complementos/${encodeURIComponent(complementoId)}/upload-intent`,
    file,
    token,
    await resolveMimeOrThrow(file)
  )
}

async function createUploadIntent(
  intentUrl: string,
  file: File,
  token: string,
  mimeType: DeliveryImageMimeType
): Promise<CreateImageUploadIntentResponseDTO> {
  const response = await fetch(intentUrl, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      fileName: file.name,
      mimeType,
      sizeInBytes: file.size,
    }),
  })

  return parseJsonResponse<CreateImageUploadIntentResponseDTO>(response)
}

export async function putFileToPresignedUrl(
  uploadUrl: string,
  file: File,
  token: string,
  mimeType: DeliveryImageMimeType
): Promise<void> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('uploadUrl', uploadUrl)
  formData.append('mimeType', mimeType)

  const response = await fetch('/api/media/presigned-put', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new DeliveryMediaApiError(
      extractErrorMessage(data, 'Falha ao enviar o arquivo para o storage.'),
      response.status,
      data
    )
  }
}

export async function confirmImageUploadIntent(
  uploadIntentId: string,
  token: string
): Promise<ConfirmImageUploadIntentResponseDTO> {
  const response = await fetch(
    `/api/media/image-upload-intents/${encodeURIComponent(uploadIntentId)}/confirm`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({}),
    }
  )

  return parseJsonResponse<ConfirmImageUploadIntentResponseDTO>(response)
}

export async function uploadGrupoComplementoImagem(
  grupoComplementoId: string,
  file: File,
  token: string
): Promise<ConfirmImageUploadIntentResponseDTO> {
  return uploadDeliveryImage(
    `/api/delivery/grupos-complemento/${encodeURIComponent(grupoComplementoId)}/upload-intent`,
    file,
    token
  )
}

export async function uploadGrupoProdutoImagem(
  grupoProdutoId: string,
  file: File,
  token: string
): Promise<ConfirmImageUploadIntentResponseDTO> {
  return uploadDeliveryImage(
    `/api/delivery/grupos-produto/${encodeURIComponent(grupoProdutoId)}/upload-intent`,
    file,
    token
  )
}

export async function uploadProdutoImagem(
  produtoId: string,
  file: File,
  token: string
): Promise<ConfirmImageUploadIntentResponseDTO> {
  return uploadDeliveryImage(
    `/api/delivery/produtos/${encodeURIComponent(produtoId)}/upload-intent`,
    file,
    token
  )
}

export async function uploadComplementoImagem(
  complementoId: string,
  file: File,
  token: string
): Promise<ConfirmImageUploadIntentResponseDTO> {
  return uploadDeliveryImage(
    `/api/delivery/complementos/${encodeURIComponent(complementoId)}/upload-intent`,
    file,
    token
  )
}

export async function uploadEmpresaDeliveryLogo(
  file: File,
  token: string
): Promise<ConfirmImageUploadIntentResponseDTO> {
  return uploadDeliveryImage('/api/delivery/empresas/me/logo/upload-intent', file, token)
}

export async function uploadEmpresaDeliveryBanner(
  file: File,
  token: string
): Promise<ConfirmImageUploadIntentResponseDTO> {
  return uploadDeliveryImage('/api/delivery/empresas/me/banner/upload-intent', file, token)
}

export async function fetchGrupoProdutoImagemUrl(
  grupoProdutoId: string,
  token: string
): Promise<string | null> {
  const map = await fetchGruposProdutoImagemUrlsBatch([grupoProdutoId], token)
  return map[grupoProdutoId.trim()] ?? null
}

let batchInFlight: Promise<Record<string, string | null>> | null = null
let batchInFlightKey = ''

export async function fetchGruposProdutoImagemUrlsBatch(
  grupoProdutoIds: string[],
  token: string
): Promise<Record<string, string | null>> {
  const ids = [...new Set(grupoProdutoIds.map(id => id.trim()).filter(Boolean))]
  if (ids.length === 0) return {}

  const cacheKey = ids.slice().sort().join('|')
  if (batchInFlight && batchInFlightKey === cacheKey) {
    return batchInFlight
  }

  batchInFlightKey = cacheKey
  batchInFlight = (async () => {
    const response = await fetch('/api/delivery/grupos-produto/imagem-urls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    })

    // Em erro de rede/rota, devolve vazio (não marca ids como null) para permitir retry.
    if (!response.ok) return {}

    const data = (await response.json().catch(() => ({}))) as {
      imagensPorGrupoId?: Record<string, string | null>
    }

    const resolved = data.imagensPorGrupoId ?? {}
    return Object.fromEntries(
      ids.map(id => {
        const url = resolved[id]
        return [id, typeof url === 'string' && url.trim() ? url.trim() : null] as const
      })
    )
  })().finally(() => {
    batchInFlight = null
    batchInFlightKey = ''
  })

  return batchInFlight
}

let gruposComplementoBatchInFlight: Promise<Record<string, string | null>> | null = null
let gruposComplementoBatchInFlightKey = ''

export async function fetchGruposComplementoImagemUrlsBatch(
  grupoComplementoIds: string[],
  token: string
): Promise<Record<string, string | null>> {
  const ids = [...new Set(grupoComplementoIds.map(id => id.trim()).filter(Boolean))]
  if (ids.length === 0) return {}

  const cacheKey = ids.slice().sort().join('|')
  if (gruposComplementoBatchInFlight && gruposComplementoBatchInFlightKey === cacheKey) {
    return gruposComplementoBatchInFlight
  }

  gruposComplementoBatchInFlightKey = cacheKey
  gruposComplementoBatchInFlight = (async () => {
    const response = await fetch('/api/delivery/grupos-complemento/imagem-urls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    })

    if (!response.ok) return Object.fromEntries(ids.map(id => [id, null]))

    const data = (await response.json().catch(() => ({}))) as {
      imagensPorGrupoComplementoId?: Record<string, string | null>
    }

    const resolved = data.imagensPorGrupoComplementoId ?? {}
    return Object.fromEntries(
      ids.map(id => {
        const url = resolved[id]
        return [id, typeof url === 'string' && url.trim() ? url.trim() : null] as const
      })
    )
  })().finally(() => {
    gruposComplementoBatchInFlight = null
    gruposComplementoBatchInFlightKey = ''
  })

  return gruposComplementoBatchInFlight
}

export async function fetchGrupoComplementoImagemUrl(
  grupoComplementoId: string,
  token: string
): Promise<string | null> {
  const map = await fetchGruposComplementoImagemUrlsBatch([grupoComplementoId], token)
  return map[grupoComplementoId.trim()] ?? null
}

let produtosBatchInFlight: Promise<Record<string, string | null>> | null = null
let produtosBatchInFlightKey = ''

export async function fetchProdutosImagemUrlsBatch(
  produtoIds: string[],
  token: string
): Promise<Record<string, string | null>> {
  const ids = [...new Set(produtoIds.map(id => id.trim()).filter(Boolean))]
  if (ids.length === 0) return {}

  const cacheKey = ids.slice().sort().join('|')
  if (produtosBatchInFlight && produtosBatchInFlightKey === cacheKey) {
    return produtosBatchInFlight
  }

  produtosBatchInFlightKey = cacheKey
  produtosBatchInFlight = (async () => {
    const response = await fetch('/api/delivery/produtos/imagem-urls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    })

    if (!response.ok) return Object.fromEntries(ids.map(id => [id, null]))

    const data = (await response.json().catch(() => ({}))) as {
      imagensPorProdutoId?: Record<string, string | null>
    }

    const resolved = data.imagensPorProdutoId ?? {}
    return Object.fromEntries(
      ids.map(id => {
        const url = resolved[id]
        return [id, typeof url === 'string' && url.trim() ? url.trim() : null] as const
      })
    )
  })().finally(() => {
    produtosBatchInFlight = null
    produtosBatchInFlightKey = ''
  })

  return produtosBatchInFlight
}

export async function fetchProdutoImagemUrl(
  produtoId: string,
  token: string
): Promise<string | null> {
  const map = await fetchProdutosImagemUrlsBatch([produtoId], token)
  return map[produtoId.trim()] ?? null
}

let complementosBatchInFlight: Promise<Record<string, string | null>> | null = null
let complementosBatchInFlightKey = ''

export async function fetchComplementosImagemUrlsBatch(
  complementoIds: string[],
  token: string
): Promise<Record<string, string | null>> {
  const ids = [...new Set(complementoIds.map(id => id.trim()).filter(Boolean))]
  if (ids.length === 0) return {}

  const cacheKey = ids.slice().sort().join('|')
  if (complementosBatchInFlight && complementosBatchInFlightKey === cacheKey) {
    return complementosBatchInFlight
  }

  complementosBatchInFlightKey = cacheKey
  complementosBatchInFlight = (async () => {
    const response = await fetch('/api/delivery/complementos/imagem-urls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    })

    if (!response.ok) return Object.fromEntries(ids.map(id => [id, null]))

    const data = (await response.json().catch(() => ({}))) as {
      imagensPorComplementoId?: Record<string, string | null>
    }

    const resolved = data.imagensPorComplementoId ?? {}
    return Object.fromEntries(
      ids.map(id => {
        const url = resolved[id]
        return [id, typeof url === 'string' && url.trim() ? url.trim() : null] as const
      })
    )
  })().finally(() => {
    complementosBatchInFlight = null
    complementosBatchInFlightKey = ''
  })

  return complementosBatchInFlight
}

export async function fetchComplementoImagemUrl(
  complementoId: string,
  token: string
): Promise<string | null> {
  const map = await fetchComplementosImagemUrlsBatch([complementoId], token)
  return map[complementoId.trim()] ?? null
}

async function uploadDeliveryImage(
  intentUrl: string,
  file: File,
  token: string
): Promise<ConfirmImageUploadIntentResponseDTO> {
  const mimeType = await resolveMimeOrThrow(file)
  const intent = await createUploadIntent(intentUrl, file, token, mimeType)
  await putFileToPresignedUrl(intent.uploadUrl, file, token, mimeType)
  return confirmImageUploadIntent(intent.uploadIntentId, token)
}

export function mensagemLegivelDeliveryMediaError(error: unknown): string {
  if (error instanceof DeliveryMediaApiError) {
    if (error.status === 404) {
      return 'Item não encontrado no cardápio delivery. Configure o cardápio digital em Configurações.'
    }
    if (/INVALID_MIME_TYPE/i.test(error.message)) {
      return 'O conteúdo da imagem não corresponde ao formato informado. Salve novamente como JPEG, PNG ou WebP.'
    }
    return error.message
  }
  if (error instanceof Error && error.message) {
    if (/failed to fetch/i.test(error.message)) {
      return 'Não foi possível concluir o upload. Verifique sua conexão e tente novamente.'
    }
    return error.message
  }
  return 'Não foi possível enviar a imagem.'
}

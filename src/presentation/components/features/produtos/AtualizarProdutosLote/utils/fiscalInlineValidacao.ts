import type { CestValidationResult, NcmValidationResult } from '../types'

const FETCH_TIMEOUT_MS = 5000

async function fetchComTimeout(
  url: string,
  token: string,
  signal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)

  try {
    return await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener('abort', onAbort)
  }
}

/** Valida NCM via API fiscal (edição inline). */
export async function validarNcmFiscalInline(
  token: string,
  ncm: string,
  signal?: AbortSignal
): Promise<NcmValidationResult | null> {
  try {
    const response = await fetchComTimeout(
      `/api/v1/fiscal/configuracoes/ncms/validar/${ncm}`,
      token,
      signal
    )
    if (!response.ok) return null
    return (await response.json()) as NcmValidationResult
  } catch {
    return null
  }
}

/** Valida CEST via API fiscal (usa NCM já cadastrado no produto quando disponível). */
export async function validarCestFiscalInline(
  token: string,
  cest: string,
  ncmProduto: string,
  signal?: AbortSignal
): Promise<CestValidationResult | null> {
  try {
    const ncmT = ncmProduto.replace(/\D/g, '').slice(0, 8)
    const hasNcm = ncmT.length === 8
    const url = hasNcm
      ? `/api/v1/fiscal/configuracoes/cests/validar/${cest}/ncm/${ncmT}`
      : `/api/v1/fiscal/configuracoes/cests/validar/${cest}`

    const response = await fetchComTimeout(url, token, signal)
    if (!response.ok) return null

    const result = await response.json()

    if (hasNcm) {
      return {
        codigo: result.cestCodigo || cest,
        valido: result.compativel ?? false,
        descricao: result.descricaoCest,
        mensagem:
          result.mensagem ||
          (result.compativel
            ? 'CEST compatível com o NCM informado'
            : 'CEST não é compatível com o NCM informado'),
      }
    }

    return result as CestValidationResult
  } catch {
    return null
  }
}

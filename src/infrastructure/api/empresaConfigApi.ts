import {
  gestorConfigBlob,
  gestorConfigDelete,
  gestorConfigForm,
  gestorConfigJson,
  type GestorConfigResult,
} from '@/src/infrastructure/api/gestorConfigRequest'

export function getEmpresaMe(token: string): Promise<GestorConfigResult<Record<string, unknown>>> {
  return gestorConfigJson('/api/empresas/me', token)
}

export function patchEmpresa(
  token: string,
  empresaId: string,
  body: Record<string, unknown>
): Promise<GestorConfigResult<Record<string, unknown>>> {
  return gestorConfigJson(`/api/empresas/${encodeURIComponent(empresaId)}`, token, {
    method: 'PATCH',
    json: body,
  })
}

export function getLogoImpressao(token: string): Promise<Blob | null> {
  return gestorConfigBlob('/api/empresas/me/logo-impressao', token)
}

export function postLogoImpressao(
  token: string,
  file: File
): Promise<GestorConfigResult<unknown>> {
  const body = new FormData()
  body.append('file', file)
  return gestorConfigForm('/api/empresas/me/logo-impressao', token, body)
}

export function deleteLogoImpressao(token: string): Promise<GestorConfigResult<unknown>> {
  return gestorConfigDelete('/api/empresas/me/logo-impressao', token)
}

export type ValidarCidadeIbgeData = {
  valido?: boolean
  codigoCidadeIbge?: string | null
}

export function validarCidadeIbge(
  cidade: string,
  uf: string
): Promise<GestorConfigResult<ValidarCidadeIbgeData>> {
  const qs = new URLSearchParams({ cidade, uf })
  return gestorConfigJson(`/api/v1/ibge/validar-cidade?${qs.toString()}`)
}

export async function consultarCodigoCidadeIbge(
  nomeCidade: string,
  uf: string
): Promise<string | null> {
  const res = await validarCidadeIbge(nomeCidade, uf)
  if (!res.ok || !res.data.valido || !res.data.codigoCidadeIbge) {
    return null
  }
  return String(res.data.codigoCidadeIbge)
}

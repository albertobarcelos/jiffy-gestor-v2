import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import {
  lerCamposEnderecoEmpresa,
  lerEnderecoLocalizacaoDoPayloadEmpresa,
  montarPatchEnderecoGeolocalizacao,
  type EnderecoEmpresaGeocodeInput,
} from '@/src/shared/utils/geolocalizacaoEmpresa'

export const CAMPOS_ENDERECO_PIN = [
  'cep',
  'rua',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'estado',
  'codigoCidadeIbge',
] as const

export type EmpresaEnderecoGeo = {
  empresaId: string
  enderecoLocalizacao: GeoJsonPoint | null
  providerEnderecoId: string | null
  endereco: EnderecoEmpresaGeocodeInput
}

function payloadEmpresa(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {}
}

function enderecoDoPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return payload.endereco && typeof payload.endereco === 'object' && !Array.isArray(payload.endereco)
    ? (payload.endereco as Record<string, unknown>)
    : {}
}

export function lerEmpresaEnderecoGeoDoPayload(data: unknown): EmpresaEnderecoGeo {
  const payload = payloadEmpresa(data)
  const endereco = enderecoDoPayload(payload)
  const loc = lerEnderecoLocalizacaoDoPayloadEmpresa(endereco)
  return {
    empresaId: payload.id != null ? String(payload.id) : '',
    enderecoLocalizacao: loc.enderecoLocalizacao,
    providerEnderecoId: loc.providerEnderecoId,
    endereco: lerCamposEnderecoEmpresa(endereco),
  }
}

/**
 * PATCH do pin: preserva os campos textuais do GET e só troca geo.
 */
export function montarPayloadPatchPinEmpresa(
  detalhe: unknown,
  point: GeoJsonPoint,
  providerEnderecoId?: string | null
): { empresaId: string; endereco: Record<string, unknown> } {
  const geo = lerEmpresaEnderecoGeoDoPayload(detalhe)
  if (!geo.empresaId) {
    throw new Error('Não foi possível identificar a empresa.')
  }

  const atual = enderecoDoPayload(payloadEmpresa(detalhe))
  const endereco: Record<string, unknown> = {}
  for (const campo of CAMPOS_ENDERECO_PIN) {
    const valor = atual[campo]
    if (valor != null && valor !== '') endereco[campo] = valor
  }
  Object.assign(endereco, montarPatchEnderecoGeolocalizacao(point, providerEnderecoId) ?? {})
  return { empresaId: geo.empresaId, endereco }
}

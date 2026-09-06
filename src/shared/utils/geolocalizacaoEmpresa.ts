import { parseGeoJsonPoint, type GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import {
  erroGeocodeForwardParaCliente,
  fetchGeocodeForward,
} from '@/src/shared/utils/googleMapsFalha'

export type EnderecoEmpresaGeocodeInput = {
  rua: string
  numero: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  complemento?: string
}

export type GeocodeEmpresaResult = {
  enderecoLocalizacao: GeoJsonPoint
  providerEnderecoId: string | null
  enderecoFormatado: string | null
}

export function normalizarCepEndereco(cep: string | undefined): string {
  return (cep ?? '').replace(/\D/g, '')
}

export function montarEnderecoParaGeocode(input: EnderecoEmpresaGeocodeInput): string {
  const cepDigits = normalizarCepEndereco(input.cep)
  const cepFormatado =
    cepDigits.length === 8 ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}` : input.cep?.trim()

  const partes = [
    [input.rua?.trim(), input.numero?.trim()].filter(Boolean).join(', '),
    input.complemento?.trim(),
    input.bairro?.trim(),
    [input.cidade?.trim(), input.estado?.trim()?.toUpperCase()].filter(Boolean).join(' - '),
    cepFormatado,
    'Brasil',
  ].filter((p): p is string => Boolean(p && p.trim()))

  return partes.join(', ')
}

export function montarParametrosGeocodeEmpresa(input: EnderecoEmpresaGeocodeInput): URLSearchParams {
  const params = new URLSearchParams()
  params.set('rua', input.rua.trim())
  params.set('numero', input.numero.trim())
  if (input.bairro?.trim()) params.set('bairro', input.bairro.trim())
  if (input.cidade?.trim()) params.set('cidade', input.cidade.trim())
  if (input.estado?.trim()) params.set('estado', input.estado.trim().toUpperCase())
  const cep = normalizarCepEndereco(input.cep)
  if (cep.length === 8) params.set('cep', cep)
  if (input.complemento?.trim()) params.set('complemento', input.complemento.trim())
  params.set('address', montarEnderecoParaGeocode(input))
  return params
}

export function enderecoEmpresaGeocodeMinimo(input: EnderecoEmpresaGeocodeInput): boolean {
  return Boolean(input.rua?.trim() && input.numero?.trim() && input.cidade?.trim() && input.estado?.trim())
}

export function lerEnderecoLocalizacaoDoPayloadEmpresa(
  enderecoRaw: unknown
): { enderecoLocalizacao: GeoJsonPoint | null; providerEnderecoId: string | null } {
  if (!enderecoRaw || typeof enderecoRaw !== 'object' || Array.isArray(enderecoRaw)) {
    return { enderecoLocalizacao: null, providerEnderecoId: null }
  }
  const endereco = enderecoRaw as Record<string, unknown>
  const enderecoLocalizacao = parseGeoJsonPoint(endereco.enderecoLocalizacao)
  const providerEnderecoId =
    typeof endereco.providerEnderecoId === 'string' && endereco.providerEnderecoId.trim()
      ? endereco.providerEnderecoId.trim()
      : null
  return { enderecoLocalizacao, providerEnderecoId }
}

function textoCampoEndereco(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

/** Campos textuais do endereço da empresa para geocode (mesmo contrato da aba Empresa). */
export function lerCamposEnderecoEmpresa(enderecoRaw: unknown): EnderecoEmpresaGeocodeInput {
  if (!enderecoRaw || typeof enderecoRaw !== 'object' || Array.isArray(enderecoRaw)) {
    return { rua: '', numero: '' }
  }
  const endereco = enderecoRaw as Record<string, unknown>
  return {
    rua: textoCampoEndereco(endereco.rua),
    numero: textoCampoEndereco(endereco.numero),
    bairro: textoCampoEndereco(endereco.bairro) || undefined,
    cidade: textoCampoEndereco(endereco.cidade) || undefined,
    estado: textoCampoEndereco(endereco.estado) || undefined,
    cep: textoCampoEndereco(endereco.cep) || undefined,
    complemento: textoCampoEndereco(endereco.complemento) || undefined,
  }
}

export async function geocodificarEnderecoEmpresaViaGoogle(
  input: EnderecoEmpresaGeocodeInput
): Promise<GeocodeEmpresaResult> {
  if (!enderecoEmpresaGeocodeMinimo(input)) {
    throw new Error('Preencha rua, número, cidade e estado antes de buscar a localização.')
  }

  const params = montarParametrosGeocodeEmpresa(input)
  const { ok, status, payload } = await fetchGeocodeForward(params)
  if (!ok) {
    throw erroGeocodeForwardParaCliente(payload, status)
  }

  const corpo = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const point = parseGeoJsonPoint(corpo.enderecoLocalizacao)
  if (!point) {
    throw new Error('Resposta de geocodificação inválida')
  }

  return {
    enderecoLocalizacao: point,
    providerEnderecoId:
      typeof corpo.providerEnderecoId === 'string' ? corpo.providerEnderecoId : null,
    enderecoFormatado:
      typeof corpo.enderecoFormatado === 'string' ? corpo.enderecoFormatado : null,
  }
}

export function montarPatchEnderecoGeolocalizacao(
  point: GeoJsonPoint | null,
  providerEnderecoId?: string | null
): Record<string, unknown> | null {
  if (!point) return null
  return {
    enderecoLocalizacao: point,
    geocodingProvider: 'GOOGLE',
    ...(providerEnderecoId ? { providerEnderecoId } : {}),
  }
}

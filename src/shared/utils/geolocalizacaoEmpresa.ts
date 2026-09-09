import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { geoJsonPointFromLatLng, parseGeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { backendForwardGeocode } from '@/src/shared/utils/geolocalizacaoBackendApi'
import { mensagemAmigavelErroGeolocalizacao } from '@/src/shared/utils/geolocalizacaoEnderecoShared'

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

export async function geocodificarEnderecoEmpresaViaGoogle(
  input: EnderecoEmpresaGeocodeInput
): Promise<GeocodeEmpresaResult> {
  if (!enderecoEmpresaGeocodeMinimo(input)) {
    throw new Error('Preencha rua, número, cidade e estado antes de buscar a localização.')
  }

  try {
    const lookup = await backendForwardGeocode({
      rua: input.rua,
      numero: input.numero,
      bairro: input.bairro,
      cidade: input.cidade,
      estado: input.estado,
      cep: input.cep,
    })
    return {
      enderecoLocalizacao: lookup.enderecoLocalizacao,
      providerEnderecoId: lookup.providerEnderecoId,
      enderecoFormatado: lookup.enderecoFormatado,
    }
  } catch (error) {
    throw new Error(mensagemAmigavelErroGeolocalizacao(error, 'geocode'))
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

/** Converte lat/lng do mapa para GeoJSON Point. */
export function geoPointFromMapLatLng(lat: number, lng: number): GeoJsonPoint {
  return geoJsonPointFromLatLng(lat, lng)
}

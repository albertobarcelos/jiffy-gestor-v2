import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { geoJsonPointFromLatLng } from '@/src/shared/types/geoJsonPoint'
import { normalizarDigitosCep } from '@/src/shared/utils/consultaCep'

/**
 * Cliente HTTP de geolocalização (infrastructure).
 * Shared deve manter apenas tipos/helpers puros; I/O fica aqui.
 */
/** Lookup público do backend `/api/v1/geolocalizacao/*` (details/forward/reverso). */
type BackendLookupResponse = {
  placeId?: unknown
  enderecoFormatado?: unknown
  localizacao?: { latitude?: unknown; longitude?: unknown }
  endereco?: {
    rua?: unknown
    numero?: unknown
    bairro?: unknown
    cidade?: unknown
    estado?: unknown
    cep?: unknown
  }
}

type BackendSuggestion = {
  placeId?: unknown
  text?: unknown
  mainText?: unknown
  secondaryText?: unknown
}

/** Shape estável para a UI do FE (mesmo contrato do antigo BFF Next). */
export type GeolocalizacaoLookupFe = {
  providerEnderecoId: string
  enderecoLocalizacao: GeoJsonPoint
  enderecoFormatado: string | null
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  cep: string
}

export type PlacesSuggestionFe = {
  placeId: string
  descricao: string
  descricaoPrincipal: string
  descricaoSecundaria: string
}

function baseUrlGeolocalizacaoBackend(): string {
  const base = (process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL ?? '').replace(/\/$/, '')
  if (!base) {
    throw new Error('NEXT_PUBLIC_EXTERNAL_API_BASE_URL não está configurada')
  }
  return `${base}/api/v1/geolocalizacao`
}

export function extrairMensagemErroGeolocalizacaoBackend(
  payload: unknown,
  fallback: string
): string {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return fallback
  }
  const o = payload as Record<string, unknown>
  if (typeof o.message === 'string' && o.message.trim()) return o.message.trim()
  if (typeof o.error === 'string' && o.error.trim()) return o.error.trim()
  return fallback
}

function asNullableText(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

function mapLookupBackendToFe(payload: BackendLookupResponse): GeolocalizacaoLookupFe {
  const lat = Number(payload.localizacao?.latitude)
  const lng = Number(payload.localizacao?.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Resposta de geolocalização sem coordenadas válidas')
  }

  const providerEnderecoId = asNullableText(payload.placeId)
  if (!providerEnderecoId) {
    throw new Error('Resposta de geolocalização sem placeId')
  }

  const endereco = payload.endereco ?? {}
  const cepDigits = normalizarDigitosCep(asNullableText(endereco.cep))

  return {
    providerEnderecoId,
    enderecoLocalizacao: geoJsonPointFromLatLng(lat, lng),
    enderecoFormatado:
      typeof payload.enderecoFormatado === 'string'
        ? payload.enderecoFormatado.trim() || null
        : null,
    rua: asNullableText(endereco.rua),
    numero: asNullableText(endereco.numero),
    bairro: asNullableText(endereco.bairro),
    cidade: asNullableText(endereco.cidade),
    estado: asNullableText(endereco.estado).toUpperCase().slice(0, 2),
    cep: cepDigits.slice(0, 8),
  }
}

async function fetchGeolocalizacaoBackend(
  path: string,
  params: URLSearchParams,
  signal?: AbortSignal
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; data: unknown }> {
  const url = `${baseUrlGeolocalizacaoBackend()}${path}?${params.toString()}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return { ok: false, status: response.status, data }
  }
  return { ok: true, data }
}

/** Query params aceitos pelo forward do backend (ignora address/complemento do BFF antigo). */
export function montarParamsForwardBackend(input: {
  rua?: string
  numero?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
}): URLSearchParams {
  const params = new URLSearchParams()
  if (input.rua?.trim()) params.set('rua', input.rua.trim())
  if (input.numero?.trim()) params.set('numero', input.numero.trim())
  if (input.bairro?.trim()) params.set('bairro', input.bairro.trim())
  if (input.cidade?.trim()) params.set('cidade', input.cidade.trim())
  if (input.estado?.trim()) params.set('estado', input.estado.trim().toUpperCase().slice(0, 2))
  const cep = normalizarDigitosCep(input.cep ?? '')
  if (cep.length === 8) params.set('cep', cep)
  return params
}

export async function backendPlacesAutocomplete(input: {
  input: string
  sessionToken?: string
  lat?: number
  lng?: number
  radiusMeters?: number
  signal?: AbortSignal
}): Promise<PlacesSuggestionFe[]> {
  const params = new URLSearchParams({ input: input.input.trim() })
  if (input.sessionToken?.trim()) params.set('sessionToken', input.sessionToken.trim())
  if (
    input.lat != null &&
    input.lng != null &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng)
  ) {
    params.set('lat', String(input.lat))
    params.set('lng', String(input.lng))
    if (input.radiusMeters != null && Number.isFinite(input.radiusMeters)) {
      params.set('radius', String(Math.min(50000, Math.max(1, Math.round(input.radiusMeters)))))
    }
  }

  const result = await fetchGeolocalizacaoBackend('/places/autocomplete', params, input.signal)
  if (!result.ok) {
    throw new Error(
      extrairMensagemErroGeolocalizacaoBackend(
        result.data,
        'Não foi possível buscar sugestões de endereço'
      )
    )
  }

  const suggestions = Array.isArray((result.data as { suggestions?: unknown }).suggestions)
    ? ((result.data as { suggestions: BackendSuggestion[] }).suggestions)
    : []

  return suggestions
    .map(s => ({
      placeId: asNullableText(s.placeId),
      descricao: asNullableText(s.text),
      descricaoPrincipal: asNullableText(s.mainText),
      descricaoSecundaria: asNullableText(s.secondaryText),
    }))
    .filter(s => Boolean(s.placeId && s.descricao))
}

export async function backendPlaceDetails(input: {
  placeId: string
  sessionToken?: string
  signal?: AbortSignal
}): Promise<GeolocalizacaoLookupFe> {
  const params = new URLSearchParams({ placeId: input.placeId.trim() })
  if (input.sessionToken?.trim()) params.set('sessionToken', input.sessionToken.trim())

  const result = await fetchGeolocalizacaoBackend('/places/details', params, input.signal)
  if (!result.ok) {
    throw new Error(
      extrairMensagemErroGeolocalizacaoBackend(
        result.data,
        'Não foi possível obter detalhes do endereço'
      )
    )
  }

  return mapLookupBackendToFe(result.data as BackendLookupResponse)
}

export async function backendForwardGeocode(
  input: {
    rua?: string
    numero?: string
    bairro?: string
    cidade?: string
    estado?: string
    cep?: string
  },
  signal?: AbortSignal
): Promise<GeolocalizacaoLookupFe> {
  const params = montarParamsForwardBackend(input)
  const result = await fetchGeolocalizacaoBackend('/forward', params, signal)
  if (!result.ok) {
    throw new Error(
      extrairMensagemErroGeolocalizacaoBackend(
        result.data,
        'Não foi possível localizar o endereço no Google Maps'
      )
    )
  }
  return mapLookupBackendToFe(result.data as BackendLookupResponse)
}

export async function backendReverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<GeolocalizacaoLookupFe> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  })
  const result = await fetchGeolocalizacaoBackend('/reverso', params, signal)
  if (!result.ok) {
    throw new Error(
      extrairMensagemErroGeolocalizacaoBackend(
        result.data,
        'Não foi possível obter o endereço pela localização'
      )
    )
  }
  return mapLookupBackendToFe(result.data as BackendLookupResponse)
}

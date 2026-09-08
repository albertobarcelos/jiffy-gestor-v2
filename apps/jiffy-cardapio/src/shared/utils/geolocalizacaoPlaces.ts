import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import type { EnderecoGeocodeInput } from '@/src/shared/utils/geolocalizacaoEnderecoShared'
import { formatarCepMascara, normalizarDigitosCep } from '@/src/shared/utils/consultaCep'

export type PlacesAutocompletePrediction = {
  placeId: string
  descricao: string
  descricaoPrincipal: string
  descricaoSecundaria: string
}

export type PlacesAutocompleteResponse = {
  predictions: PlacesAutocompletePrediction[]
}

export type PlaceDetailsResult = {
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

export type PlacesBias = {
  lat: number
  lng: number
  radiusMeters?: number
}

/** Token de sessão Places (agrupa autocomplete + details na cobrança). */
export function criarSessionTokenPlaces(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function placeDetailsParaEnderecoGeocode(details: PlaceDetailsResult): EnderecoGeocodeInput {
  const cepDigits = normalizarDigitosCep(details.cep)
  return {
    rua: details.rua,
    numero: details.numero,
    bairro: details.bairro,
    cidade: details.cidade,
    estado: details.estado,
    cep: cepDigits.length === 8 ? formatarCepMascara(cepDigits) : details.cep,
  }
}

export async function buscarPlacesAutocomplete(input: {
  input: string
  sessionToken: string
  bias?: PlacesBias | null
  signal?: AbortSignal
}): Promise<PlacesAutocompletePrediction[]> {
  const termo = input.input.trim()
  if (termo.length < 3) return []

  const params = new URLSearchParams({
    input: termo,
    sessionToken: input.sessionToken,
  })
  if (input.bias && Number.isFinite(input.bias.lat) && Number.isFinite(input.bias.lng)) {
    params.set('lat', String(input.bias.lat))
    params.set('lng', String(input.bias.lng))
    if (input.bias.radiusMeters != null) {
      params.set('radius', String(input.bias.radiusMeters))
    }
  }

  const response = await fetch(`/api/geolocalizacao/places/autocomplete?${params}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: input.signal,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg =
      typeof payload.error === 'string' ? payload.error : 'Não foi possível buscar sugestões de endereço'
    throw new Error(msg)
  }

  const predictions = Array.isArray(payload.predictions) ? payload.predictions : []
  return predictions
    .map((p: Record<string, unknown>) => ({
      placeId: String(p.placeId ?? '').trim(),
      descricao: String(p.descricao ?? '').trim(),
      descricaoPrincipal: String(p.descricaoPrincipal ?? '').trim(),
      descricaoSecundaria: String(p.descricaoSecundaria ?? '').trim(),
    }))
    .filter((p: PlacesAutocompletePrediction) => Boolean(p.placeId && p.descricao))
}

export async function buscarPlaceDetails(input: {
  placeId: string
  sessionToken: string
  signal?: AbortSignal
}): Promise<PlaceDetailsResult> {
  const placeId = input.placeId.trim()
  if (!placeId) {
    throw new Error('placeId é obrigatório')
  }

  const params = new URLSearchParams({
    placeId,
    sessionToken: input.sessionToken,
  })

  const response = await fetch(`/api/geolocalizacao/places/details?${params}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: input.signal,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg =
      typeof payload.error === 'string' ? payload.error : 'Não foi possível obter detalhes do endereço'
    throw new Error(msg)
  }

  const coords = payload.enderecoLocalizacao?.coordinates
  if (
    !payload.enderecoLocalizacao ||
    payload.enderecoLocalizacao.type !== 'Point' ||
    !Array.isArray(coords) ||
    coords.length !== 2
  ) {
    throw new Error('Resposta de Place Details sem coordenadas válidas')
  }

  const providerEnderecoId = String(payload.providerEnderecoId ?? placeId).trim()
  if (!providerEnderecoId) {
    throw new Error('Place Details sem place_id')
  }

  return {
    providerEnderecoId,
    enderecoLocalizacao: {
      type: 'Point',
      coordinates: [Number(coords[0]), Number(coords[1])],
    },
    enderecoFormatado:
      typeof payload.enderecoFormatado === 'string' ? payload.enderecoFormatado.trim() || null : null,
    rua: String(payload.rua ?? '').trim(),
    numero: String(payload.numero ?? '').trim(),
    bairro: String(payload.bairro ?? '').trim(),
    cidade: String(payload.cidade ?? '').trim(),
    estado: String(payload.estado ?? '')
      .trim()
      .toUpperCase()
      .slice(0, 2),
    cep: normalizarDigitosCep(String(payload.cep ?? '')).slice(0, 8),
  }
}

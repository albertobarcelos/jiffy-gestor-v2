import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import type { EnderecoGeocodeInput } from '@/src/shared/utils/geolocalizacaoEnderecoShared'
import { mensagemAmigavelErroGeolocalizacao } from '@/src/shared/utils/geolocalizacaoEnderecoShared'
import {
  backendPlaceDetails,
  backendPlacesAutocomplete,
} from '@/src/shared/utils/geolocalizacaoBackendApi'
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

  try {
    return await backendPlacesAutocomplete({
      input: termo,
      sessionToken: input.sessionToken,
      lat: input.bias?.lat,
      lng: input.bias?.lng,
      radiusMeters: input.bias?.radiusMeters,
      signal: input.signal,
    })
  } catch (error) {
    throw new Error(mensagemAmigavelErroGeolocalizacao(error, 'places'))
  }
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

  try {
    const lookup = await backendPlaceDetails({
      placeId,
      sessionToken: input.sessionToken,
      signal: input.signal,
    })
    return {
      providerEnderecoId: lookup.providerEnderecoId,
      enderecoLocalizacao: lookup.enderecoLocalizacao,
      enderecoFormatado: lookup.enderecoFormatado,
      rua: lookup.rua,
      numero: lookup.numero,
      bairro: lookup.bairro,
      cidade: lookup.cidade,
      estado: lookup.estado,
      cep: lookup.cep,
    }
  } catch (error) {
    throw new Error(mensagemAmigavelErroGeolocalizacao(error, 'details'))
  }
}

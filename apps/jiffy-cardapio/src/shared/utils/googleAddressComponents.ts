import { geoJsonPointFromLatLng, type GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { normalizarCepEndereco } from '@/src/shared/utils/geolocalizacaoEnderecoShared'

export type GoogleAddressComponent = {
  /** Geocoding / Places Legacy */
  long_name?: string
  short_name?: string
  /** Places API (New) */
  longText?: string
  shortText?: string
  types?: string[]
}

export type EnderecoParsedFromGoogle = {
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  cep: string
}

function componentePorTipo(
  components: GoogleAddressComponent[],
  type: string
): GoogleAddressComponent | undefined {
  return components.find(c => c.types?.includes(type))
}

function textoComponente(
  components: GoogleAddressComponent[],
  type: string,
  preferShort = false
): string {
  const c = componentePorTipo(components, type)
  if (!c) return ''
  if (preferShort) {
    const value = c.shortText ?? c.short_name ?? c.longText ?? c.long_name
    return (value ?? '').trim()
  }
  const value = c.longText ?? c.long_name ?? c.shortText ?? c.short_name
  return (value ?? '').trim()
}

/**
 * Converte address_components do Google (Geocoding / Places Legacy / Places New) em campos BR.
 */
export function parseGoogleAddressComponents(
  components: GoogleAddressComponent[] | undefined | null
): EnderecoParsedFromGoogle {
  const list = components ?? []

  const route = textoComponente(list, 'route')
  const streetNumber = textoComponente(list, 'street_number')
  const subpremise = textoComponente(list, 'subpremise')

  const bairro =
    textoComponente(list, 'sublocality_level_1') ||
    textoComponente(list, 'sublocality') ||
    textoComponente(list, 'neighborhood') ||
    textoComponente(list, 'administrative_area_level_3')

  const cidade =
    textoComponente(list, 'locality') ||
    textoComponente(list, 'administrative_area_level_2') ||
    textoComponente(list, 'postal_town')

  const estado = textoComponente(list, 'administrative_area_level_1', true).toUpperCase().slice(0, 2)

  const postal = textoComponente(list, 'postal_code')
  const cep = normalizarCepEndereco(postal).slice(0, 8)

  const numero = streetNumber || subpremise

  return {
    rua: route,
    numero,
    bairro,
    cidade,
    estado,
    cep,
  }
}

export function geoJsonPointFromGoogleLocation(location: {
  lat?: number
  lng?: number
} | null | undefined): GeoJsonPoint | null {
  const lat = location?.lat
  const lng = location?.lng
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null
  }
  return geoJsonPointFromLatLng(lat, lng)
}

/** Location da Places API (New): `{ latitude, longitude }`. */
export function geoJsonPointFromPlacesLocation(location: {
  latitude?: number
  longitude?: number
} | null | undefined): GeoJsonPoint | null {
  const lat = location?.latitude
  const lng = location?.longitude
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null
  }
  return geoJsonPointFromLatLng(lat, lng)
}

export function lerGoogleMapsApiKeyServer(): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim()
  return key || null
}

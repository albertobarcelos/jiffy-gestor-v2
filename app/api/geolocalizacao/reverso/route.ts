import { NextRequest, NextResponse } from 'next/server'
import {
  lerGoogleMapsApiKeyServer,
  parseGoogleAddressComponents,
} from '@/src/shared/utils/googleAddressComponents'

type GoogleGeocodeResponse = {
  status?: string
  error_message?: string
  results?: Array<{
    place_id?: string
    formatted_address?: string
    address_components?: Array<{
      long_name?: string
      short_name?: string
      types?: string[]
    }>
  }>
}

type NominatimAddress = {
  road?: string
  pedestrian?: string
  residential?: string
  house_number?: string
  suburb?: string
  neighbourhood?: string
  city_district?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
  state?: string
  postcode?: string
  'ISO3166-2-lvl4'?: string
}

type NominatimReverseResponse = {
  address?: NominatimAddress
  error?: string
}

type EnderecoReversoPayload = {
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  provider?: 'GOOGLE' | 'NOMINATIM'
  providerEnderecoId?: string | null
  enderecoFormatado?: string | null
}

const GOOGLE_NOT_FOUND = new Set(['ZERO_RESULTS', 'NOT_FOUND'])

function ufDeNominatim(address: NominatimAddress): string {
  const iso = address['ISO3166-2-lvl4']
  if (iso?.includes('-')) {
    const part = iso.split('-')[1]
    if (part && /^[A-Z]{2}$/i.test(part)) return part.toUpperCase()
  }
  const estado = (address.state ?? '').trim().toUpperCase()
  if (/^[A-Z]{2}$/.test(estado)) return estado
  return ''
}

function payloadDeResultadoGoogle(
  result: NonNullable<GoogleGeocodeResponse['results']>[number]
): EnderecoReversoPayload {
  const parsed = parseGoogleAddressComponents(result.address_components)
  return {
    ...parsed,
    provider: 'GOOGLE',
    providerEnderecoId: result.place_id?.trim() || null,
    enderecoFormatado: result.formatted_address?.trim() || null,
  }
}

async function consultarGoogleReverse(
  apiKey: string,
  lat: number,
  lon: number,
  comResultType: boolean
): Promise<GoogleGeocodeResponse> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('latlng', `${lat},${lon}`)
  url.searchParams.set('language', 'pt-BR')
  url.searchParams.set('region', 'br')
  if (comResultType) {
    url.searchParams.set('result_type', 'street_address|route|premise')
  }
  url.searchParams.set('key', apiKey)

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    return { status: 'HTTP_ERROR' }
  }

  return (await response.json()) as GoogleGeocodeResponse
}

async function reverseGoogle(
  apiKey: string,
  lat: number,
  lon: number
): Promise<EnderecoReversoPayload | null> {
  const restrito = await consultarGoogleReverse(apiKey, lat, lon, true)
  if (restrito.status === 'OK' && restrito.results?.length) {
    return payloadDeResultadoGoogle(restrito.results[0])
  }

  if (
    restrito.status === 'OK' ||
    GOOGLE_NOT_FOUND.has(restrito.status ?? '') ||
    restrito.status === 'HTTP_ERROR' ||
    !restrito.status
  ) {
    const flex = await consultarGoogleReverse(apiKey, lat, lon, false)
    if (flex.status === 'OK' && flex.results?.length) {
      return payloadDeResultadoGoogle(flex.results[0])
    }
  }

  return null
}

async function reverseNominatim(
  lat: number,
  lon: number
): Promise<EnderecoReversoPayload | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'json')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('zoom', '18')

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'pt-BR',
      'User-Agent': 'JiffyGestorDelivery/1.0 (checkout-publico)',
    },
    next: { revalidate: 0 },
  })

  if (!response.ok) return null

  const data = (await response.json()) as NominatimReverseResponse
  if (data.error || !data.address) return null

  const a = data.address
  return {
    rua: a.road || a.pedestrian || a.residential || '',
    numero: a.house_number ?? '',
    bairro: a.suburb || a.neighbourhood || a.city_district || '',
    cidade: a.city || a.town || a.village || a.municipality || '',
    estado: ufDeNominatim(a),
    cep: (a.postcode ?? '').replace(/\D/g, '').slice(0, 8),
    provider: 'NOMINATIM',
    providerEnderecoId: null,
    enderecoFormatado: null,
  }
}

/**
 * Reverse geocode (lat/lon → endereço).
 * Preferência: Google Geocoding; fallback: Nominatim (OpenStreetMap).
 */
export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get('lat')
  const lon = request.nextUrl.searchParams.get('lon')

  const latNum = lat != null ? Number(lat) : NaN
  const lonNum = lon != null ? Number(lon) : NaN

  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return NextResponse.json({ error: 'Informe lat e lon válidos' }, { status: 400 })
  }

  if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return NextResponse.json({ error: 'Coordenadas fora do intervalo válido' }, { status: 400 })
  }

  try {
    const apiKey = lerGoogleMapsApiKeyServer()
    if (apiKey) {
      try {
        const google = await reverseGoogle(apiKey, latNum, lonNum)
        if (google) {
          return NextResponse.json(google)
        }
      } catch {
        // Fallback Nominatim abaixo.
      }
    }

    const nominatim = await reverseNominatim(latNum, lonNum)
    if (nominatim) {
      return NextResponse.json(nominatim)
    }

    return NextResponse.json(
      { error: 'Endereço não encontrado para esta localização' },
      { status: 404 }
    )
  } catch {
    return NextResponse.json({ error: 'Erro ao consultar geolocalização' }, { status: 500 })
  }
}

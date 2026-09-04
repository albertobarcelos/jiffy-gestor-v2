import { NextRequest, NextResponse } from 'next/server'
import {
  geoJsonPointFromPlacesLocation,
  lerGoogleMapsApiKeyServer,
  parseGoogleAddressComponents,
  type GoogleAddressComponent,
} from '@/src/shared/utils/googleAddressComponents'
import { RATE_LIMIT_GEO, verificarRateLimit } from '@/src/shared/utils/rateLimitMemory'

type PlacesNewDetailsResponse = {
  id?: string
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  addressComponents?: GoogleAddressComponent[]
  error?: {
    message?: string
    status?: string
    code?: number
  }
}

/**
 * GET /api/geolocalizacao/places/details?placeId=...&sessionToken=...
 * Proxy para Places API (New) Place Details.
 */
export async function GET(request: NextRequest) {
  const rateLimited = verificarRateLimit(request, RATE_LIMIT_GEO.placesDetails)
  if (rateLimited) return rateLimited

  const apiKey = lerGoogleMapsApiKeyServer()
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_MAPS_API_KEY não configurada no servidor' },
      { status: 503 }
    )
  }

  const { searchParams } = request.nextUrl
  const placeIdRaw = searchParams.get('placeId')?.trim() ?? ''
  const sessionToken = searchParams.get('sessionToken')?.trim() ?? ''

  if (!placeIdRaw) {
    return NextResponse.json({ error: 'Informe placeId' }, { status: 400 })
  }

  const placeId = placeIdRaw.replace(/^places\//, '')
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`)
  url.searchParams.set('languageCode', 'pt-BR')
  url.searchParams.set('regionCode', 'BR')
  if (sessionToken) {
    url.searchParams.set('sessionToken', sessionToken)
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,formattedAddress,location,addressComponents',
      },
      next: { revalidate: 0 },
    })

    const data = (await response.json().catch(() => ({}))) as PlacesNewDetailsResponse

    if (response.status === 404 || data.error?.status === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Endereço não encontrado' }, { status: 404 })
    }

    if (!response.ok) {
      const msg =
        data.error?.message?.trim() ||
        `Falha ao consultar Place Details (New) [${response.status}]`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const enderecoLocalizacao = geoJsonPointFromPlacesLocation(data.location)
    if (!enderecoLocalizacao) {
      return NextResponse.json(
        { error: 'Place Details não retornou coordenadas válidas' },
        { status: 502 }
      )
    }

    const parsed = parseGoogleAddressComponents(data.addressComponents)
    const providerEnderecoId = data.id?.trim() || placeId

    return NextResponse.json({
      providerEnderecoId,
      enderecoLocalizacao,
      enderecoFormatado: data.formattedAddress?.trim() || null,
      rua: parsed.rua,
      numero: parsed.numero,
      bairro: parsed.bairro,
      cidade: parsed.cidade,
      estado: parsed.estado,
      cep: parsed.cep,
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao consultar detalhes do endereço' }, { status: 500 })
  }
}

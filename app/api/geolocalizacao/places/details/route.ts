import { NextRequest, NextResponse } from 'next/server'
import {
  geoJsonPointFromGoogleLocation,
  lerGoogleMapsApiKeyServer,
  parseGoogleAddressComponents,
  type GoogleAddressComponent,
} from '@/src/shared/utils/googleAddressComponents'

type GooglePlaceDetailsResponse = {
  status?: string
  error_message?: string
  result?: {
    place_id?: string
    formatted_address?: string
    geometry?: {
      location?: { lat?: number; lng?: number }
    }
    address_components?: GoogleAddressComponent[]
  }
}

const NOT_FOUND = new Set(['ZERO_RESULTS', 'NOT_FOUND'])

/**
 * GET /api/geolocalizacao/places/details?placeId=...&sessionToken=...
 */
export async function GET(request: NextRequest) {
  const apiKey = lerGoogleMapsApiKeyServer()
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_MAPS_API_KEY não configurada no servidor' },
      { status: 503 }
    )
  }

  const { searchParams } = request.nextUrl
  const placeId = searchParams.get('placeId')?.trim() ?? ''
  const sessionToken = searchParams.get('sessionToken')?.trim() ?? ''

  if (!placeId) {
    return NextResponse.json({ error: 'Informe placeId' }, { status: 400 })
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('language', 'pt-BR')
  url.searchParams.set(
    'fields',
    'place_id,formatted_address,geometry,address_component'
  )
  if (sessionToken) {
    url.searchParams.set('sessiontoken', sessionToken)
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Falha ao consultar Place Details' }, { status: 502 })
    }

    const data = (await response.json()) as GooglePlaceDetailsResponse
    const status = data.status ?? ''

    if (NOT_FOUND.has(status)) {
      return NextResponse.json({ error: 'Endereço não encontrado' }, { status: 404 })
    }

    if (status !== 'OK' || !data.result) {
      return NextResponse.json(
        {
          error:
            data.error_message?.trim() ||
            `Google Place Details retornou status ${status || 'desconhecido'}`,
        },
        { status: 502 }
      )
    }

    const result = data.result
    const enderecoLocalizacao = geoJsonPointFromGoogleLocation(result.geometry?.location)
    if (!enderecoLocalizacao) {
      return NextResponse.json(
        { error: 'Place Details não retornou coordenadas válidas' },
        { status: 502 }
      )
    }

    const parsed = parseGoogleAddressComponents(result.address_components)
    const providerEnderecoId = result.place_id?.trim() || placeId

    return NextResponse.json({
      providerEnderecoId,
      enderecoLocalizacao,
      enderecoFormatado: result.formatted_address?.trim() || null,
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

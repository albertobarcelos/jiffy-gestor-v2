import { NextRequest, NextResponse } from 'next/server'
import { lerGoogleMapsApiKeyServer } from '@/src/shared/utils/googleAddressComponents'

type GoogleAutocompletePrediction = {
  place_id?: string
  description?: string
  structured_formatting?: {
    main_text?: string
    secondary_text?: string
  }
}

type GoogleAutocompleteResponse = {
  status?: string
  error_message?: string
  predictions?: GoogleAutocompletePrediction[]
}

const OK_OR_EMPTY = new Set(['OK', 'ZERO_RESULTS'])

/**
 * GET /api/geolocalizacao/places/autocomplete?input=...&sessionToken=...&lat=&lng=&radius=
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
  const input = searchParams.get('input')?.trim() ?? ''
  const sessionToken = searchParams.get('sessionToken')?.trim() ?? ''

  if (input.length < 3) {
    return NextResponse.json({ predictions: [] })
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
  url.searchParams.set('input', input)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('language', 'pt-BR')
  url.searchParams.set('components', 'country:br')
  url.searchParams.set('types', 'address')
  if (sessionToken) {
    url.searchParams.set('sessiontoken', sessionToken)
  }

  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const latNum = lat != null ? Number(lat) : NaN
  const lngNum = lng != null ? Number(lng) : NaN
  if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
    url.searchParams.set('location', `${latNum},${lngNum}`)
    const radius = Number(searchParams.get('radius') ?? '50000')
    url.searchParams.set('radius', String(Number.isFinite(radius) && radius > 0 ? radius : 50000))
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Falha ao consultar Places Autocomplete' },
        { status: 502 }
      )
    }

    const data = (await response.json()) as GoogleAutocompleteResponse
    const status = data.status ?? ''

    if (!OK_OR_EMPTY.has(status)) {
      return NextResponse.json(
        {
          error:
            data.error_message?.trim() ||
            `Google Places Autocomplete retornou status ${status || 'desconhecido'}`,
        },
        { status: 502 }
      )
    }

    const predictions = (data.predictions ?? [])
      .map(p => ({
        placeId: p.place_id?.trim() ?? '',
        descricao: p.description?.trim() ?? '',
        descricaoPrincipal: p.structured_formatting?.main_text?.trim() ?? '',
        descricaoSecundaria: p.structured_formatting?.secondary_text?.trim() ?? '',
      }))
      .filter(p => p.placeId && p.descricao)

    return NextResponse.json({ predictions })
  } catch {
    return NextResponse.json({ error: 'Erro ao consultar sugestões de endereço' }, { status: 500 })
  }
}

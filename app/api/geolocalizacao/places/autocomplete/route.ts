import { NextRequest, NextResponse } from 'next/server'
import { lerGoogleMapsApiKeyServer } from '@/src/shared/utils/googleAddressComponents'
import { RATE_LIMIT_GEO, verificarRateLimit } from '@/src/shared/utils/rateLimitMemory'

type PlacesNewText = {
  text?: string
}

type PlacesNewPlacePrediction = {
  place?: string
  placeId?: string
  text?: PlacesNewText
  structuredFormat?: {
    mainText?: PlacesNewText
    secondaryText?: PlacesNewText
  }
}

type PlacesNewAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: PlacesNewPlacePrediction
  }>
  error?: {
    message?: string
    status?: string
  }
}

/**
 * GET /api/geolocalizacao/places/autocomplete?input=...&sessionToken=...&lat=&lng=&radius=
 * Proxy para Places API (New) Autocomplete.
 */
export async function GET(request: NextRequest) {
  const rateLimited = verificarRateLimit(request, RATE_LIMIT_GEO.placesAutocomplete)
  if (rateLimited) return rateLimited

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

  const body: Record<string, unknown> = {
    input,
    languageCode: 'pt-BR',
    includedRegionCodes: ['br'],
  }

  if (sessionToken) {
    body.sessionToken = sessionToken
  }

  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const latNum = lat != null ? Number(lat) : NaN
  const lngNum = lng != null ? Number(lng) : NaN
  if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
    const radius = Number(searchParams.get('radius') ?? '50000')
    const radiusMeters = Number.isFinite(radius) && radius > 0 ? radius : 50000
    body.locationBias = {
      circle: {
        center: { latitude: latNum, longitude: lngNum },
        radius: radiusMeters,
      },
    }
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
      },
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    })

    const data = (await response.json().catch(() => ({}))) as PlacesNewAutocompleteResponse

    if (!response.ok) {
      const msg =
        data.error?.message?.trim() ||
        `Falha ao consultar Places Autocomplete (New) [${response.status}]`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const predictions = (data.suggestions ?? [])
      .map(s => {
        const p = s.placePrediction
        if (!p) return null
        const placeId = (p.placeId ?? p.place?.replace(/^places\//, '') ?? '').trim()
        const descricao = p.text?.text?.trim() ?? ''
        const descricaoPrincipal = p.structuredFormat?.mainText?.text?.trim() ?? ''
        const descricaoSecundaria = p.structuredFormat?.secondaryText?.text?.trim() ?? ''
        if (!placeId || !descricao) return null
        return { placeId, descricao, descricaoPrincipal, descricaoSecundaria }
      })
      .filter((p): p is NonNullable<typeof p> => p != null)

    return NextResponse.json({ predictions })
  } catch {
    return NextResponse.json({ error: 'Erro ao consultar sugestões de endereço' }, { status: 500 })
  }
}

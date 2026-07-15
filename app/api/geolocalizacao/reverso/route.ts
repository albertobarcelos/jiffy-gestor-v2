import { NextRequest, NextResponse } from 'next/server'

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

/**
 * Reverse geocode (lat/lon → endereço). Proxy Nominatim para evitar CORS
 * e enviar User-Agent adequado.
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
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'json')
    url.searchParams.set('lat', String(latNum))
    url.searchParams.set('lon', String(lonNum))
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

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Não foi possível obter o endereço pela localização' },
        { status: 502 }
      )
    }

    const data = (await response.json()) as NominatimReverseResponse
    if (data.error || !data.address) {
      return NextResponse.json(
        { error: 'Endereço não encontrado para esta localização' },
        { status: 404 }
      )
    }

    const a = data.address
    const rua = a.road || a.pedestrian || a.residential || ''
    const bairro = a.suburb || a.neighbourhood || a.city_district || ''
    const cidade = a.city || a.town || a.village || a.municipality || ''
    const estado = ufDeNominatim(a)
    const cep = (a.postcode ?? '').replace(/\D/g, '').slice(0, 8)
    const numero = a.house_number ?? ''

    return NextResponse.json({
      rua,
      numero,
      bairro,
      cidade,
      estado,
      cep,
    })
  } catch {
    return NextResponse.json(
      { error: 'Erro ao consultar geolocalização' },
      { status: 500 }
    )
  }
}

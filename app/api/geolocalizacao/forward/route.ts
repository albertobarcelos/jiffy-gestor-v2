import { NextRequest, NextResponse } from 'next/server'
import {
  geoJsonPointFromLatLng,
  type GeoJsonPoint,
} from '@/src/shared/types/geoJsonPoint'
import {
  montarEnderecoParaGeocode,
  normalizarCepEndereco,
  type EnderecoEmpresaGeocodeInput,
} from '@/src/shared/utils/geolocalizacaoEmpresa'

type GoogleGeocodeResponse = {
  status?: string
  error_message?: string
  results?: Array<{
    place_id?: string
    formatted_address?: string
    geometry?: {
      location?: {
        lat?: number
        lng?: number
      }
    }
    address_components?: Array<{
      long_name?: string
      short_name?: string
      types?: string[]
    }>
  }>
}

const NOT_FOUND = new Set(['ZERO_RESULTS', 'NOT_FOUND'])

function lerGoogleMapsApiKey(): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim()
  return key || null
}

function lerEnderecoDaQuery(request: NextRequest): EnderecoEmpresaGeocodeInput | null {
  const { searchParams } = request.nextUrl
  const rua = searchParams.get('rua')?.trim() ?? ''
  const numero = searchParams.get('numero')?.trim() ?? ''
  const cidade = searchParams.get('cidade')?.trim() ?? ''
  const estado = searchParams.get('estado')?.trim().toUpperCase() ?? ''

  if (rua && numero && cidade && estado) {
    return {
      rua,
      numero,
      bairro: searchParams.get('bairro')?.trim() || undefined,
      cidade,
      estado,
      cep: searchParams.get('cep')?.trim() || undefined,
      complemento: searchParams.get('complemento')?.trim() || undefined,
    }
  }

  const address = searchParams.get('address')?.trim()
  if (address) {
    return {
      rua: address,
      numero: 'S/N',
      cidade: 'Brasil',
      estado: 'BR',
    }
  }

  return null
}

function montarComponentesGoogle(input: EnderecoEmpresaGeocodeInput): string {
  const partes = ['country:BR']
  if (input.estado && input.estado.length === 2) {
    partes.push(`administrative_area:${input.estado}`)
  }
  if (input.cidade?.trim()) {
    partes.push(`locality:${input.cidade.trim()}`)
  }
  const cep = normalizarCepEndereco(input.cep)
  if (cep.length === 8) {
    partes.push(`postal_code:${cep}`)
  }
  return partes.join('|')
}

function normalizarTextoComparacao(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .trim()
}

function resultadoCompativelComCidade(
  result: NonNullable<GoogleGeocodeResponse['results']>[number],
  cidadeEsperada: string
): boolean {
  const alvo = normalizarTextoComparacao(cidadeEsperada)
  const componentes = result.address_components ?? []
  return componentes.some(componente => {
    const nome = componente.long_name ?? componente.short_name ?? ''
    return normalizarTextoComparacao(nome).includes(alvo) || alvo.includes(normalizarTextoComparacao(nome))
  })
}

function escolherMelhorResultado(
  results: NonNullable<GoogleGeocodeResponse['results']>,
  input: EnderecoEmpresaGeocodeInput
) {
  if (!input.cidade?.trim()) return results[0]

  const cidadeEsperada = input.cidade.trim()
  const compativel = results.find(result => resultadoCompativelComCidade(result, cidadeEsperada))
  return compativel ?? results[0]
}

/**
 * Geocodificação forward (endereço → coordenadas) via Google Geocoding API.
 * GET /api/geolocalizacao/forward?rua=...&numero=...&cidade=...&estado=...
 */
export async function GET(request: NextRequest) {
  const apiKey = lerGoogleMapsApiKey()
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_MAPS_API_KEY não configurada no servidor' },
      { status: 503 }
    )
  }

  const input = lerEnderecoDaQuery(request)
  if (!input) {
    return NextResponse.json(
      { error: 'Informe rua, número, cidade e estado (ou address completo)' },
      { status: 400 }
    )
  }

  const address = montarEnderecoParaGeocode(input)
  if (address.length < 5) {
    return NextResponse.json({ error: 'Endereço insuficiente para geocodificação' }, { status: 400 })
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.set('address', address)
    url.searchParams.set('components', montarComponentesGoogle(input))
    url.searchParams.set('language', 'pt-BR')
    url.searchParams.set('region', 'br')
    url.searchParams.set('key', apiKey)

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Falha ao consultar Google Geocoding API' },
        { status: 502 }
      )
    }

    const data = (await response.json()) as GoogleGeocodeResponse
    const status = data.status ?? ''

    if (NOT_FOUND.has(status)) {
      return NextResponse.json(
        { error: 'Endereço não encontrado. Confira rua, número, CEP e cidade ou ajuste o pin no mapa.' },
        { status: 404 }
      )
    }

    if (status !== 'OK') {
      return NextResponse.json(
        {
          error:
            data.error_message?.trim() ||
            `Google Geocoding retornou status ${status || 'desconhecido'}`,
        },
        { status: 502 }
      )
    }

    const results = data.results ?? []
    if (!results.length) {
      return NextResponse.json(
        { error: 'Endereço não encontrado. Confira os campos ou ajuste o pin no mapa.' },
        { status: 404 }
      )
    }

    const escolhido = escolherMelhorResultado(results, input)
    const lat = escolhido.geometry?.location?.lat
    const lng = escolhido.geometry?.location?.lng

    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return NextResponse.json(
        { error: 'Google Geocoding não retornou coordenadas válidas' },
        { status: 502 }
      )
    }

    const enderecoLocalizacao: GeoJsonPoint = geoJsonPointFromLatLng(lat, lng)
    const providerEnderecoId = escolhido.place_id?.trim() || null

    return NextResponse.json({
      enderecoLocalizacao,
      providerEnderecoId,
      enderecoFormatado: escolhido.formatted_address?.trim() || null,
      enderecoConsultado: address,
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao consultar geolocalização' }, { status: 500 })
  }
}

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
import { RATE_LIMIT_GEO, verificarRateLimit } from '@/src/shared/utils/rateLimitMemory'

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
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
  return key || null
}

function lerEnderecoDaQuery(request: NextRequest): EnderecoEmpresaGeocodeInput | null {
  const { searchParams } = request.nextUrl
  const rua = searchParams.get('rua')?.trim() ?? ''
  const numero = searchParams.get('numero')?.trim() ?? ''
  const cidade = searchParams.get('cidade')?.trim() ?? ''
  const estado = searchParams.get('estado')?.trim().toUpperCase() ?? ''
  const bairro = searchParams.get('bairro')?.trim() || undefined
  const cep = searchParams.get('cep')?.trim() || undefined
  const complemento = searchParams.get('complemento')?.trim() || undefined

  if (rua && numero && cidade && estado) {
    return {
      rua,
      numero,
      bairro,
      cidade,
      estado,
      cep,
      complemento,
    }
  }

  /** Checkout delivery: rua + número + contexto local (cidade ou bairro), UF opcional. */
  if (rua && numero && (cidade || bairro)) {
    return {
      rua,
      numero,
      bairro,
      cidade: cidade || undefined,
      estado: estado || undefined,
      cep,
      complemento,
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

function montarComponentesGoogle(input: EnderecoEmpresaGeocodeInput): string | null {
  const partes = ['country:BR']
  const estado = input.estado?.trim().toUpperCase()
  if (estado && estado.length === 2 && estado !== 'BR') {
    partes.push(`administrative_area:${estado}`)
  }
  return partes.join('|')
}

/** Endereços alternativos quando a busca completa falha (comum em cidades menores). */
function montarEnderecosAlternativosGeocode(input: EnderecoEmpresaGeocodeInput): string[] {
  const candidatos = new Set<string>()
  const principal = montarEnderecoParaGeocode(input)
  candidatos.add(principal)

  const semComplemento = montarEnderecoParaGeocode({ ...input, complemento: undefined })
  candidatos.add(semComplemento)

  const cep = normalizarCepEndereco(input.cep)
  const cepFormatado =
    cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : input.cep?.trim()
  const cidadeEstado = [input.cidade?.trim(), input.estado?.trim()?.toUpperCase()]
    .filter(Boolean)
    .join(' - ')

  if (input.rua?.trim() && input.numero?.trim() && input.bairro?.trim() && cidadeEstado) {
    candidatos.add(
      [input.rua.trim(), input.numero.trim(), input.bairro.trim(), cidadeEstado, 'Brasil']
        .filter(Boolean)
        .join(', ')
    )
  }

  if (cepFormatado && cidadeEstado) {
    candidatos.add([cepFormatado, cidadeEstado, 'Brasil'].join(', '))
  }

  if (input.rua?.trim() && cidadeEstado) {
    candidatos.add([input.rua.trim(), cidadeEstado, 'Brasil'].join(', '))
  }

  return [...candidatos].filter(endereco => endereco.trim().length >= 5)
}

async function consultarGoogleGeocode(
  apiKey: string,
  address: string,
  components: string | null
): Promise<GoogleGeocodeResponse> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', address)
  if (components) url.searchParams.set('components', components)
  url.searchParams.set('language', 'pt-BR')
  url.searchParams.set('region', 'br')
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

async function resolverGeocodeGoogle(
  apiKey: string,
  input: EnderecoEmpresaGeocodeInput
): Promise<GoogleGeocodeResponse | null> {
  const enderecos = montarEnderecosAlternativosGeocode(input)
  const componentesRestritos = montarComponentesGoogle(input)
  const tentativas: Array<string | null> = [componentesRestritos, 'country:BR', null]

  for (const endereco of enderecos) {
    for (const components of tentativas) {
      const data = await consultarGoogleGeocode(apiKey, endereco, components)
      if (data.status === 'OK' && (data.results?.length ?? 0) > 0) {
        return data
      }
      if (data.status && !NOT_FOUND.has(data.status) && data.status !== 'OK') {
        return data
      }
    }
  }

  return null
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

function resultadoCompativelComEstado(
  result: NonNullable<GoogleGeocodeResponse['results']>[number],
  estadoEsperado: string
): boolean {
  const alvo = normalizarTextoComparacao(estadoEsperado)
  if (alvo.length !== 2) return true

  return (result.address_components ?? []).some(componente => {
    if (!componente.types?.includes('administrative_area_level_1')) return false
    const sigla = normalizarTextoComparacao(componente.short_name ?? '')
    const nome = normalizarTextoComparacao(componente.long_name ?? '')
    return sigla === alvo || nome.includes(alvo)
  })
}

function escolherMelhorResultado(
  results: NonNullable<GoogleGeocodeResponse['results']>,
  input: EnderecoEmpresaGeocodeInput
) {
  let candidatos = results

  if (input.estado?.trim()) {
    const noEstado = candidatos.filter(result =>
      resultadoCompativelComEstado(result, input.estado!.trim())
    )
    if (noEstado.length > 0) candidatos = noEstado
  }

  const cidadeEsperada = input.cidade?.trim()
  if (cidadeEsperada) {
    const naCidade = candidatos.filter(result =>
      resultadoCompativelComCidade(result, cidadeEsperada)
    )
    if (naCidade.length > 0) return naCidade[0]
  }

  return candidatos[0]
}

/**
 * Geocodificação forward (endereço → coordenadas) via Google Geocoding API.
 * GET /api/geolocalizacao/forward?rua=...&numero=...&cidade=...&estado=...
 */
export async function GET(request: NextRequest) {
  const rateLimited = verificarRateLimit(request, RATE_LIMIT_GEO.forward)
  if (rateLimited) return rateLimited

  const apiKey = lerGoogleMapsApiKey()
  if (!apiKey) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY não configurada' },
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
    const data = await resolverGeocodeGoogle(apiKey, input)

    if (!data) {
      return NextResponse.json(
        { error: 'Endereço não encontrado. Confira rua, número, CEP e cidade ou ajuste o pin no mapa.' },
        { status: 404 }
      )
    }

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

import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { parseGeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import {
  backendForwardGeocode,
  backendReverseGeocode,
} from '@/src/shared/utils/geolocalizacaoBackendApi'

export type EnderecoGeocodeInput = {
  rua: string
  numero: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  complemento?: string
}

/** Chave estável dos campos que entram no geocode (ignora complemento). */
export function serializarEnderecoParaGeocode(endereco: EnderecoGeocodeInput): string {
  return JSON.stringify({
    rua: endereco.rua?.trim() ?? '',
    numero: endereco.numero?.trim() ?? '',
    bairro: endereco.bairro?.trim() ?? '',
    cidade: endereco.cidade?.trim() ?? '',
    estado: endereco.estado?.trim() ?? '',
    cep: normalizarCepEndereco(endereco.cep),
  })
}

export type GeocodeEnderecoResult = {
  enderecoLocalizacao: GeoJsonPoint
  providerEnderecoId: string | null
  enderecoFormatado: string | null
}

export type EnderecoLocalizacaoInput = GeoJsonPoint & {
  geocoding?: {
    provider?: 'GOOGLE'
    enderecoId?: string
  }
}

export function normalizarCepEndereco(cep: string | undefined): string {
  return (cep ?? '').replace(/\D/g, '')
}

export function montarEnderecoParaGeocode(input: EnderecoGeocodeInput): string {
  const cepDigits = normalizarCepEndereco(input.cep)
  const cepFormatado =
    cepDigits.length === 8 ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}` : input.cep?.trim()

  const partes = [
    [input.rua?.trim(), input.numero?.trim()].filter(Boolean).join(', '),
    input.complemento?.trim(),
    input.bairro?.trim(),
    [input.cidade?.trim(), input.estado?.trim()?.toUpperCase()].filter(Boolean).join(' - '),
    cepFormatado,
    'Brasil',
  ].filter((p): p is string => Boolean(p && p.trim()))

  return partes.join(', ')
}

export function montarParametrosGeocodeEndereco(input: EnderecoGeocodeInput): URLSearchParams {
  const params = new URLSearchParams()
  params.set('rua', input.rua.trim())
  params.set('numero', input.numero.trim())
  if (input.bairro?.trim()) params.set('bairro', input.bairro.trim())
  if (input.cidade?.trim()) params.set('cidade', input.cidade.trim())
  if (input.estado?.trim()) params.set('estado', input.estado.trim().toUpperCase())
  const cep = normalizarCepEndereco(input.cep)
  if (cep.length === 8) params.set('cep', cep)
  if (input.complemento?.trim()) params.set('complemento', input.complemento.trim())
  params.set('address', montarEnderecoParaGeocode(input))
  return params
}

export function enderecoGeocodeMinimo(input: EnderecoGeocodeInput): boolean {
  return Boolean(input.rua?.trim() && input.numero?.trim() && input.cidade?.trim() && input.estado?.trim())
}

/** Checkout / endereços legados: rua + número + (cidade, bairro ou CEP). Estado opcional. */
export function enderecoGeocodeMinimoFlexivel(input: EnderecoGeocodeInput): boolean {
  if (!input.rua?.trim() || !input.numero?.trim()) return false
  if (input.cidade?.trim()) return true
  if (input.bairro?.trim()) return true
  return normalizarCepEndereco(input.cep).length === 8
}

export type GeocodeMinimoModo = 'strict' | 'flexivel'

export function enderecoGeocodeAtendeMinimo(
  input: EnderecoGeocodeInput,
  modo: GeocodeMinimoModo = 'strict'
): boolean {
  return modo === 'flexivel' ? enderecoGeocodeMinimoFlexivel(input) : enderecoGeocodeMinimo(input)
}

function normalizarNomeLocalidade(value: string | undefined | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

export type EnderecoGeocodeFallback = {
  cidade?: string | null
  estado?: string | null
}

export type PrepararEnderecoGeocodeResult = {
  endereco: EnderecoGeocodeInput
  usouUfLoja: boolean
}

/**
 * Completa cidade/UF antes do geocode com fallback da loja
 * (UF só se o cliente não informou cidade ou a cidade é a mesma da loja).
 * Não usa ViaCEP — a busca de endereço no checkout é via Google Places.
 */
export function prepararEnderecoGeocodeCheckout(
  input: EnderecoGeocodeInput,
  fallback?: EnderecoGeocodeFallback
): PrepararEnderecoGeocodeResult {
  const endereco = enriquecerEnderecoParaGeocode(input, fallback)
  const usouUfLoja =
    !input.estado?.trim() &&
    Boolean(endereco.estado?.trim()) &&
    (!input.cidade?.trim() ||
      (Boolean(fallback?.cidade?.trim()) &&
        normalizarNomeLocalidade(input.cidade) ===
          normalizarNomeLocalidade(fallback?.cidade)))

  return { endereco, usouUfLoja }
}

export type ContextoErroGeolocalizacao = 'places' | 'details' | 'geocode' | 'gps'

/**
 * Traduz falhas técnicas do Google/BFF em mensagem clara para o cliente final.
 */
export function mensagemAmigavelErroGeolocalizacao(
  error: unknown,
  contexto: ContextoErroGeolocalizacao = 'geocode'
): string {
  const raw =
    error instanceof Error
      ? error.message.trim()
      : typeof error === 'string'
        ? error.trim()
        : ''
  const lower = raw.toLowerCase()

  if (
    raw.startsWith('Informe ') ||
    raw.startsWith('Preencha ') ||
    raw.startsWith('Permissão ') ||
    raw.startsWith('Tempo esgotado ao obter') ||
    raw.startsWith('Geolocalização não suportada')
  ) {
    return raw
  }

  if (/429|rate.?limit|muitas requisi|quota|OVER_QUERY_LIMIT/i.test(raw)) {
    return 'Muitas tentativas de busca. Aguarde um momento e tente novamente.'
  }

  if (
    /failed to fetch|networkerror|network error|load failed|econnrefused|etimedout|timeout|timed out|aborted/i.test(
      lower
    )
  ) {
    return 'Não foi possível conectar ao serviço de mapas. Verifique sua internet e tente novamente.'
  }

  if (
    /zero_results|não encontr|nao encontr|not found|sem resultado|nenhum resultado|sem coordenadas/i.test(
      lower
    )
  ) {
    return 'Não encontramos esse endereço no mapa. Tente outra busca ou ajuste o pin manualmente.'
  }

  if (
    /api.?key|não configurad|nao configurad|request_denied|maps.*indispon|serviço de mapas/i.test(
      lower
    )
  ) {
    return 'O serviço de mapas está temporariamente indisponível. Tente novamente em instantes.'
  }

  if (contexto === 'places') {
    return 'Não foi possível buscar sugestões de endereço. Tente novamente ou preencha o endereço manualmente.'
  }
  if (contexto === 'details') {
    return 'Não foi possível confirmar o endereço selecionado. Escolha outra sugestão ou preencha manualmente.'
  }
  if (contexto === 'gps') {
    return 'Não foi possível obter sua localização. Verifique a permissão do GPS ou busque o endereço pelo Google.'
  }

  return 'Não foi possível localizar o endereço no mapa. Tente buscar novamente ou ajuste o pin manualmente.'
}

export function enriquecerEnderecoParaGeocode(
  input: EnderecoGeocodeInput,
  fallback?: EnderecoGeocodeFallback
): EnderecoGeocodeInput {
  const cidadeCliente = input.cidade?.trim()
  const estadoCliente = input.estado?.trim()?.toUpperCase().slice(0, 2)
  const cidadeLoja = fallback?.cidade?.trim()
  const estadoLoja = fallback?.estado?.trim()?.toUpperCase().slice(0, 2)

  const cidade = cidadeCliente || cidadeLoja || input.cidade
  let estado = estadoCliente

  if (!estado && estadoLoja) {
    const semCidadeCliente = !cidadeCliente
    const mesmaCidadeDaLoja =
      Boolean(cidadeCliente && cidadeLoja) &&
      normalizarNomeLocalidade(cidadeCliente) === normalizarNomeLocalidade(cidadeLoja)

    if (semCidadeCliente || mesmaCidadeDaLoja) {
      estado = estadoLoja
    }
  }

  return {
    ...input,
    cidade,
    ...(estado ? { estado } : {}),
  }
}

export function descreverCamposGeocodeFaltantes(
  input: EnderecoGeocodeInput,
  modo: GeocodeMinimoModo = 'strict'
): string | null {
  if (enderecoGeocodeAtendeMinimo(input, modo)) return null

  const faltando: string[] = []
  if (!input.rua?.trim()) faltando.push('rua')
  if (!input.numero?.trim()) faltando.push('número')

  if (modo === 'strict') {
    if (!input.cidade?.trim()) faltando.push('cidade')
    if (!input.estado?.trim()) faltando.push('estado (UF)')
  } else {
    const temContexto =
      Boolean(input.cidade?.trim()) ||
      Boolean(input.bairro?.trim()) ||
      normalizarCepEndereco(input.cep).length === 8
    if (!temContexto) faltando.push('cidade, bairro ou CEP')
  }

  if (!faltando.length) return null
  return `Informe ${faltando.join(', ')} para buscar no mapa.`
}

export async function geocodificarEnderecoViaGoogle(
  input: EnderecoGeocodeInput,
  options?: { minimo?: GeocodeMinimoModo }
): Promise<GeocodeEnderecoResult> {
  const minimo = options?.minimo ?? 'strict'
  if (!enderecoGeocodeAtendeMinimo(input, minimo)) {
    const msg =
      descreverCamposGeocodeFaltantes(input, minimo) ??
      'Preencha rua, número, cidade e estado antes de buscar a localização.'
    throw new Error(msg)
  }

  try {
    const lookup = await backendForwardGeocode({
      rua: input.rua,
      numero: input.numero,
      bairro: input.bairro,
      cidade: input.cidade,
      estado: input.estado,
      cep: input.cep,
    })
    return {
      enderecoLocalizacao: lookup.enderecoLocalizacao,
      providerEnderecoId: lookup.providerEnderecoId,
      enderecoFormatado: lookup.enderecoFormatado,
    }
  } catch (error) {
    throw new Error(mensagemAmigavelErroGeolocalizacao(error, 'geocode'))
  }
}

export function montarEnderecoLocalizacaoInput(
  point: GeoJsonPoint,
  providerEnderecoId?: string | null
): EnderecoLocalizacaoInput {
  return {
    type: point.type,
    coordinates: point.coordinates,
    geocoding: {
      provider: 'GOOGLE',
      ...(providerEnderecoId ? { enderecoId: providerEnderecoId } : {}),
    },
  }
}

export function coordsPointsDiferem(
  a: GeoJsonPoint | null | undefined,
  b: GeoJsonPoint | null | undefined,
  epsilon = 1e-6
): boolean {
  if (!a || !b) return false
  const [lngA, latA] = a.coordinates
  const [lngB, latB] = b.coordinates
  return Math.abs(lngA - lngB) > epsilon || Math.abs(latA - latB) > epsilon
}

export function resolverPreferenciaEntrega(
  enderecoLocalizacao: GeoJsonPoint,
  pinPosition: GeoJsonPoint
): GeoJsonPoint | null {
  return coordsPointsDiferem(enderecoLocalizacao, pinPosition) ? pinPosition : null
}

export function enderecoTemGeolocalizacao(endereco: {
  enderecoLocalizacao?: GeoJsonPoint | null
}): boolean {
  return Boolean(parseGeoJsonPoint(endereco.enderecoLocalizacao))
}

export type ModoPersistenciaGeoEnderecoDelivery = 'preferencia_entrega' | 'atualizar_endereco'

/** @deprecated Use `preferenciaEntrega` explícito no payload. */
export function montarPayloadGeoEnderecoDeliveryLegado(input: {
  enderecoLocalizacao: GeoJsonPoint
  pinPosition: GeoJsonPoint
  providerEnderecoId?: string | null
  modoAjustePin?: ModoPersistenciaGeoEnderecoDelivery
}): {
  enderecoLocalizacao: EnderecoLocalizacaoInput
  preferenciaEntrega?: GeoJsonPoint
} {
  if (input.modoAjustePin === 'atualizar_endereco') {
    return {
      enderecoLocalizacao: montarEnderecoLocalizacaoInput(
        input.pinPosition,
        input.providerEnderecoId
      ),
    }
  }

  const enderecoLocalizacao = montarEnderecoLocalizacaoInput(
    input.enderecoLocalizacao,
    input.providerEnderecoId
  )
  const preferenciaEntrega =
    input.modoAjustePin === 'preferencia_entrega'
      ? input.pinPosition
      : resolverPreferenciaEntrega(input.enderecoLocalizacao, input.pinPosition)
  return {
    enderecoLocalizacao,
    ...(preferenciaEntrega ? { preferenciaEntrega } : {}),
  }
}

export function montarPayloadGeoEnderecoDelivery(input: {
  enderecoLocalizacao: GeoJsonPoint
  providerEnderecoId?: string | null
  preferenciaEntrega?: GeoJsonPoint | null
}): {
  enderecoLocalizacao: EnderecoLocalizacaoInput
  preferenciaEntrega?: GeoJsonPoint
} {
  return {
    enderecoLocalizacao: montarEnderecoLocalizacaoInput(
      input.enderecoLocalizacao,
      input.providerEnderecoId
    ),
    ...(input.preferenciaEntrega ? { preferenciaEntrega: input.preferenciaEntrega } : {}),
  }
}

/** Reverse geocode (lat/lng → logradouro) via backend `/api/v1/geolocalizacao/reverso`. */
export async function resolverEnderecoPorCoordenadas(
  latitude: number,
  longitude: number
): Promise<EnderecoGeocodeInput> {
  try {
    const lookup = await backendReverseGeocode(latitude, longitude)
    return {
      rua: lookup.rua,
      numero: lookup.numero,
      bairro: lookup.bairro,
      cidade: lookup.cidade,
      estado: lookup.estado,
      cep: lookup.cep,
    }
  } catch (error) {
    throw new Error(mensagemAmigavelErroGeolocalizacao(error, 'geocode'))
  }
}

function pickTextoEndereco(
  revertido: string | undefined,
  cadastro: string | undefined
): string {
  const rev = (revertido ?? '').trim()
  if (rev) return rev
  return (cadastro ?? '').trim()
}

/** Mescla reverse geocode do pin com texto já cadastrado; complemento do cadastro é preservado. */
export function mesclarEnderecoComReverseGeocode(
  cadastro: EnderecoGeocodeInput,
  revertido: EnderecoGeocodeInput
): EnderecoGeocodeInput {
  const cepRevertido = normalizarCepEndereco(revertido.cep)
  const cepCadastro = normalizarCepEndereco(cadastro.cep)

  return {
    rua: pickTextoEndereco(revertido.rua, cadastro.rua),
    numero: pickTextoEndereco(revertido.numero, cadastro.numero),
    bairro: pickTextoEndereco(revertido.bairro, cadastro.bairro),
    cidade: pickTextoEndereco(revertido.cidade, cadastro.cidade),
    estado: pickTextoEndereco(revertido.estado, cadastro.estado),
    cep: cepRevertido.length === 8 ? cepRevertido : cepCadastro,
    complemento: cadastro.complemento?.trim() || undefined,
  }
}

/** Reverse trouxe logradouro utilizável (rua reconhecida). */
export function reverseGeocodeTemLogradouro(endereco: EnderecoGeocodeInput): boolean {
  return Boolean(endereco.rua?.trim() && endereco.rua.trim().length >= 2)
}

/** Compara ruas de forma tolerante (acentos, prefixo Rua/Av., pontuação). */
export function ruasEquivalentesParaGeocode(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/\b(rua|r|avenida|av|travessa|tv|alameda|al|estrada|rodovia|rod)\b\.?/g, ' ')
      .replace(/[^a-z0-9]+/g, '')
      .trim()
  const na = norm(a)
  const nb = norm(b)
  if (!na || !nb) return false
  return na === nb || na.includes(nb) || nb.includes(na)
}

/**
 * Remove logradouro/CEP do preview (evita texto stale ao mover o pin).
 * Mantém cidade/UF e complemento quando `manterLocalidade` for true.
 */
export function limparLogradouroEnderecoGeocode(
  base: EnderecoGeocodeInput,
  manterLocalidade = true
): EnderecoGeocodeInput {
  return {
    rua: '',
    numero: '',
    bairro: '',
    cidade: manterLocalidade ? base.cidade ?? '' : '',
    estado: manterLocalidade ? base.estado ?? '' : '',
    cep: '',
    complemento: base.complemento,
  }
}

/**
 * Aplica resultado do reverse no preview do pin.
 *
 * Se o cliente já digitou uma rua e o reverse devolve outra (mapa impreciso),
 * o texto digitado é preservado e `reconheceuLogradouro` fica false (fluxo de confirmação).
 * Campos já preenchidos pelo cliente (número, bairro, etc.) nunca são apagados pelo reverse.
 */
export function aplicarReverseGeocodeNoPreview(
  anterior: EnderecoGeocodeInput,
  revertido: EnderecoGeocodeInput
): { endereco: EnderecoGeocodeInput; reconheceuLogradouro: boolean } {
  if (!reverseGeocodeTemLogradouro(revertido)) {
    return {
      reconheceuLogradouro: false,
      endereco: limparLogradouroEnderecoGeocode({
        ...anterior,
        cidade: revertido.cidade?.trim() || anterior.cidade,
        estado: revertido.estado?.trim() || anterior.estado,
      }),
    }
  }

  const ruaCliente = anterior.rua?.trim() || ''
  const ruaRevertida = revertido.rua.trim()

  // Cliente já informou a rua e o Google apontou outro logradouro → não sobrescrever.
  if (ruaCliente && !ruasEquivalentesParaGeocode(ruaCliente, ruaRevertida)) {
    return {
      reconheceuLogradouro: false,
      endereco: { ...anterior },
    }
  }

  const cepCliente = normalizarCepEndereco(anterior.cep)
  const cepRevertido = normalizarCepEndereco(revertido.cep)

  return {
    reconheceuLogradouro: true,
    endereco: {
      rua: ruaCliente || ruaRevertida,
      numero: anterior.numero?.trim() || revertido.numero?.trim() || '',
      bairro: anterior.bairro?.trim() || revertido.bairro?.trim() || '',
      cidade: anterior.cidade?.trim() || revertido.cidade?.trim() || '',
      estado: anterior.estado?.trim() || revertido.estado?.trim() || '',
      cep: cepCliente.length === 8 ? cepCliente : cepRevertido.length === 8 ? cepRevertido : '',
      complemento: anterior.complemento,
    },
  }
}

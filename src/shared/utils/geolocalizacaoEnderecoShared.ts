import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { parseGeoJsonPoint } from '@/src/shared/types/geoJsonPoint'

export type EnderecoGeocodeInput = {
  rua: string
  numero: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  complemento?: string
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
  resolveuViaCep: boolean
  usouUfLoja: boolean
}

/**
 * Completa cidade/UF antes do geocode:
 * 1) ViaCEP quando houver CEP;
 * 2) UF da loja só se o cliente não informou cidade ou a cidade é a mesma da loja.
 */
export async function prepararEnderecoGeocodeCheckout(
  input: EnderecoGeocodeInput,
  fallback?: EnderecoGeocodeFallback
): Promise<PrepararEnderecoGeocodeResult> {
  let base: EnderecoGeocodeInput = { ...input }
  let resolveuViaCep = false

  const cep = normalizarCepEndereco(base.cep)
  if (cep.length === 8 && (!base.estado?.trim() || !base.cidade?.trim())) {
    try {
      const { consultarCepViaApi } = await import('@/src/shared/utils/consultaCep')
      const via = await consultarCepViaApi(cep)
      base = {
        ...base,
        cidade: base.cidade?.trim() || via.localidade || base.cidade,
        estado: base.estado?.trim() || via.uf || base.estado,
        bairro: base.bairro?.trim() || via.bairro || base.bairro,
      }
      resolveuViaCep = true
    } catch {
      // CEP inválido ou indisponível — segue sem bloquear.
    }
  }

  const endereco = enriquecerEnderecoParaGeocode(base, fallback)
  const usouUfLoja =
    !input.estado?.trim() &&
    Boolean(endereco.estado?.trim()) &&
    !resolveuViaCep &&
    (!input.cidade?.trim() ||
      (Boolean(fallback?.cidade?.trim()) &&
        normalizarNomeLocalidade(input.cidade) ===
          normalizarNomeLocalidade(fallback?.cidade)))

  return { endereco, resolveuViaCep, usouUfLoja }
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

  const params = montarParametrosGeocodeEndereco(input)
  const response = await fetch(`/api/geolocalizacao/forward?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg =
      typeof payload.error === 'string'
        ? payload.error
        : 'Não foi possível localizar o endereço no Google Maps'
    throw new Error(msg)
  }

  const point = parseGeoJsonPoint(payload.enderecoLocalizacao)
  if (!point) {
    throw new Error('Resposta de geocodificação inválida')
  }

  return {
    enderecoLocalizacao: point,
    providerEnderecoId:
      typeof payload.providerEnderecoId === 'string' ? payload.providerEnderecoId : null,
    enderecoFormatado:
      typeof payload.enderecoFormatado === 'string' ? payload.enderecoFormatado : null,
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

export function montarPayloadGeoEnderecoDelivery(input: {
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

/** Reverse geocode (lat/lng → logradouro) via BFF (Google, fallback Nominatim). */
export async function resolverEnderecoPorCoordenadas(
  latitude: number,
  longitude: number
): Promise<EnderecoGeocodeInput> {
  const response = await fetch(
    `/api/geolocalizacao/reverso?lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}`,
    { method: 'GET', headers: { Accept: 'application/json' } }
  )

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg =
      typeof payload.error === 'string'
        ? payload.error
        : 'Não foi possível obter o endereço pela localização do pin'
    throw new Error(msg)
  }

  const cepDigits = normalizarCepEndereco(String(payload.cep ?? ''))

  return {
    rua: String(payload.rua ?? '').trim(),
    numero: String(payload.numero ?? '').trim(),
    bairro: String(payload.bairro ?? '').trim(),
    cidade: String(payload.cidade ?? '').trim(),
    estado: String(payload.estado ?? '')
      .trim()
      .toUpperCase()
      .slice(0, 2),
    cep: cepDigits.length === 8 ? cepDigits : '',
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
 * Se não houver rua, limpa logradouro (não reaproveita endereço anterior).
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

  const cepRevertido = normalizarCepEndereco(revertido.cep)
  return {
    reconheceuLogradouro: true,
    endereco: {
      rua: revertido.rua.trim(),
      numero: revertido.numero?.trim() || '',
      bairro: revertido.bairro?.trim() || '',
      cidade: revertido.cidade?.trim() || anterior.cidade || '',
      estado: revertido.estado?.trim() || anterior.estado || '',
      cep: cepRevertido.length === 8 ? cepRevertido : '',
      complemento: anterior.complemento,
    },
  }
}

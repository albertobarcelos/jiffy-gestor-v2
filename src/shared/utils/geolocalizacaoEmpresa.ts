import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { geoJsonPointFromLatLng, parseGeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import {
  RAIO_AJUSTE_PIN_CIDADE_METROS,
  RAIO_AJUSTE_PIN_METROS,
  RAIO_AJUSTE_PIN_RUA_METROS,
} from '@/src/shared/utils/ajustePinEmpresa'
import {
  backendForwardGeocode,
  type GeolocalizacaoLookupFe,
} from '@/src/shared/utils/geolocalizacaoBackendApi'
import { mensagemAmigavelErroGeolocalizacao } from '@/src/shared/utils/geolocalizacaoEnderecoShared'

export type EnderecoEmpresaGeocodeInput = {
  rua: string
  numero: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  complemento?: string
}

/** endereco = ponto do endereço completo; os demais são aproximação. */
export type PrecisaoGeocodeEmpresa = 'endereco' | 'rua' | 'cep' | 'cidade'

export type GeocodeEmpresaResult = {
  enderecoLocalizacao: GeoJsonPoint
  providerEnderecoId: string | null
  enderecoFormatado: string | null
  precisao: PrecisaoGeocodeEmpresa
}

export type TentativaGeocodeEmpresa = {
  precisao: PrecisaoGeocodeEmpresa
  campos: {
    rua?: string
    numero?: string
    bairro?: string
    cidade?: string
    estado?: string
    cep?: string
  }
}

export function normalizarCepEndereco(cep: string | undefined): string {
  return (cep ?? '').replace(/\D/g, '')
}

export function montarEnderecoParaGeocode(input: EnderecoEmpresaGeocodeInput): string {
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

export function montarParametrosGeocodeEmpresa(input: EnderecoEmpresaGeocodeInput): URLSearchParams {
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

export function enderecoEmpresaGeocodeMinimo(input: EnderecoEmpresaGeocodeInput): boolean {
  return Boolean(input.rua?.trim() && input.numero?.trim() && input.cidade?.trim() && input.estado?.trim())
}

export function lerEnderecoLocalizacaoDoPayloadEmpresa(
  enderecoRaw: unknown
): { enderecoLocalizacao: GeoJsonPoint | null; providerEnderecoId: string | null } {
  if (!enderecoRaw || typeof enderecoRaw !== 'object' || Array.isArray(enderecoRaw)) {
    return { enderecoLocalizacao: null, providerEnderecoId: null }
  }
  const endereco = enderecoRaw as Record<string, unknown>
  const enderecoLocalizacao = parseGeoJsonPoint(endereco.enderecoLocalizacao)
  const providerEnderecoId =
    typeof endereco.providerEnderecoId === 'string' && endereco.providerEnderecoId.trim()
      ? endereco.providerEnderecoId.trim()
      : null
  return { enderecoLocalizacao, providerEnderecoId }
}

function textoCampoEndereco(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

/** Campos textuais do endereço da empresa para geocode (mesmo contrato da aba Empresa). */
export function lerCamposEnderecoEmpresa(enderecoRaw: unknown): EnderecoEmpresaGeocodeInput {
  if (!enderecoRaw || typeof enderecoRaw !== 'object' || Array.isArray(enderecoRaw)) {
    return { rua: '', numero: '' }
  }
  const endereco = enderecoRaw as Record<string, unknown>
  return {
    rua: textoCampoEndereco(endereco.rua),
    numero: textoCampoEndereco(endereco.numero),
    bairro: textoCampoEndereco(endereco.bairro) || undefined,
    cidade: textoCampoEndereco(endereco.cidade) || undefined,
    estado: textoCampoEndereco(endereco.estado) || undefined,
    cep: textoCampoEndereco(endereco.cep) || undefined,
    complemento: textoCampoEndereco(endereco.complemento) || undefined,
  }
}

export function geocodeEmpresaNaoEncontrado(error: unknown): boolean {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''
  return /não encontr|nao encontr|not found|zero_results|geocodingnotfound/i.test(raw)
}

/**
 * O forward com CEP no filtro do Google devolve vazio quando a rua existe
 * mas o número/CEP não casa. Aí tentamos a rua sem CEP, depois o CEP e a cidade.
 */
export function montarTentativasGeocodeEmpresa(
  input: EnderecoEmpresaGeocodeInput
): TentativaGeocodeEmpresa[] {
  const cepDigits = normalizarCepEndereco(input.cep)
  const cep = cepDigits.length === 8 ? cepDigits : undefined
  const rua = input.rua?.trim() || undefined
  const numero = input.numero?.trim() || undefined
  const bairro = input.bairro?.trim() || undefined
  const cidade = input.cidade?.trim() || undefined
  const estado = input.estado?.trim() || undefined

  const brutas: TentativaGeocodeEmpresa[] = [
    {
      precisao: 'endereco',
      campos: { rua, numero, bairro, cidade, estado, cep },
    },
  ]
  if (rua && cidade && estado) {
    brutas.push({ precisao: 'rua', campos: { rua, bairro, cidade, estado } })
  }
  if (cep && cidade && estado) {
    brutas.push({ precisao: 'cep', campos: { cidade, estado, cep } })
  }
  if (cep) {
    brutas.push({ precisao: 'cep', campos: { cep } })
  }
  if (cidade && estado) {
    brutas.push({ precisao: 'cidade', campos: { cidade, estado } })
  }

  const vistas = new Set<string>()
  return brutas.filter(tentativa => {
    const campos = tentativa.campos
    const chave = [campos.rua, campos.numero, campos.bairro, campos.cidade, campos.estado, campos.cep].join(
      '|'
    )
    if (vistas.has(chave)) return false
    vistas.add(chave)
    return true
  })
}

export function raioAjustePinPorPrecisao(precisao: PrecisaoGeocodeEmpresa): number {
  if (precisao === 'endereco') return RAIO_AJUSTE_PIN_METROS
  if (precisao === 'rua') return RAIO_AJUSTE_PIN_RUA_METROS
  return RAIO_AJUSTE_PIN_CIDADE_METROS
}

export function textoAproximacaoPinEmpresa(precisao: PrecisaoGeocodeEmpresa): string | null {
  if (precisao === 'endereco') return null
  if (precisao === 'rua') {
    return 'Aproximamos o pin pela rua, porque o número não foi encontrado. Arraste até a loja e salve.'
  }
  if (precisao === 'cep') {
    return 'Aproximamos o pin pelo CEP. Arraste até a loja e salve.'
  }
  return 'Aproximamos o pin pela cidade. Arraste até a loja e salve.'
}

export async function geocodificarEnderecoEmpresaViaGoogle(
  input: EnderecoEmpresaGeocodeInput,
  buscar: (
    campos: TentativaGeocodeEmpresa['campos']
  ) => Promise<GeolocalizacaoLookupFe> = backendForwardGeocode
): Promise<GeocodeEmpresaResult> {
  if (!enderecoEmpresaGeocodeMinimo(input)) {
    throw new Error('Preencha rua, número, cidade e estado antes de buscar a localização.')
  }

  const tentativas = montarTentativasGeocodeEmpresa(input)
  let ultimoErro: unknown = null
  for (const tentativa of tentativas) {
    try {
      const lookup = await buscar(tentativa.campos)
      return {
        enderecoLocalizacao: lookup.enderecoLocalizacao,
        providerEnderecoId: lookup.providerEnderecoId,
        enderecoFormatado: lookup.enderecoFormatado,
        precisao: tentativa.precisao,
      }
    } catch (error) {
      ultimoErro = error
      if (!geocodeEmpresaNaoEncontrado(error)) break
    }
  }

  throw new Error(mensagemAmigavelErroGeolocalizacao(ultimoErro, 'geocode'))
}

/** Chave estável dos campos que definem a coordenada da loja (ignora complemento). */
export function assinaturaEnderecoEmpresaGeocode(input: EnderecoEmpresaGeocodeInput): string {
  return [
    (input.rua ?? '').trim().toLowerCase(),
    (input.numero ?? '').trim().toLowerCase(),
    (input.bairro ?? '').trim().toLowerCase(),
    (input.cidade ?? '').trim().toLowerCase(),
    (input.estado ?? '').trim().toUpperCase(),
    normalizarCepEndereco(input.cep),
  ].join('|')
}

export type ResolucaoPinEmpresa =
  | { acao: 'manter'; point: GeoJsonPoint; providerEnderecoId: string | null }
  | { acao: 'geocodificar' }
  | { acao: 'pular' }

/**
 * A aba Empresa grava o endereço. Com rua, número, cidade e estado, geocodifica.
 * O pin carregado com o formulário não trava a coordenada: se o texto mudou, busca de novo.
 * Só preserva o ponto quando o operador escolheu um pin nesta edição (Places).
 */
export function resolverPinAoSalvarEmpresa(params: {
  enderecoAtual: EnderecoEmpresaGeocodeInput
  enderecoSalvo: EnderecoEmpresaGeocodeInput | null
  pinAtual: GeoJsonPoint | null
  providerEnderecoId: string | null
  pinEscolhidoNestaEdicao: boolean
}): ResolucaoPinEmpresa {
  const minimo = enderecoEmpresaGeocodeMinimo(params.enderecoAtual)
  const enderecoMudou =
    !params.enderecoSalvo ||
    assinaturaEnderecoEmpresaGeocode(params.enderecoAtual) !==
      assinaturaEnderecoEmpresaGeocode(params.enderecoSalvo)

  if (!minimo) {
    if (params.pinAtual && !enderecoMudou) {
      return {
        acao: 'manter',
        point: params.pinAtual,
        providerEnderecoId: params.providerEnderecoId,
      }
    }
    return { acao: 'pular' }
  }

  if (params.pinEscolhidoNestaEdicao && params.pinAtual && enderecoMudou) {
    return {
      acao: 'manter',
      point: params.pinAtual,
      providerEnderecoId: params.providerEnderecoId,
    }
  }

  return { acao: 'geocodificar' }
}

export function montarPatchEnderecoGeolocalizacao(
  point: GeoJsonPoint | null,
  providerEnderecoId?: string | null
): Record<string, unknown> | null {
  if (!point) return null
  return {
    enderecoLocalizacao: point,
    geocodingProvider: 'GOOGLE',
    ...(providerEnderecoId ? { providerEnderecoId } : {}),
  }
}

/** Converte lat/lng do mapa para GeoJSON Point. */
export function geoPointFromMapLatLng(lat: number, lng: number): GeoJsonPoint {
  return geoJsonPointFromLatLng(lat, lng)
}

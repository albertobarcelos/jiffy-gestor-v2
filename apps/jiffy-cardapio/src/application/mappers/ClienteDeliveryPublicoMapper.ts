import type {
  ClienteDeliveryPublicoDTO,
  EnderecoClienteDeliveryPublicoDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { normalizarClienteDeliveryApi } from '@/src/application/mappers/ClienteDeliveryMoradaMapper'
import { parseGeoJsonPoint } from '@/src/shared/types/geoJsonPoint'

/** Códigos IBGE de UF → sigla (quando a API não manda `estado` preenchido). */
const UF_POR_CODIGO_IBGE: Record<string, string> = {
  '11': 'RO',
  '12': 'AC',
  '13': 'AM',
  '14': 'RR',
  '15': 'PA',
  '16': 'AP',
  '17': 'TO',
  '21': 'MA',
  '22': 'PI',
  '23': 'CE',
  '24': 'RN',
  '25': 'PB',
  '26': 'PE',
  '27': 'AL',
  '28': 'SE',
  '29': 'BA',
  '31': 'MG',
  '32': 'ES',
  '33': 'RJ',
  '35': 'SP',
  '41': 'PR',
  '42': 'SC',
  '43': 'RS',
  '50': 'MS',
  '51': 'MT',
  '52': 'GO',
  '53': 'DF',
}

function asStr(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

function pickField(rec: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in rec && rec[key] != null && asStr(rec[key]) !== '') {
      return rec[key]
    }
  }
  return undefined
}

function normalizarUf(
  estadoRaw: unknown,
  codigoEstadoIbgeRaw?: unknown
): string | null {
  const texto = asStr(estadoRaw).toUpperCase()
  if (/^[A-Z]{2}$/.test(texto)) return texto

  const codigo = asStr(codigoEstadoIbgeRaw).replace(/\D/g, '').slice(0, 2)
  if (codigo && UF_POR_CODIGO_IBGE[codigo]) {
    return UF_POR_CODIGO_IBGE[codigo]
  }

  return null
}

function normalizeEnderecoRecord(
  raw: unknown
): EnderecoClienteDeliveryPublicoDTO | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const e = raw as Record<string, unknown>
  const id = asStr(pickField(e, ['id', 'enderecoId', 'enderecoDeliveryId']))
  if (!id) return null

  const codigoEstadoIbge = pickField(e, ['codigoEstadoIbge', 'codigo_estado_ibge'])

  return {
    id,
    etiqueta: asStr(pickField(e, ['etiqueta', 'tipoEtiqueta'])) || 'casa',
    rua: asStr(pickField(e, ['rua', 'logradouro'])),
    numero: asStr(pickField(e, ['numero'])),
    bairro: asStr(pickField(e, ['bairro'])),
    cidade: asStr(pickField(e, ['cidade', 'localidade', 'municipio'])) || null,
    estado: normalizarUf(
      pickField(e, ['estado', 'uf', 'state']),
      codigoEstadoIbge
    ),
    cep: asStr(pickField(e, ['cep', 'CEP'])) || null,
    complemento: asStr(pickField(e, ['complemento'])) || null,
    ultimaUtilizacaoEm:
      e.ultimaUtilizacaoEm != null ? asStr(e.ultimaUtilizacaoEm) || null : null,
    enderecoLocalizacao: parseGeoJsonPoint(e.enderecoLocalizacao),
    preferenciaEntrega: parseGeoJsonPoint(e.preferenciaEntrega),
    geocodingProvider: asStr(pickField(e, ['geocodingProvider', 'geocoding_provider'])) || null,
    providerEnderecoId:
      asStr(pickField(e, ['providerEnderecoId', 'provider_endereco_id'])) || null,
  }
}

function normalizeEnderecos(enderecosRaw: unknown): EnderecoClienteDeliveryPublicoDTO[] {
  if (!Array.isArray(enderecosRaw)) return []
  return enderecosRaw
    .map(normalizeEnderecoRecord)
    .filter((e): e is EnderecoClienteDeliveryPublicoDTO => e != null)
}

/** Normaliza resposta bruta da API pública de cliente delivery. */
export function normalizarClienteDeliveryPublico(
  raw: unknown
): ClienteDeliveryPublicoDTO | null {
  const base = normalizarClienteDeliveryApi(raw)
  if (!base) return null

  // Lê endereços do payload bruto (não só do cast) para não perder `uf` / IBGE.
  const payload =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null
  const inner =
    payload?.data != null &&
    typeof payload.data === 'object' &&
    !Array.isArray(payload.data)
      ? (payload.data as Record<string, unknown>)
      : payload
  const enderecosBrutos = inner?.enderecos ?? base.enderecos

  return {
    telefone: base.telefone.replace(/\D/g, '') || base.telefone,
    nome: (() => {
      const fromBase = base.nome?.trim() || ''
      if (fromBase) return fromBase
      if (!inner) return null
      const fromRaw = asStr(pickField(inner, ['nome', 'name', 'destinatarioNome']))
      return fromRaw || null
    })(),
    cpf: base.cpf ?? null,
    clienteIdVinculado: base.clienteIdVinculado ?? null,
    enderecos: normalizeEnderecos(enderecosBrutos),
  }
}

export function formatarResumoEnderecoPublico(
  endereco: EnderecoClienteDeliveryPublicoDTO
): string {
  const cidadeEstado = [endereco.cidade, endereco.estado].filter(Boolean).join('/')
  const partes = [
    endereco.rua,
    endereco.numero ? `nº ${endereco.numero}` : '',
    endereco.bairro,
    cidadeEstado,
  ].filter(Boolean)
  return partes.join(', ')
}

import type {
  ClienteDeliveryPublicoDTO,
  EnderecoClienteDeliveryPublicoDTO,
  EnderecoDeliveryPublicoInput,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  atualizarClienteDeliveryPublico,
  buscarClienteDeliveryPublico,
  criarClienteDeliveryPublico,
} from '@/src/infrastructure/api/publicDeliveryApi'
import { normalizarClienteDeliveryApi } from '@/src/application/mappers/ClienteDeliveryMoradaMapper'

const MAX_ENDERECOS = 5

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

export type EnderecoFormPublico = {
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  cep?: string
  complemento?: string
  pontoReferencia?: string
  etiqueta?: 'casa' | 'trabalho' | 'outro'
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

function montarEnderecoPayload(form: EnderecoFormPublico): EnderecoDeliveryPublicoInput {
  const estado = form.estado.trim().toUpperCase().slice(0, 2)
  const cep = (form.cep ?? '').replace(/\D/g, '').slice(0, 8)
  const complementoParts = [form.complemento?.trim(), form.pontoReferencia?.trim()]
    .filter(Boolean)
    .join(' | ')
  return {
    etiqueta: form.etiqueta ?? 'casa',
    rua: form.rua.trim(),
    numero: form.numero.trim(),
    bairro: form.bairro.trim(),
    cidade: form.cidade.trim() || null,
    estado: estado || null,
    ...(cep.length === 8 ? { cep } : {}),
    ...(complementoParts.length > 0 ? { complemento: complementoParts } : {}),
  }
}

function localizarEnderecoCriado(
  cliente: ClienteDeliveryPublicoDTO,
  form: EnderecoFormPublico,
  idsAnteriores: Set<string>
): string {
  const novos = cliente.enderecos.filter(e => !idsAnteriores.has(e.id))
  if (novos.length === 1) return novos[0].id

  const rua = form.rua.trim().toLowerCase()
  const numero = form.numero.trim()
  const porCampos = cliente.enderecos.find(
    e => e.rua.trim().toLowerCase() === rua && e.numero.trim() === numero
  )
  if (porCampos) return porCampos.id

  if (novos.length > 0) return novos[novos.length - 1].id
  if (cliente.enderecos.length > 0) {
    return cliente.enderecos[cliente.enderecos.length - 1].id
  }

  throw new Error(
    'O endereço foi enviado, mas a resposta não trouxe o identificador. Tente novamente.'
  )
}

export type GarantirEnderecoEntregaParams = {
  telefone: string
  nome: string | null
  modoEndereco: 'existente' | 'novo'
  enderecoIdSelecionado: string | null
  /** Snapshot do lookup anterior (pode estar desatualizado). */
  clienteLookup: ClienteDeliveryPublicoDTO | null
  enderecoNovo: EnderecoFormPublico
}

/**
 * Garante que o endereço de entrega exista no cadastro do cliente delivery
 * e retorna o `enderecoIdEntrega` a ser usado no pedido.
 */
export async function garantirEnderecoEntregaPublico(
  params: GarantirEnderecoEntregaParams
): Promise<string> {
  const telefone = params.telefone.replace(/\D/g, '')
  if (telefone.length < 8) {
    throw new Error('Informe um telefone válido')
  }

  if (params.modoEndereco === 'existente') {
    const id = params.enderecoIdSelecionado?.trim()
    if (!id) {
      throw new Error('Selecione um endereço de entrega')
    }
    const nome = params.nome?.trim()
    // Persiste o nome no cliente_delivery quando o usuário informou e o cadastro não tinha.
    if (nome) {
      const nomeAtual = params.clienteLookup?.nome?.trim() || ''
      if (nomeAtual !== nome) {
        await atualizarClienteDeliveryPublico(telefone, { nome })
      }
    }
    return id
  }

  if (
    !params.enderecoNovo.rua.trim() ||
    !params.enderecoNovo.numero.trim() ||
    !params.enderecoNovo.bairro.trim()
  ) {
    throw new Error('Preencha o endereço de entrega')
  }

  const enderecoPayload = montarEnderecoPayload(params.enderecoNovo)
  const nome = params.nome?.trim() || null

  let clienteAtual =
    params.clienteLookup &&
    params.clienteLookup.telefone.replace(/\D/g, '') === telefone
      ? params.clienteLookup
      : null

  if (!clienteAtual) {
    const raw = await buscarClienteDeliveryPublico(telefone)
    clienteAtual = raw ? normalizarClienteDeliveryPublico(raw) : null
  }

  if (!clienteAtual) {
    const criadoRaw = await criarClienteDeliveryPublico({
      telefone,
      nome,
      enderecos: [enderecoPayload],
    })
    const criado = normalizarClienteDeliveryPublico(criadoRaw)
    if (!criado?.enderecos.length) {
      throw new Error('Não foi possível cadastrar o endereço do cliente')
    }
    return localizarEnderecoCriado(criado, params.enderecoNovo, new Set())
  }

  if (clienteAtual.enderecos.length >= MAX_ENDERECOS) {
    throw new Error(
      'Este telefone já possui o máximo de endereços cadastrados. Escolha um endereço existente.'
    )
  }

  const idsAnteriores = new Set(clienteAtual.enderecos.map(e => e.id))
  const atualizadoRaw = await atualizarClienteDeliveryPublico(telefone, {
    ...(nome ? { nome } : {}),
    enderecos: { create: [enderecoPayload] },
  })
  const atualizado = normalizarClienteDeliveryPublico(atualizadoRaw)
  if (!atualizado) {
    throw new Error('Não foi possível salvar o novo endereço')
  }

  return localizarEnderecoCriado(atualizado, params.enderecoNovo, idsAnteriores)
}

import type { EtiquetaEnderecoDeliveryApi } from '@/src/application/dto/api/pedidoDeliveryApi'
import type { EnderecoEntregaDetalhe } from '@/src/domain/types/vendaDetalhe'
import type {
  CriarMoradaTelefoneDTO,
  EnderecoMorada,
  MoradaTelefone,
} from '@/src/presentation/hooks/useMoradaTelefone'

export interface ClienteDeliveryEnderecoApi {
  id?: string | null
  etiqueta?: string | null
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  complemento?: string | null
  ultimaUtilizacaoEm?: string | null
}

export interface ClienteDeliveryApi {
  telefone: string
  nome?: string | null
  cpf?: string | null
  clienteIdVinculado?: string | null
  enderecos?: ClienteDeliveryEnderecoApi[]
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function asStr(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

export function mapTipoEtiquetaUiParaEtiquetaDelivery(
  tipoEtiqueta?: string | null
): EtiquetaEnderecoDeliveryApi {
  const t = String(tipoEtiqueta ?? '')
    .trim()
    .toLowerCase()
  if (t === 'trabalho') return 'trabalho'
  if (t === 'outro') return 'outro'
  return 'casa'
}

function etiquetaParaTipoEtiquetaUi(etiqueta: string): string {
  const t = etiqueta.toLowerCase()
  if (t === 'trabalho') return 'trabalho'
  if (t === 'outro') return 'outro'
  return 'casa'
}

function etiquetaParaNomeMorada(etiqueta: string): string {
  const t = etiqueta.toLowerCase()
  if (t === 'trabalho') return 'Trabalho'
  if (t === 'outro') return 'Outro'
  return 'Casa Principal'
}

export function normalizarClienteDeliveryApi(raw: unknown): ClienteDeliveryApi | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const inner =
    o.data != null && typeof o.data === 'object' && !Array.isArray(o.data)
      ? (o.data as Record<string, unknown>)
      : o

  const telefone = asStr(inner.telefone)
  if (!telefone) return null

  const enderecosRaw = inner.enderecos
  const enderecos = Array.isArray(enderecosRaw)
    ? (enderecosRaw as ClienteDeliveryEnderecoApi[])
    : []

  return {
    telefone,
    nome: inner.nome != null ? asStr(inner.nome) : null,
    cpf: inner.cpf != null ? asStr(inner.cpf) : null,
    clienteIdVinculado:
      inner.clienteIdVinculado != null ? asStr(inner.clienteIdVinculado) : null,
    enderecos,
  }
}

export function enderecoDeliveryParaMoradaTelefone(
  telefoneDigitos: string,
  endereco: ClienteDeliveryEnderecoApi
): MoradaTelefone | null {
  const id = asStr(endereco.id)
  if (!id) return null

  const etiqueta = asStr(endereco.etiqueta) || 'casa'
  const estadoRaw = asStr(endereco.estado)

  const enderecoMorada: EnderecoMorada = {
    cep: asStr(endereco.cep),
    rua: asStr(endereco.rua),
    numero: asStr(endereco.numero),
    bairro: asStr(endereco.bairro),
    cidade: asStr(endereco.cidade),
    estado: estadoRaw.toUpperCase().slice(0, 2),
    complemento: asStr(endereco.complemento) || undefined,
  }

  return {
    id,
    telefone: telefoneDigitos,
    tipoEtiqueta: etiquetaParaTipoEtiquetaUi(etiqueta),
    nomeMorada: etiquetaParaNomeMorada(etiqueta),
    endereco: enderecoMorada,
  }
}

function parseUltimaUtilizacaoEm(value: unknown): number {
  if (value == null || String(value).trim() === '') return 0
  const t = new Date(String(value)).getTime()
  return Number.isFinite(t) ? t : 0
}

function ordenarEnderecosPorUtilizacaoRecente(
  enderecos: ClienteDeliveryEnderecoApi[]
): ClienteDeliveryEnderecoApi[] {
  return [...enderecos].sort(
    (a, b) =>
      parseUltimaUtilizacaoEm(b.ultimaUtilizacaoEm) -
      parseUltimaUtilizacaoEm(a.ultimaUtilizacaoEm)
  )
}

export function clienteDeliveryParaMoradas(cliente: ClienteDeliveryApi): MoradaTelefone[] {
  const telefoneDigitos = onlyDigits(cliente.telefone)
  if (!telefoneDigitos) return []

  return ordenarEnderecosPorUtilizacaoRecente(cliente.enderecos ?? [])
    .map(endereco => enderecoDeliveryParaMoradaTelefone(telefoneDigitos, endereco))
    .filter((m): m is MoradaTelefone => m != null)
}

export function moradaDtoParaEnderecoDeliveryPayload(dto: CriarMoradaTelefoneDTO) {
  const e = dto.endereco
  return {
    etiqueta: mapTipoEtiquetaUiParaEtiquetaDelivery(dto.tipoEtiqueta),
    rua: e.rua.trim(),
    numero: e.numero.trim(),
    bairro: e.bairro.trim(),
    cidade: e.cidade.trim() || null,
    estado: e.estado.trim().slice(0, 2).toUpperCase() || null,
    cep: onlyDigits(e.cep),
    complemento: e.complemento?.trim() || null,
  }
}

export function enderecoEntregaDetalheTemConteudo(
  endereco: EnderecoEntregaDetalhe | null | undefined
): boolean {
  if (!endereco) return false
  return Object.values(endereco).some(v => v != null && String(v).trim() !== '')
}

/** Converte endereço do módulo delivery (`GET /delivery/clientes`) para exibição no detalhe do pedido. */
export function enderecoDeliveryApiParaEnderecoEntregaDetalhe(
  endereco: ClienteDeliveryEnderecoApi
): EnderecoEntregaDetalhe | null {
  const mapped: EnderecoEntregaDetalhe = {
    cep: asStr(endereco.cep) || null,
    rua: asStr(endereco.rua) || null,
    numero: asStr(endereco.numero) || null,
    bairro: asStr(endereco.bairro) || null,
    cidade: asStr(endereco.cidade) || null,
    estado: asStr(endereco.estado) || null,
    complemento: asStr(endereco.complemento) || null,
  }
  return enderecoEntregaDetalheTemConteudo(mapped) ? mapped : null
}

/** Primeiro endereço válido do cliente delivery (equivalente ao endereço principal). */
export function extrairEnderecoEntregaDeClienteDeliveryApi(
  cliente: ClienteDeliveryApi | null | undefined
): EnderecoEntregaDetalhe | null {
  if (!cliente?.enderecos?.length) return null
  for (const endereco of cliente.enderecos) {
    const mapped = enderecoDeliveryApiParaEnderecoEntregaDetalhe(endereco)
    if (mapped) return mapped
  }
  return null
}

/** Telefone E.164/dígitos para buscar moradas em `GET /api/delivery/clientes/{telefone}`. */
export function extrairTelefoneClienteDeliveryDeFontes(
  vendaData: Record<string, unknown>,
  clienteApi?: Record<string, unknown> | null
): string | null {
  const candidatos: unknown[] = []

  const embedded = vendaData.clienteDelivery ?? vendaData.cliente_delivery
  if (embedded && typeof embedded === 'object') {
    candidatos.push((embedded as Record<string, unknown>).telefone)
  }

  if (clienteApi) {
    candidatos.push(clienteApi.telefone, clienteApi.celular, clienteApi.phone)
  }

  const clienteNested =
    vendaData.cliente && typeof vendaData.cliente === 'object'
      ? (vendaData.cliente as Record<string, unknown>)
      : null
  if (clienteNested) {
    candidatos.push(clienteNested.telefone, clienteNested.celular)
  }

  for (const raw of candidatos) {
    const digitos = onlyDigits(asStr(raw))
    if (digitos.length >= 10) return digitos
  }

  return null
}

export function extrairMoradaDeClienteDeliveryResponse(
  raw: unknown,
  dtoFallback: CriarMoradaTelefoneDTO,
  enderecoIdHint?: string
): MoradaTelefone {
  const cliente = normalizarClienteDeliveryApi(raw)
  if (!cliente) {
    throw new Error('Resposta inválida do servidor ao salvar endereço.')
  }

  const moradas = clienteDeliveryParaMoradas(cliente)
  if (enderecoIdHint) {
    const porId = moradas.find(m => m.id === enderecoIdHint)
    if (porId) return porId
  }

  const enderecoPayload = moradaDtoParaEnderecoDeliveryPayload(dtoFallback)
  const porCampos = moradas.find(
    m =>
      onlyDigits(m.endereco?.cep ?? '') === enderecoPayload.cep &&
      asStr(m.endereco?.rua).toLowerCase() === enderecoPayload.rua.toLowerCase() &&
      asStr(m.endereco?.numero) === enderecoPayload.numero
  )
  if (porCampos) return porCampos

  if (moradas.length > 0) {
    return moradas[moradas.length - 1]
  }

  throw new Error(
    'O endereço pode ter sido salvo, mas a resposta do servidor não trouxe os dados completos. Busque de novo pelo telefone.'
  )
}

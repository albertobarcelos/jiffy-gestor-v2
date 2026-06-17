import { pagamentoEstaCancelado } from '@/src/domain/services/pedido/RegrasPagamentoPedido'
import { textoFromObservacoesApi } from '@/src/shared/helpers/observacaoPedido'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'
import type {
  DetalhesEntregaPedido,
  EnderecoEntregaDetalhe,
  TaxaEntregaDetalhe,
} from '@/src/domain/types/vendaDetalhe'

function mapEnderecoEntrega(raw: unknown): EnderecoEntregaDetalhe | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const pick = (key: string) => {
    const v = e[key]
    return v != null && String(v).trim() !== '' ? String(v).trim() : null
  }
  const mapped: EnderecoEntregaDetalhe = {
    cep: pick('cep'),
    rua: pick('rua'),
    numero: pick('numero'),
    bairro: pick('bairro'),
    cidade: pick('cidade'),
    estado: pick('estado'),
    complemento: pick('complemento'),
    referencia: pick('referencia'),
  }
  const hasAny = Object.values(mapped).some(Boolean)
  return hasAny ? mapped : null
}

/** Monta o snapshot de entrega a partir do GET de venda (gestor). */
export function mapDetalhesEntregaFromVendaApi(vendaData: Record<string, unknown>): DetalhesEntregaPedido {
  const clienteNested =
    vendaData.cliente && typeof vendaData.cliente === 'object'
      ? (vendaData.cliente as Record<string, unknown>)
      : null

  const trocoRaw = vendaData.troco
  const trocoApi =
    trocoRaw !== undefined && trocoRaw !== null && !Number.isNaN(Number(trocoRaw))
      ? Number(trocoRaw)
      : null

  return {
    entregadorId:
      vendaData.entregadorId != null ? String(vendaData.entregadorId).trim() || null : null,
    clienteNome: clienteNested?.nome != null ? String(clienteNested.nome).trim() || null : null,
    clienteCpfCnpj:
      clienteNested?.cpfCnpj != null ? String(clienteNested.cpfCnpj).trim() || null : null,
    clienteCelular: null,
    enderecoEntrega: mapEnderecoEntrega(vendaData.enderecoEntrega),
    observacaoPedido: (() => {
      const fromArray = textoFromObservacoesApi(vendaData.observacoes)
      if (fromArray) return fromArray
      if (vendaData.observacaoPedido != null) {
        return String(vendaData.observacaoPedido).trim() || null
      }
      return null
    })(),
    previsaoEntrega:
      vendaData.previsaoEntrega != null
        ? String(vendaData.previsaoEntrega)
        : null,
    dataInicioPreparo:
      vendaData.dataInicioPreparo != null ? String(vendaData.dataInicioPreparo) : null,
    dataPronto: vendaData.dataPronto != null ? String(vendaData.dataPronto) : null,
    dataSaidaEntrega:
      vendaData.dataSaidaEntrega != null ? String(vendaData.dataSaidaEntrega) : null,
    trocoApi,
  }
}

export function mergeClienteDetalhesEntrega(
  base: DetalhesEntregaPedido | null,
  clienteApi: Record<string, unknown> | null | undefined
): DetalhesEntregaPedido | null {
  if (!base && !clienteApi) return base
  const next: DetalhesEntregaPedido = { ...(base ?? {}) }

  if (clienteApi) {
    const nome = String(clienteApi.nome ?? clienteApi.name ?? '').trim()
    if (nome) next.clienteNome = nome

    const cpf = clienteApi.cpf != null ? String(clienteApi.cpf).trim() : ''
    const cnpj = clienteApi.cnpj != null ? String(clienteApi.cnpj).trim() : ''
    const cpfCnpjNested =
      clienteApi.cpfCnpj != null ? String(clienteApi.cpfCnpj).trim() : ''
    const doc = cpf || cnpj || cpfCnpjNested
    if (doc) next.clienteCpfCnpj = doc

    const tel = String(clienteApi.telefone ?? clienteApi.celular ?? '').trim()
    if (tel) next.clienteCelular = tel
  }

  return next
}

function parseNumeroTaxa(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/** Obtém `taxaEntregaId` da raiz ou `taxasLancadas[].taxaId` (tipo entrega). */
export function extrairTaxaEntregaIdDaVenda(vendaData: Record<string, unknown>): string | null {
  const direto = String(vendaData.taxaEntregaId ?? '').trim()
  if (direto) return direto

  const taxas = Array.isArray(vendaData.taxasLancadas) ? vendaData.taxasLancadas : []
  let fallbackId: string | null = null

  for (const raw of taxas) {
    if (!raw || typeof raw !== 'object') continue
    const taxa = raw as Record<string, unknown>
    const taxaId = String(taxa.taxaId ?? taxa.taxa_id ?? '').trim()
    if (!taxaId) continue

    const tipo = String(taxa.tipoTaxa ?? taxa.tipo ?? '')
      .trim()
      .toLowerCase()
    if (tipo === 'entrega') return taxaId
    if (!fallbackId) fallbackId = taxaId
  }

  return fallbackId
}

function mapTaxaEntregaSnapshotFromVenda(
  vendaData: Record<string, unknown>
): TaxaEntregaDetalhe | null {
  const taxas = Array.isArray(vendaData.taxasLancadas) ? vendaData.taxasLancadas : []
  const valorRaiz = parseNumeroTaxa(vendaData.taxaEntregaValor)

  let candidata: Record<string, unknown> | null = null
  for (const raw of taxas) {
    if (!raw || typeof raw !== 'object') continue
    const taxa = raw as Record<string, unknown>
    const tipo = String(taxa.tipoTaxa ?? taxa.tipo ?? '')
      .trim()
      .toLowerCase()
    if (tipo === 'entrega') {
      candidata = taxa
      break
    }
    if (!candidata) candidata = taxa
  }

  const taxaIdCandidata = candidata
    ? String(candidata.taxaId ?? candidata.taxa_id ?? '').trim()
    : ''
  const taxaId =
    extrairTaxaEntregaIdDaVenda(vendaData) ??
    (taxaIdCandidata ? taxaIdCandidata : null)

  if (!taxaId && valorRaiz == null && !candidata) return null

  const valorSnapshot =
    parseNumeroTaxa(candidata?.valorAplicado) ??
    parseNumeroTaxa(candidata?.valorCalculado) ??
    parseNumeroTaxa(candidata?.valor) ??
    valorRaiz

  const nomeSnapshot =
    candidata?.nomeTaxa != null
      ? String(candidata.nomeTaxa).trim() || null
      : candidata?.nome != null
        ? String(candidata.nome).trim() || null
        : null

  if (!taxaId && (valorSnapshot == null || valorSnapshot <= 0)) return null

  return {
    taxaId,
    nome: nomeSnapshot,
    valor: valorSnapshot,
  }
}

/** Resolve nome/valor da taxa via snapshot da venda ou GET `/api/taxas/{id}`. */
export async function enrichTaxaEntregaDetalhe(
  vendaData: Record<string, unknown>,
  token: string
): Promise<TaxaEntregaDetalhe | null> {
  const snapshot = mapTaxaEntregaSnapshotFromVenda(vendaData)
  const taxaId = extrairTaxaEntregaIdDaVenda(vendaData) ?? snapshot?.taxaId ?? null

  if (!taxaId && (snapshot?.valor == null || snapshot.valor <= 0)) {
    return null
  }

  const valorPersistido =
    snapshot?.valor ?? parseNumeroTaxa(vendaData.taxaEntregaValor)

  if (snapshot?.nome && valorPersistido != null && valorPersistido > 0) {
    return {
      taxaId: taxaId ?? snapshot.taxaId ?? null,
      nome: snapshot.nome,
      valor: valorPersistido,
    }
  }

  if (!taxaId) {
    return snapshot
  }

  try {
    const response = await fetch(`/api/taxas/${encodeURIComponent(taxaId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return (
        snapshot ?? {
          taxaId,
          nome: null,
          valor: valorPersistido,
        }
      )
    }

    const taxaData = await response.json()
    const nomeApi = String(taxaData.nome ?? taxaData.name ?? '').trim()
    const valorApi = parseNumeroTaxa(taxaData.valor)

    return {
      taxaId,
      nome: nomeApi || snapshot?.nome || 'Taxa de entrega',
      valor: valorPersistido ?? valorApi ?? snapshot?.valor ?? null,
    }
  } catch {
    return (
      snapshot ?? {
        taxaId,
        nome: null,
        valor: valorPersistido,
      }
    )
  }
}

/** Fallback: diferença entre valor final da venda e total dos itens (sem taxa). */
function inferirTaxaEntregaPorTotais(
  vendaData: Record<string, unknown>,
  totalDosItens: number | null | undefined,
  base: TaxaEntregaDetalhe | null
): TaxaEntregaDetalhe | null {
  if (totalDosItens == null || !Number.isFinite(totalDosItens)) return base

  const valorFinal = parseNumeroTaxa(vendaData.valorFinal)
  if (valorFinal == null || valorFinal <= totalDosItens + 0.009) return base

  const diff = Math.round((valorFinal - totalDosItens) * 100) / 100
  if (diff <= 0) return base

  return {
    taxaId: base?.taxaId ?? extrairTaxaEntregaIdDaVenda(vendaData),
    nome: base?.nome ?? 'Taxa de entrega',
    valor: diff,
  }
}

/**
 * Resolve taxa de entrega: `taxasLancadas` / `taxaEntregaId` do GET + GET taxa,
 * com fallback pela diferença valorFinal − total dos itens.
 */
export async function resolverTaxaEntregaDetalhe(
  vendaData: Record<string, unknown>,
  token: string,
  totalDosItens?: number | null
): Promise<TaxaEntregaDetalhe | null> {
  const fromApi = await enrichTaxaEntregaDetalhe(vendaData, token)
  if (taxaEntregaTemValor(fromApi)) return fromApi

  const inferida = inferirTaxaEntregaPorTotais(vendaData, totalDosItens, fromApi)
  if (taxaEntregaTemValor(inferida)) {
    const taxaId = inferida?.taxaId
    if (taxaId && !inferida?.nome?.trim()) {
      try {
        const response = await fetch(`/api/taxas/${encodeURIComponent(taxaId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        if (response.ok) {
          const taxaData = await response.json()
          const nome = String(taxaData.nome ?? taxaData.name ?? '').trim()
          if (nome) return { ...inferida, nome }
        }
      } catch {
        // mantém inferida
      }
    }
    return inferida
  }

  return fromApi
}

export type TaxaEntregaCatalogoRef = {
  id: string
  valor: number
  nome?: string | null
}

async function fetchTaxasEntregaCatalogo(token: string): Promise<TaxaEntregaCatalogoRef[]> {
  try {
    const response = await fetch('/api/taxas?limit=100&offset=0', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!response.ok) return []

    const data = (await response.json()) as { items?: unknown[] }
    const items = Array.isArray(data.items) ? data.items : []

    return items
      .map((raw): TaxaEntregaCatalogoRef | null => {
        if (!raw || typeof raw !== 'object') return null
        const taxa = raw as Record<string, unknown>
        const id = String(taxa.id ?? '').trim()
        const valor = parseNumeroTaxa(taxa.valor)
        const tipo = String(taxa.tipo ?? taxa.tipoTaxa ?? '')
          .trim()
          .toLowerCase()
        const ativo = taxa.ativo !== false && String(taxa.ativo ?? 'true').toLowerCase() !== 'false'
        if (!id || valor == null || valor <= 0 || tipo !== 'entrega' || !ativo) return null
        return {
          id,
          valor,
          nome: taxa.nome != null ? String(taxa.nome).trim() || null : null,
        }
      })
      .filter((taxa): taxa is TaxaEntregaCatalogoRef => taxa != null)
  } catch {
    return []
  }
}

/** Identifica taxa de entrega no catálogo pelo valor aplicado na venda (± R$ 0,01). */
export function identificarTaxaEntregaIdNoCatalogo(
  valorAplicado: number,
  taxas: TaxaEntregaCatalogoRef[]
): string | null {
  if (!Number.isFinite(valorAplicado) || valorAplicado <= 0) return null
  const match = taxas.find(taxa => Math.abs(taxa.valor - valorAplicado) < 0.011)
  return match?.id?.trim() || null
}

/** Valor da taxa persistida: snapshot, `totalAcrescimo` ou diferença valorFinal − itens. */
export function extrairValorTaxaEntregaAplicada(
  vendaData: Record<string, unknown>,
  totalDosItens?: number | null
): number | null {
  const snapshot = mapTaxaEntregaSnapshotFromVenda(vendaData)
  if (taxaEntregaTemValor(snapshot)) return Number(snapshot!.valor)

  const acrescimo = parseNumeroTaxa(vendaData.totalAcrescimo)
  if (acrescimo != null && acrescimo > 0) return acrescimo

  const totalItens =
    totalDosItens ?? calcularTotalDosItensResumoEntrega(vendaData)
  const inferida = inferirTaxaEntregaPorTotais(vendaData, totalItens, snapshot)
  if (taxaEntregaTemValor(inferida)) return Number(inferida!.valor)

  return null
}

/**
 * Resolve taxa de entrega para exibição no Kanban quando o GET da venda não traz `taxaEntregaId`
 * nem `taxasLancadas`: infere valor, identifica `taxaId` no catálogo e enriquece via GET `/api/taxas/{id}`.
 */
export async function resolverTaxaEntregaDetalheKanban(
  vendaData: Record<string, unknown>,
  token: string,
  taxasCatalogo?: TaxaEntregaCatalogoRef[]
): Promise<TaxaEntregaDetalhe | null> {
  const totalDosItens = calcularTotalDosItensResumoEntrega(vendaData)
  const detalheBase = await resolverTaxaEntregaDetalhe(vendaData, token, totalDosItens)
  if (detalheBase?.taxaId?.trim()) return detalheBase

  const valorAplicado =
    (taxaEntregaTemValor(detalheBase) ? detalheBase!.valor : null) ??
    extrairValorTaxaEntregaAplicada(vendaData, totalDosItens)
  if (valorAplicado == null || valorAplicado <= 0) return detalheBase

  let catalogo = taxasCatalogo ?? []
  if (catalogo.length === 0) {
    catalogo = await fetchTaxasEntregaCatalogo(token)
  }

  const taxaIdCatalogo = identificarTaxaEntregaIdNoCatalogo(valorAplicado, catalogo)
  if (!taxaIdCatalogo) {
    return (
      detalheBase ?? {
        taxaId: null,
        nome: 'Taxa de entrega',
        valor: valorAplicado,
      }
    )
  }

  return enrichTaxaEntregaDetalhe(
    {
      ...vendaData,
      taxaEntregaId: taxaIdCatalogo,
      taxaEntregaValor: valorAplicado,
    },
    token
  )
}

/**
 * Resolve valor da taxa de entrega sem requests extras (snapshot da venda + inferência por totais).
 * Ideal para quick view do Kanban, onde só o valor numérico é exibido.
 */
export function resolverTaxaEntregaValorSync(
  vendaData: Record<string, unknown>,
  totalDosItens?: number | null
): number {
  const snapshot = mapTaxaEntregaSnapshotFromVenda(vendaData)
  if (taxaEntregaTemValor(snapshot)) return Number(snapshot!.valor)

  const inferida = inferirTaxaEntregaPorTotais(vendaData, totalDosItens, snapshot)
  if (taxaEntregaTemValor(inferida)) return Number(inferida!.valor)

  return 0
}

export function formatarTaxaEntregaDetalheExibicao(
  taxa: TaxaEntregaDetalhe | null | undefined,
  formatarMoeda: (valor: number) => string
): string {
  if (!taxa) return '—'
  const valor = taxa.valor
  if (valor == null || valor <= 0) return '—'
  const nome = taxa.nome?.trim()
  if (nome) return `${nome} — ${formatarMoeda(valor)}`
  return formatarMoeda(valor)
}

export function taxaEntregaTemValor(taxa: TaxaEntregaDetalhe | null | undefined): boolean {
  return taxa != null && taxa.valor != null && taxa.valor > 0
}

export function formatarDataDetalhePedido(valor: string | null | undefined): string {
  if (!valor || String(valor).trim() === '') return '—'
  try {
    const d = new Date(valor)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function formatarHoraDetalhePedido(valor: string | null | undefined): string {
  if (!valor || String(valor).trim() === '') return '—'
  try {
    const d = new Date(valor)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

/** Hora da previsão: ISO/datetime ou minutos a partir da criação do pedido. */
export function formatarHoraPrevisaoEntrega(
  previsao: string | null | undefined,
  dataCriacao?: string | null
): string {
  if (previsao == null || String(previsao).trim() === '') return '—'

  const str = String(previsao).trim()
  const asNumber = Number(str)
  if (!Number.isNaN(asNumber) && /^\d+$/.test(str)) {
    if (dataCriacao) {
      const base = new Date(dataCriacao)
      if (!Number.isNaN(base.getTime())) {
        base.setMinutes(base.getMinutes() + asNumber)
        return formatarHoraDetalhePedido(base.toISOString())
      }
    }
    return `${asNumber}m`
  }

  return formatarHoraDetalhePedido(str)
}

/**
 * Troco que o entregador deve levar ao cliente.
 * - Pedido já pago: `troco` na raiz (pagamento efetivo acima do total).
 * - Cobrar na entrega: `totalCobrarNaEntrega − valorFaltante` (mesma regra de `VendaGestor.trocoParaLevar`).
 */
export function resolverTrocoLevarPedidoEntrega(
  vendaData: Record<string, unknown>,
  pagamentos: PagamentoSelecionado[] = []
): number {
  const trocoRaiz = Number(vendaData.troco)
  if (Number.isFinite(trocoRaiz) && trocoRaiz > 0) {
    return Math.round(trocoRaiz * 100) / 100
  }

  const valorFinal = Number(vendaData.valorFinal)
  if (!Number.isFinite(valorFinal) || valorFinal <= 0) return 0

  const pagamentosValidos = pagamentos.filter(p => !pagamentoEstaCancelado(p))
  const totalPagoSemCobranca = pagamentosValidos
    .filter(p => !p.cobrarNaEntrega && !p.naoEfetivo)
    .reduce((sum, p) => sum + (Number(p.valor) || 0), 0)

  const totalCobrarNaEntrega = pagamentosValidos
    .filter(p => p.cobrarNaEntrega || p.naoEfetivo)
    .reduce((sum, p) => sum + (Number(p.valor) || 0), 0)

  if (totalCobrarNaEntrega <= 0) return 0

  const valorFaltanteAntes = Math.max(0, valorFinal - totalPagoSemCobranca)
  const troco = totalCobrarNaEntrega - valorFaltanteAntes

  return troco > 0 ? Math.round(troco * 100) / 100 : 0
}

export function formatarEnderecoEntregaMultilinha(
  endereco: EnderecoEntregaDetalhe | null | undefined
): string[] {
  if (!endereco) return ['—']

  const linhas: string[] = []
  const ruaNumero = [endereco.rua, endereco.numero].filter(Boolean).join(', ')
  if (ruaNumero) linhas.push(ruaNumero)
  if (endereco.bairro) linhas.push(endereco.bairro)

  const cidadeUf = [endereco.cidade, endereco.estado].filter(Boolean).join(' - ')
  if (cidadeUf) linhas.push(cidadeUf)

  linhas.push(`CEP: ${endereco.cep?.trim() || ''}`)
  return linhas
}

/** Total líquido dos itens (A − cancelados) para fallback de taxa de entrega. */
export function calcularTotalDosItensResumoEntrega(vendaData: Record<string, unknown>): number {
  const vendaCancelada = Boolean(vendaData.dataCancelamento || vendaData.canceladoPorId)
  const produtosRaw = vendaData.produtosLancados || vendaData.produtos
  if (!Array.isArray(produtosRaw)) return 0

  let totalItensLancados = 0
  let totalItensCancelados = 0

  produtosRaw.forEach((raw: unknown) => {
    if (!raw || typeof raw !== 'object') return
    const prod = raw as Record<string, unknown>
    const valorUnitario = Number(prod.valorUnitario) || 0
    const quantidade = Number(prod.quantidade) || 0
    const valorBaseProduto = valorUnitario * quantidade

    const complementos = Array.isArray(prod.complementos) ? prod.complementos : []
    const valorComplementos = complementos.reduce((sum: number, compRaw: unknown) => {
      if (!compRaw || typeof compRaw !== 'object') return sum
      const comp = compRaw as Record<string, unknown>
      const tipo = String(comp.tipoImpactoPreco ?? 'nenhum').toLowerCase()
      const valorTotal =
        (Number(comp.valorUnitario ?? comp.valor) || 0) *
        (Number(comp.quantidade) || 1)
      if (tipo === 'aumenta') return sum + valorTotal
      if (tipo === 'diminui') return sum - valorTotal
      return sum
    }, 0)

    const subtotal = valorBaseProduto + valorComplementos
    const valorFinalRaw = prod.valorFinal
    const totalLinha =
      valorFinalRaw != null && !Number.isNaN(Number(valorFinalRaw))
        ? Number(valorFinalRaw)
        : subtotal

    totalItensLancados += totalLinha
    if (vendaCancelada || prod.removido) {
      totalItensCancelados += totalLinha
    }
  })

  return totalItensLancados - totalItensCancelados
}

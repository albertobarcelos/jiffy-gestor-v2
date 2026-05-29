import { formatarTelefoneBr } from '@/src/shared/utils/telefoneBr'
import { pagamentoEstaCancelado } from './novoPedidoPagamentoHelpers'
import type {
  DetalhesEntregaPedido,
  EnderecoEntregaDetalhe,
  FluxoPagamentoEntrega,
  PagamentoSelecionado,
  TaxaEntregaDetalhe,
} from './types'

type MeioPagamentoLookup = {
  getId(): string
  getNome(): string
}

export function rotuloCobrancaEntrega(fluxo: FluxoPagamentoEntrega | null | undefined): string {
  return fluxo === 'cobrar_entregador' ? 'Cobrar na entrega' : 'Já foi Pago'
}

/** Nome do meio de pagamento a partir de `pagamentos[].meioPagamentoId` (lista em memória ou mapa do GET). */
export function formatarTipoPagamentoDetalhe(
  pagamentos: PagamentoSelecionado[],
  meiosPagamento: MeioPagamentoLookup[],
  nomesMeiosPorId: Record<string, string>
): string {
  const comMeio = pagamentos.filter(p => String(p.meioPagamentoId ?? '').trim())
  const preferidos = comMeio.filter(p => !pagamentoEstaCancelado(p))
  const base = preferidos.length > 0 ? preferidos : comMeio

  const nomesUnicos: string[] = []
  const idsVistos = new Set<string>()

  for (const pag of base) {
    const meioId = String(pag.meioPagamentoId).trim()
    if (idsVistos.has(meioId)) continue
    idsVistos.add(meioId)

    const meioLista = meiosPagamento.find(m => m.getId() === meioId)
    const nome =
      meioLista?.getNome()?.trim() || nomesMeiosPorId[meioId]?.trim() || ''
    if (nome) nomesUnicos.push(nome)
  }

  return nomesUnicos.length > 0 ? nomesUnicos.join(', ') : '—'
}

export function formatarCpfCnpjExibicao(valor: string | null | undefined): string {
  const digits = String(valor ?? '').replace(/\D/g, '')
  if (!digits) return '—'
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return String(valor).trim() || '—'
}

export function formatarCelularExibicao(valor: string | null | undefined): string {
  const digits = String(valor ?? '').replace(/\D/g, '')
  if (!digits) return '—'
  return formatarTelefoneBr(digits)
}

export function formatarEnderecoEntregaCompleto(
  endereco: EnderecoEntregaDetalhe | null | undefined
): string {
  if (!endereco) return '—'

  const partes: string[] = []
  const ruaNumero = [endereco.rua, endereco.numero].filter(Boolean).join(', ')
  if (ruaNumero) partes.push(ruaNumero)
  if (endereco.bairro) partes.push(endereco.bairro)
  const cidadeUf = [endereco.cidade, endereco.estado].filter(Boolean).join(' - ')
  if (cidadeUf) partes.push(cidadeUf)
  if (endereco.cep) partes.push(`CEP ${endereco.cep}`)
  if (endereco.complemento) partes.push(endereco.complemento)
  if (endereco.referencia) partes.push(`Ref.: ${endereco.referencia}`)

  return partes.length > 0 ? partes.join(' · ') : '—'
}

export function formatarPrevisaoEntregaExibicao(
  valor: string | Date | null | undefined,
  formatarData: (v: string | null | undefined) => string
): string {
  if (valor == null || String(valor).trim() === '') return '—'
  if (valor instanceof Date) {
    return formatarData(valor.toISOString())
  }
  const str = String(valor).trim()
  const asNumber = Number(str)
  if (!Number.isNaN(asNumber) && /^\d+$/.test(str)) {
    return `${asNumber} min`
  }
  return formatarData(str)
}

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
    observacaoPedido:
      vendaData.observacaoPedido != null
        ? String(vendaData.observacaoPedido).trim() || null
        : null,
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

export function formatarTaxaEntregaDetalheExibicao(
  taxa: TaxaEntregaDetalhe | null | undefined,
  formatarMoeda: (valor: number) => string
): string {
  if (!taxa) return '—'
  const valor = taxa.valor
  if (valor == null || valor <= 0) return '—'
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
        (Number(comp.quantidade) || 1) *
        quantidade
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

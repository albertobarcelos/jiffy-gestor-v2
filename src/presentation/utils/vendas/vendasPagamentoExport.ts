import type {
  VendaListItem,
  VendaListPagamentoItem,
  VendaListTaxaLancadaItem,
} from './vendasListTypes'
import { calcularQuantidadeProdutosVendidosDetalhe } from './vendasListCalculos'

const EXPORT_PAGAMENTOS_CONCORRENCIA = 8

export interface VendaDetalheExport {
  pagamentos: VendaListPagamentoItem[]
  quantidadeProdutos: number
  taxasLancadas: VendaListTaxaLancadaItem[]
}

function extrairNomeMeioPagamentoApi(raw: Record<string, unknown>): string | undefined {
  if (typeof raw.meioPagamentoNome === 'string' && raw.meioPagamentoNome.trim()) {
    return raw.meioPagamentoNome.trim()
  }

  const meioAninhado = raw.meioPagamento
  if (meioAninhado && typeof meioAninhado === 'object') {
    const nome = (meioAninhado as Record<string, unknown>).nome
    if (typeof nome === 'string' && nome.trim()) return nome.trim()
  }

  return undefined
}

function mapearPagamentoApiRow(raw: Record<string, unknown>): VendaListPagamentoItem {
  const meioAninhado =
    raw.meioPagamento && typeof raw.meioPagamento === 'object'
      ? (raw.meioPagamento as Record<string, unknown>)
      : undefined

  const meioPagamentoId = String(raw.meioPagamentoId ?? meioAninhado?.id ?? '')

  return {
    meioPagamentoId,
    meioPagamentoNome: extrairNomeMeioPagamentoApi(raw),
    valor: Number(raw.valor) || 0,
    cancelado: raw.cancelado === true,
    dataCancelamento:
      raw.dataCancelamento != null ? String(raw.dataCancelamento) : undefined,
    isTefUsed: raw.isTefUsed === true,
    isTefConfirmed:
      raw.isTefConfirmed === true
        ? true
        : raw.isTefConfirmed === false
          ? false
          : undefined,
  }
}

/** Mesma regra da tela de detalhes: oculta TEF pendente em pagamento ativo. */
export function pagamentoValidoParaRelatorio(pagamento: VendaListPagamentoItem): boolean {
  const isCancelado =
    pagamento.cancelado === true ||
    (pagamento.dataCancelamento != null && pagamento.dataCancelamento !== '')

  if (pagamento.isTefUsed === true && !isCancelado) {
    return pagamento.isTefConfirmed === true
  }

  return !isCancelado
}

function formatarMoedaRelatorio(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

function obterNomeMeioPagamento(
  pagamento: VendaListPagamentoItem,
  meiosPagamentoPorId: Map<string, string>
): string {
  if (pagamento.meioPagamentoNome?.trim()) {
    return pagamento.meioPagamentoNome.trim()
  }

  const nomeMapa = meiosPagamentoPorId.get(pagamento.meioPagamentoId)
  if (nomeMapa) return nomeMapa

  return 'Meio não encontrado'
}

function agruparPagamentosPorMeio(
  pagamentos: VendaListPagamentoItem[],
  meiosPagamentoPorId: Map<string, string>
): Array<{ meioPagamentoId: string; nome: string; total: number }> {
  const grupos = new Map<string, { nome: string; total: number }>()

  for (const pagamento of pagamentos) {
    const nome = obterNomeMeioPagamento(pagamento, meiosPagamentoPorId)
    const existente = grupos.get(pagamento.meioPagamentoId)
    if (existente) {
      existente.total += pagamento.valor
    } else {
      grupos.set(pagamento.meioPagamentoId, { nome, total: pagamento.valor })
    }
  }

  return Array.from(grupos.entries()).map(([meioPagamentoId, grupo]) => ({
    meioPagamentoId,
    nome: grupo.nome,
    total: grupo.total,
  }))
}

function normalizarFallbackMetodoPagamento(metodoPagamento?: string): string {
  if (!metodoPagamento?.trim()) return '—'
  const partes = metodoPagamento
    .split(/[\n,;|]+/)
    .map(parte => parte.trim())
    .filter(Boolean)
  if (partes.length === 0) return '—'

  const unicos: string[] = []
  const vistos = new Set<string>()
  for (const parte of partes) {
    const chave = parte.toLowerCase()
    if (!vistos.has(chave)) {
      vistos.add(chave)
      unicos.push(parte)
    }
  }

  return unicos.length === 1 ? unicos[0] : unicos.join('\n')
}

export function formatarFormasPagamentoCelulaExport(
  pagamentos: VendaListPagamentoItem[] | undefined,
  meiosPagamentoPorId: Map<string, string>,
  fallbackMetodoPagamento?: string
): string {
  const validos = (pagamentos ?? []).filter(pagamentoValidoParaRelatorio)

  if (validos.length > 0) {
    const grupos = agruparPagamentosPorMeio(validos, meiosPagamentoPorId)

    if (grupos.length === 1) {
      return grupos[0].nome
    }

    return grupos.map(grupo => `${grupo.nome} — ${formatarMoedaRelatorio(grupo.total)}`).join('\n')
  }

  return normalizarFallbackMetodoPagamento(fallbackMetodoPagamento)
}

function mapearTaxaLancadaApiRow(raw: Record<string, unknown>): VendaListTaxaLancadaItem {
  return {
    nome: String(raw.nome ?? 'Taxa'),
    tipo: String(raw.tipo ?? ''),
    valor: Number(raw.valor) || 0,
    quantidade: Number(raw.quantidade) || 1,
    valorCalculado: Number(raw.valorCalculado) || 0,
    dataRemocao: raw.dataRemocao != null ? String(raw.dataRemocao) : undefined,
  }
}

async function buscarDetalheVendaExport(
  vendaId: string,
  token: string
): Promise<VendaDetalheExport> {
  const response = await fetch(`/api/vendas/${vendaId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    return { pagamentos: [], quantidadeProdutos: 0, taxasLancadas: [] }
  }

  const data = (await response.json()) as {
    pagamentos?: unknown[]
    produtosLancados?: unknown[]
    produtos?: unknown[]
    taxasLancadas?: unknown[]
  }

  const produtos = Array.isArray(data.produtosLancados)
    ? data.produtosLancados
    : Array.isArray(data.produtos)
      ? data.produtos
      : []

  const pagamentos = Array.isArray(data.pagamentos)
    ? data.pagamentos
        .map(item => mapearPagamentoApiRow(item as Record<string, unknown>))
        .filter(p => p.meioPagamentoId)
    : []

  const taxasLancadas = Array.isArray(data.taxasLancadas)
    ? data.taxasLancadas.map(item => mapearTaxaLancadaApiRow(item as Record<string, unknown>))
    : []

  return {
    pagamentos,
    quantidadeProdutos: calcularQuantidadeProdutosVendidosDetalhe(produtos),
    taxasLancadas,
  }
}

async function executarPool<T>(
  itens: T[],
  concorrencia: number,
  tarefa: (item: T, indice: number) => Promise<void>
): Promise<void> {
  if (itens.length === 0) return

  let indice = 0
  const workers = Array.from({ length: Math.min(concorrencia, itens.length) }, async () => {
    while (indice < itens.length) {
      const atual = indice
      indice += 1
      await tarefa(itens[atual], atual)
    }
  })

  await Promise.all(workers)
}

/**
 * Carrega pagamentos, quantidade de produtos e taxas via GET /api/vendas/:id (a listagem não inclui).
 */
export async function buscarDetalhesVendasParaExport(input: {
  vendas: VendaListItem[]
  token: string
  onProgress?: (processadas: number, total: number) => void
}): Promise<{
  pagamentosPorVendaId: Map<string, VendaListPagamentoItem[]>
  quantidadeProdutosPorVendaId: Map<string, number>
  taxasLancadasPorVendaId: Map<string, VendaListTaxaLancadaItem[]>
}> {
  const { vendas, token, onProgress } = input
  const pagamentosPorVendaId = new Map<string, VendaListPagamentoItem[]>()
  const quantidadeProdutosPorVendaId = new Map<string, number>()
  const taxasLancadasPorVendaId = new Map<string, VendaListTaxaLancadaItem[]>()
  let processadas = 0

  await executarPool(vendas, EXPORT_PAGAMENTOS_CONCORRENCIA, async venda => {
    const detalhe = await buscarDetalheVendaExport(venda.id, token)
    pagamentosPorVendaId.set(venda.id, detalhe.pagamentos)
    quantidadeProdutosPorVendaId.set(venda.id, detalhe.quantidadeProdutos)
    taxasLancadasPorVendaId.set(venda.id, detalhe.taxasLancadas)
    processadas += 1
    onProgress?.(processadas, vendas.length)
  })

  return { pagamentosPorVendaId, quantidadeProdutosPorVendaId, taxasLancadasPorVendaId }
}

/** @deprecated Use buscarDetalhesVendasParaExport */
export async function buscarPagamentosPorVendas(input: {
  vendas: VendaListItem[]
  token: string
  onProgress?: (processadas: number, total: number) => void
}): Promise<Map<string, VendaListPagamentoItem[]>> {
  const { pagamentosPorVendaId } = await buscarDetalhesVendasParaExport(input)
  return pagamentosPorVendaId
}

async function buscarNomeMeioPagamentoPorId(
  meioPagamentoId: string,
  token: string
): Promise<string | null> {
  const response = await fetch(`/api/meios-pagamentos/${meioPagamentoId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) return null

  const data = (await response.json()) as { nome?: string; name?: string }
  const nome = data.nome ?? data.name
  return typeof nome === 'string' && nome.trim() ? nome.trim() : null
}

/**
 * Completa nomes ausentes no mapa (ex.: meio inativo, não carregado na listagem).
 * A tela de vendas só busca meios com `ativo=true`.
 */
export async function enriquecerMeiosPagamentoParaExport(
  meiosPagamentoPorId: Map<string, string>,
  pagamentosPorVendaId: Map<string, VendaListPagamentoItem[]>,
  token: string
): Promise<Map<string, string>> {
  const enriquecido = new Map(meiosPagamentoPorId)
  const idsPendentes = new Set<string>()

  for (const pagamentos of pagamentosPorVendaId.values()) {
    for (const pagamento of pagamentos) {
      if (!pagamento.meioPagamentoId) continue
      if (pagamento.meioPagamentoNome?.trim()) {
        enriquecido.set(pagamento.meioPagamentoId, pagamento.meioPagamentoNome.trim())
        continue
      }
      if (!enriquecido.has(pagamento.meioPagamentoId)) {
        idsPendentes.add(pagamento.meioPagamentoId)
      }
    }
  }

  await executarPool(Array.from(idsPendentes), EXPORT_PAGAMENTOS_CONCORRENCIA, async meioId => {
    const nome = await buscarNomeMeioPagamentoPorId(meioId, token)
    if (nome) {
      enriquecido.set(meioId, nome)
    }
  })

  return enriquecido
}

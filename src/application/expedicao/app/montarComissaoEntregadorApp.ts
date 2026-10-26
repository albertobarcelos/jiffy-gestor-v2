import {
  mapRelatorioEntregasDetalhe,
  mapRelatorioEntregasVenda,
  type RelatorioEntregasVendaDTO,
} from '@/src/application/dto/RelatorioEntregasDTO'

export type ComissaoEntregadorApp = {
  totalTaxas: number
  quantidade: number
  itens: Array<{
    id: string
    codigoVenda: string
    numeroVenda: number | null
    clienteNome: string | null
    taxaEntrega: number | null
    valorFinal: number
    dataFinalizacao: string | null
  }>
}

function objeto(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
}

function vendasDoRelatorio(raw: Record<string, unknown>): RelatorioEntregasVendaDTO[] {
  const vendas = objeto(raw.vendas)
  const lista = Array.isArray(vendas?.items)
    ? vendas.items
    : Array.isArray(raw.items)
      ? raw.items
      : []
  return lista
    .map(mapRelatorioEntregasVenda)
    .filter((item): item is RelatorioEntregasVendaDTO => item !== null)
}

/** Garante `entregador.id` para o mapper do relatório (algumas respostas só mandam o id na URL). */
export function comEntregadorNoRelatorio(
  raw: Record<string, unknown>,
  entregadorId: string
): Record<string, unknown> {
  const atual = objeto(raw.entregador)
  const idAtual = String(atual?.id ?? '').trim()
  if (idAtual) return raw
  return {
    ...raw,
    entregador: {
      ...(atual ?? {}),
      id: entregadorId,
      nome: atual?.nome ?? raw.nomeEntregador ?? raw.nome ?? null,
    },
  }
}

/** Teto do GET detalhe `/relatorios/entregadores/:id/entregas` (validação: ≤ 50). */
export const LIMITE_PAGINA_COMISSAO_ENTREGADOR = 50

export function hasNextPaginaComissaoRelatorio(raw: Record<string, unknown>): boolean | undefined {
  const vendas = objeto(raw.vendas)
  return typeof vendas?.hasNext === 'boolean' ? vendas.hasNext : undefined
}

export function deveBuscarProximaPaginaComissao(input: {
  itensNaPagina: number
  limit: number
  hasNext?: boolean
}): boolean {
  if (input.hasNext === false) return false
  if (input.hasNext === true) return true
  return input.itensNaPagina >= input.limit
}

export function juntarPaginasComissaoEntregador(
  paginas: ComissaoEntregadorApp[]
): ComissaoEntregadorApp {
  if (paginas.length === 0) {
    return { itens: [], quantidade: 0, totalTaxas: 0 }
  }
  const vistos = new Set<string>()
  const itens: ComissaoEntregadorApp['itens'] = []
  for (const pagina of paginas) {
    for (const item of pagina.itens) {
      if (vistos.has(item.id)) continue
      vistos.add(item.id)
      itens.push(item)
    }
  }
  const primeira = paginas[0]
  const somaItens = itens.reduce((acc, item) => acc + (item.taxaEntrega ?? 0), 0)
  return {
    itens,
    quantidade: Math.max(primeira.quantidade, itens.length),
    totalTaxas: primeira.totalTaxas > 0 ? primeira.totalTaxas : Math.round(somaItens * 100) / 100,
  }
}

export function montarComissaoEntregadorApp(
  raw: Record<string, unknown>,
  entregadorId: string
): ComissaoEntregadorApp {
  const detalhe = mapRelatorioEntregasDetalhe(comEntregadorNoRelatorio(raw, entregadorId))
  const itensFonte =
    detalhe && detalhe.vendas.items.length > 0 ? detalhe.vendas.items : vendasDoRelatorio(raw)
  const itens = itensFonte.map(venda => ({
    id: venda.id,
    codigoVenda: venda.codigoVenda,
    numeroVenda: venda.numeroVenda,
    clienteNome: venda.nomeCliente,
    taxaEntrega: venda.taxaEntrega,
    valorFinal: venda.valorFinal,
    dataFinalizacao: venda.dataFinalizacao,
  }))
  const somaItens = itens.reduce((acc, item) => acc + (item.taxaEntrega ?? 0), 0)
  return {
    totalTaxas: detalhe?.somaTaxasEntrega || somaItens,
    quantidade: detalhe?.countEntregasParticipadas || itens.length,
    itens,
  }
}

import type { VendaListItem, VendaListTaxaLancadaItem } from './vendasListTypes'

export function calcularValorCanceladoVenda(venda: VendaListItem): number {
  const totalRemovidos = Number(venda.totalValorProdutosRemovidos) || 0
  const valorFinal = Number(venda.valorFinal) || 0

  if (venda.dataCancelamento) {
    return totalRemovidos + valorFinal
  }

  if (venda.dataFinalizacao && !venda.dataCancelamento && totalRemovidos > 0) {
    return totalRemovidos
  }

  return 0
}

export function calcularTotalCanceladoLista(vendas: VendaListItem[]): number {
  return vendas.reduce((total, v) => total + calcularValorCanceladoVenda(v), 0)
}

export function obterStatusVendaLabel(venda: VendaListItem): string {
  if (venda.dataCancelamento) return 'Cancelada'
  if (venda.dataFinalizacao) return 'Finalizada'
  return 'Aberta'
}

export function obterTipoVendaLabel(venda: VendaListItem): string {
  switch (venda.tipoVenda) {
    case 'mesa':
      return venda.numeroMesa != null ? `Mesa ${venda.numeroMesa}` : 'Mesa'
    case 'balcao':
      return 'Balcão'
    case 'gestor':
      return 'Gestor'
    default:
      return String(venda.tipoVenda ?? '')
  }
}

export function formatarDataHoraRelatorio(dateString: string | undefined): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatarDataHoraRelatorioNoFuso(
  dateString: string | undefined,
  timeZoneEmpresa: string
): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  const tz = timeZoneEmpresa.trim() || 'America/Sao_Paulo'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  })
}

/** Soma `quantidade` dos produtos não removidos (mesma regra das métricas do backend). */
export function calcularQuantidadeProdutosVendidosDetalhe(produtos: unknown[]): number {
  return produtos.reduce((total, item) => {
    const produto = item as Record<string, unknown>
    if (produto.removido === true) return total
    return total + (Number(produto.quantidade) || 0)
  }, 0)
}

function tipoTaxaEhPercentual(tipo: unknown): boolean {
  const normalizado = String(tipo ?? '')
    .trim()
    .toLowerCase()
  return normalizado === 'percentual' || normalizado === 'porcentagem' || normalizado === 'percent'
}

/** Taxas ativas (não removidas), alinhado ao resumo em DetalhesVendas. */
export function filtrarTaxasLancadasAtivas(
  taxas: VendaListTaxaLancadaItem[]
): VendaListTaxaLancadaItem[] {
  return taxas.filter(taxa => !taxa.dataRemocao?.trim())
}

export function calcularTotalTaxasLancadasAtivas(taxas: VendaListTaxaLancadaItem[]): number {
  return filtrarTaxasLancadasAtivas(taxas).reduce(
    (total, taxa) => total + (Number(taxa.valorCalculado) || 0),
    0
  )
}

export function formatarTaxasLancadasCelulaExport(taxas: VendaListTaxaLancadaItem[] | undefined): string {
  const ativas = filtrarTaxasLancadasAtivas(taxas ?? [])
  if (ativas.length === 0) return '—'

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

  return ativas
    .map(taxa => {
      const qtd = Number(taxa.quantidade) || 1
      const valorUnit = Number(taxa.valor) || 0
      const total = Number(taxa.valorCalculado) || 0
      const textoUnitario = tipoTaxaEhPercentual(taxa.tipo)
        ? `${Math.round(valorUnit * 100)}%`
        : formatarMoeda(valorUnit)

      if (ativas.length === 1 && qtd === 1) {
        return `${taxa.nome} — ${formatarMoeda(total)}`
      }

      return `${qtd}x ${taxa.nome} (${textoUnitario}) — ${formatarMoeda(total)}`
    })
    .join('\n')
}

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

export type TipoVendaIconeRelatorio =
  | 'mesa'
  | 'balcao'
  | 'gestor'
  | 'entrega'
  | 'retirada'
  | 'delivery'

export function tipoVendaIconeRelatorio(
  venda: Pick<VendaListItem, 'tipoVenda' | 'tipoEntrega' | 'tabelaOrigem' | 'numeroMesa'>
): TipoVendaIconeRelatorio {
  if (venda.tipoEntrega === 'retirada' || venda.tipoEntrega === 'entrega') {
    return venda.tipoEntrega
  }
  const tipo = String(venda.tipoVenda ?? '').trim().toLowerCase()
  if (tipo === 'delivery') {
    return 'delivery'
  }
  if (tipo === 'mesa' || tipo === 'balcao' || tipo === 'gestor' || tipo === 'entrega' || tipo === 'retirada') {
    return tipo
  }
  if (venda.tabelaOrigem === 'venda_gestor') {
    return 'gestor'
  }
  return venda.numeroMesa != null ? 'mesa' : 'balcao'
}

export function obterTipoVendaLabel(venda: VendaListItem): string {
  const tipo = String(tipoVendaIconeRelatorio(venda) ?? '').toLowerCase()
  switch (tipo) {
    case 'mesa':
      return venda.numeroMesa != null ? `Mesa ${venda.numeroMesa}` : 'Mesa'
    case 'balcao':
      return 'Balcão'
    case 'gestor':
      return 'Gestor'
    case 'entrega':
      return 'Entrega'
    case 'retirada':
      return 'Retirada'
    case 'delivery':
      return 'Delivery'
    default:
      return String(venda.tipoVenda ?? '')
  }
}

export function origemDeliveryExterno(origem?: string | null): boolean {
  const o = String(origem ?? '')
    .trim()
    .toUpperCase()
  return o === 'IFOOD' || o === 'AIQFOME'
}

export function vendaEhPdvRelatorio(venda: VendaListItem): boolean {
  if (venda.tabelaOrigem === 'venda') return true
  return String(venda.origem ?? '').trim().toUpperCase() === 'PDV'
}

/** Quem lançou a venda. Canal externo (iFood / Aiqfome) não tem operador da loja. */
export function nomeLancadorRelatorio(
  venda: VendaListItem,
  usuariosLojaPorId: Map<string, string>
): string {
  if (origemDeliveryExterno(venda.origem)) return '—'

  const id = String(venda.abertoPorId ?? '').trim()
  if (id && id !== '—') {
    const doCadastro = usuariosLojaPorId.get(id)
    if (doCadastro) return doCadastro
  }

  const origem = String(venda.origem ?? '')
    .trim()
    .toUpperCase()
  if (origem === 'JIFFY_DELIVERY') return '—'

  const nome = venda.abertoPorNome?.trim()
  if (!nome || nome === '—') return '—'
  return nome
}

/** Código de terminal só existe em venda PDV. */
export function codigoTerminalCelulaRelatorio(venda: VendaListItem): string {
  if (!vendaEhPdvRelatorio(venda)) return '—'
  const codigo = String(venda.codigoTerminal ?? '').trim()
  return codigo ? `#${codigo}` : '—'
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
  return produtos.reduce<number>((total, item) => {
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

  return ativas
    .map(taxa => {
      const qtd = Number(taxa.quantidade) || 1
      const valorUnit = Number(taxa.valor) || 0
      const sufixoPercentual = tipoTaxaEhPercentual(taxa.tipo)
        ? ` (${Math.round(valorUnit * 100)}%)`
        : ''

      if (qtd === 1) {
        return `${taxa.nome}${sufixoPercentual}`
      }

      return `${qtd}x ${taxa.nome}${sufixoPercentual}`
    })
    .join('\n')
}

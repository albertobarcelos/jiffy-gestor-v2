import type {
  AtorCaixaEstacaoDTO,
  EstacaoCaixaDTO,
  MovimentacaoCaixaEstacaoDTO,
  OperacaoCaixaEstacaoDTO,
  OperacaoCaixaEstacaoListaItemDTO,
  PaginationOperacaoCaixaEstacaoDTO,
  ProdutoVendidoCaixaEstacaoDTO,
  ResumoCaixaEstacaoDTO,
  ResumoFechamentoCaixaEstacaoDTO,
  ResumoOperacaoCaixaEstacaoDTO,
  ResumoPagamentosCaixaEstacaoDTO,
  StatusCaixaEstacao,
} from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import {
  OperacaoCaixaEstacao,
  type AtorOperacaoCaixaEstacao,
  type EstacaoOperacaoCaixaEstacao,
  type ProdutoVendidoOperacaoCaixaEstacao,
  type ResumoCaixaOperacaoEstacao,
  type ResumoFechamentoOperacaoCaixaEstacao,
  type ResumoOperacaoCaixaEstacao,
  type ResumoPagamentosOperacaoCaixaEstacao,
} from '@/src/domain/entities/OperacaoCaixaEstacao'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function asStatus(value: unknown): StatusCaixaEstacao {
  return value === 'fechado' ? 'fechado' : 'aberto'
}

function mapAtor(value: unknown): AtorCaixaEstacaoDTO {
  const o = isRecord(value) ? value : {}
  return {
    id: asString(o.id),
    type: asString(o.type),
    sourceReference: asString(o.sourceReference),
    nome: asString(o.nome),
  }
}

function mapEstacao(value: unknown): EstacaoCaixaDTO {
  const o = isRecord(value) ? value : {}
  return {
    id: asString(o.id),
    nome: asString(o.nome),
  }
}

function mapResumoOperacao(value: unknown): ResumoOperacaoCaixaEstacaoDTO | undefined {
  if (!isRecord(value)) return undefined
  return {
    totalProdutoBruto: asNumber(value.totalProdutoBruto),
    totalLiquido: asNumber(value.totalLiquido),
    totalDescontoProdutos: asNumber(value.totalDescontoProdutos),
    totalAcrescimoProdutos: asNumber(value.totalAcrescimoProdutos),
    totalAcrescimoVenda: asNumber(value.totalAcrescimoVenda),
    totalDescontoVenda: asNumber(value.totalDescontoVenda),
    totalTaxas: asNumber(value.totalTaxas),
    totalComplementoAumenta: asNumber(value.totalComplementoAumenta),
    totalComplementoDiminui: asNumber(value.totalComplementoDiminui),
    countVendasEfetivadas: asNumber(value.countVendasEfetivadas),
    countVendasCanceladas: asNumber(value.countVendasCanceladas),
    countProdutosVendidos: asNumber(value.countProdutosVendidos),
  }
}

function mapResumoCaixa(value: unknown): ResumoCaixaEstacaoDTO | undefined {
  if (!isRecord(value)) return undefined
  return {
    totalSuprimento: asNumber(value.totalSuprimento),
    totalSangria: asNumber(value.totalSangria),
    valorLiquidoDinheiroCaixa: asNumber(value.valorLiquidoDinheiroCaixa),
  }
}

function mapResumoPagamentos(value: unknown): ResumoPagamentosCaixaEstacaoDTO | undefined {
  if (!isRecord(value)) return undefined
  const meios = Array.isArray(value.meiosPagamento) ? value.meiosPagamento : []
  return {
    total: asNumber(value.total),
    totalLiquido: asNumber(value.totalLiquido),
    totalDinheiro: asNumber(value.totalDinheiro),
    totalTroco: asNumber(value.totalTroco),
    meiosPagamento: meios.filter(isRecord).map(m => ({
      nomeMeioPagamento: asString(m.nomeMeioPagamento),
      nomeFormaPagamentoFiscal: asString(m.nomeFormaPagamentoFiscal) || undefined,
      meioPagamentoId: asString(m.meioPagamentoId) || undefined,
      valorContabilizado: asNumber(m.valorContabilizado),
    })),
  }
}

function mapResumoFechamento(value: unknown): ResumoFechamentoCaixaEstacaoDTO | null | undefined {
  if (value == null) return null
  if (!isRecord(value)) return undefined
  return {
    valorFornecido: asNumber(value.valorFornecido),
    diferencaValorFornecidoEValorCaixa: asNumber(value.diferencaValorFornecidoEValorCaixa),
    tempoOperacaoInSeconds: asNumber(value.tempoOperacaoInSeconds),
    dataFechamento: asString(value.dataFechamento),
    fechadoPorAtor: mapAtor(value.fechadoPorAtor),
  }
}

function mapProdutos(value: unknown): ProdutoVendidoCaixaEstacaoDTO[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter(isRecord).map(p => ({
    nome: asString(p.nome),
    quantidade: asNumber(p.quantidade),
    valorLiquidoFinal: asNumber(p.valorLiquidoFinal),
  }))
}

function mapAtorDomain(value: unknown): AtorOperacaoCaixaEstacao {
  const dto = mapAtor(value)
  return { ...dto }
}

function mapEstacaoDomain(value: unknown): EstacaoOperacaoCaixaEstacao {
  const dto = mapEstacao(value)
  return { ...dto }
}

function mapResumoOperacaoDomain(value: unknown): ResumoOperacaoCaixaEstacao | undefined {
  const dto = mapResumoOperacao(value)
  return dto ? { ...dto } : undefined
}

function mapResumoCaixaDomain(value: unknown): ResumoCaixaOperacaoEstacao | undefined {
  const dto = mapResumoCaixa(value)
  return dto ? { ...dto } : undefined
}

function mapResumoPagamentosDomain(
  value: unknown
): ResumoPagamentosOperacaoCaixaEstacao | undefined {
  const dto = mapResumoPagamentos(value)
  return dto ? { ...dto, meiosPagamento: dto.meiosPagamento.map(m => ({ ...m })) } : undefined
}

function mapResumoFechamentoDomain(
  value: unknown
): ResumoFechamentoOperacaoCaixaEstacao | null | undefined {
  const dto = mapResumoFechamento(value)
  if (dto === undefined) return undefined
  if (dto === null) return null
  return { ...dto, fechadoPorAtor: { ...dto.fechadoPorAtor } }
}

function mapProdutosDomain(value: unknown): ProdutoVendidoOperacaoCaixaEstacao[] | undefined {
  const dto = mapProdutos(value)
  return dto ? dto.map(p => ({ ...p })) : undefined
}

export function mapOperacaoCaixaEstacaoToEntity(value: unknown): OperacaoCaixaEstacao | null {
  if (!isRecord(value) || !asString(value.id)) return null
  try {
    return OperacaoCaixaEstacao.create({
      id: asString(value.id),
      status: asStatus(value.status),
      empresaId: asString(value.empresaId),
      abertoPorAtor: mapAtorDomain(value.abertoPorAtor),
      estacao: mapEstacaoDomain(value.estacao),
      dataAbertura: asString(value.dataAbertura),
      dataFechamento: value.dataFechamento == null ? null : asString(value.dataFechamento),
      fechadoPorAtor: value.fechadoPorAtor == null ? null : mapAtorDomain(value.fechadoPorAtor),
      nomeEmpresa: asString(value.nomeEmpresa) || undefined,
      resumoOperacao: mapResumoOperacaoDomain(value.resumoOperacao),
      resumoCaixa: mapResumoCaixaDomain(value.resumoCaixa),
      resumoPagamentos: mapResumoPagamentosDomain(value.resumoPagamentos),
      resumoFechamento: mapResumoFechamentoDomain(value.resumoFechamento),
      totalProdutosVendidos: mapProdutosDomain(value.totalProdutosVendidos),
      totalAdicionaisVendidos: mapProdutosDomain(value.totalAdicionaisVendidos),
    })
  } catch {
    return null
  }
}

export function mapOperacaoCaixaEstacaoToDTO(
  entity: OperacaoCaixaEstacao
): OperacaoCaixaEstacaoDTO {
  return {
    id: entity.id,
    status: entity.status,
    empresaId: entity.empresaId,
    abertoPorAtor: { ...entity.abertoPorAtor },
    estacao: { ...entity.estacao },
    dataAbertura: entity.dataAbertura,
    dataFechamento: entity.dataFechamento,
    fechadoPorAtor: entity.fechadoPorAtor ? { ...entity.fechadoPorAtor } : null,
    nomeEmpresa: entity.nomeEmpresa,
    resumoOperacao: entity.resumoOperacao ? { ...entity.resumoOperacao } : undefined,
    resumoCaixa: entity.resumoCaixa ? { ...entity.resumoCaixa } : undefined,
    resumoPagamentos: entity.resumoPagamentos
      ? {
          ...entity.resumoPagamentos,
          meiosPagamento: entity.resumoPagamentos.meiosPagamento.map(m => ({ ...m })),
        }
      : undefined,
    resumoFechamento: entity.resumoFechamento
      ? {
          ...entity.resumoFechamento,
          fechadoPorAtor: { ...entity.resumoFechamento.fechadoPorAtor },
        }
      : entity.resumoFechamento,
    totalProdutosVendidos: entity.totalProdutosVendidos?.map(p => ({ ...p })),
    totalAdicionaisVendidos: entity.totalAdicionaisVendidos?.map(p => ({ ...p })),
  }
}

export function mapOperacaoCaixaEstacaoListaItemToDTO(
  entity: OperacaoCaixaEstacao
): OperacaoCaixaEstacaoListaItemDTO {
  return {
    id: entity.id,
    status: entity.status,
    empresaId: entity.empresaId,
    abertoPorAtor: { ...entity.abertoPorAtor },
    estacao: { ...entity.estacao },
    dataAbertura: entity.dataAbertura,
    dataFechamento: entity.dataFechamento,
    fechadoPorAtor: entity.fechadoPorAtor ? { ...entity.fechadoPorAtor } : null,
  }
}

export function mapOperacaoCaixaEstacaoListaItem(
  value: unknown
): OperacaoCaixaEstacaoListaItemDTO | null {
  const entity = mapOperacaoCaixaEstacaoToEntity(value)
  return entity ? mapOperacaoCaixaEstacaoListaItemToDTO(entity) : null
}

export function mapOperacaoCaixaEstacao(value: unknown): OperacaoCaixaEstacaoDTO | null {
  const entity = mapOperacaoCaixaEstacaoToEntity(value)
  return entity ? mapOperacaoCaixaEstacaoToDTO(entity) : null
}

export function mapPaginationOperacaoCaixaEstacao(
  value: unknown
): PaginationOperacaoCaixaEstacaoDTO {
  const o = isRecord(value) ? value : {}
  const items = Array.isArray(o.items) ? o.items : []
  return {
    count: asNumber(o.count),
    limit: asNumber(o.limit) || 10,
    offset: asNumber(o.offset),
    page: asNumber(o.page) || 1,
    totalPages: asNumber(o.totalPages),
    hasNext: o.hasNext === true,
    hasPrevious: o.hasPrevious === true,
    items: items
      .map(mapOperacaoCaixaEstacaoListaItem)
      .filter((item): item is OperacaoCaixaEstacaoListaItemDTO => item != null),
  }
}

export function mapMovimentacaoCaixaEstacao(value: unknown): MovimentacaoCaixaEstacaoDTO | null {
  if (!isRecord(value)) return null
  const id = asString(value.id)
  if (!id) return null
  return {
    id,
    valor: asNumber(value.valor),
    descricao: value.descricao == null ? null : asString(value.descricao),
    operacaoCaixaId: asString(value.operacaoCaixaId),
    realizadoPorAtor: mapAtor(value.realizadoPorAtor),
    dataCriacao: asString(value.dataCriacao),
  }
}

export function mapListaMovimentacoesCaixaEstacao(value: unknown): MovimentacaoCaixaEstacaoDTO[] {
  if (!Array.isArray(value)) return []
  return value
    .map(mapMovimentacaoCaixaEstacao)
    .filter((item): item is MovimentacaoCaixaEstacaoDTO => item != null)
}

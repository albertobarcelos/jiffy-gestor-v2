import type { VendaDetalheCarregadaDTO } from '@/src/application/dto/VendaDetalheCarregadaDTO'
import {
  mapDetalhesEntregaFromVendaApi,
  mergeClienteDetalhesEntrega,
  resolverTaxaEntregaDetalhe,
  taxaEntregaTemValor,
} from '@/src/application/mappers/VendaDetalheMapper'
import { mapearPagamentoDetalheVenda } from '@/src/application/mappers/VendaDetalhePagamentoMapper'
import {
  aplicarTaxaEntregaAoResumoFinanceiro,
  mapProdutosDetalheVenda,
} from '@/src/application/mappers/VendaDetalheProdutosMapper'
import {
  normalizeOrigemApi,
  normalizeStatusVenda,
  pickProdutosLancados,
  resolveStatusFiscal,
} from '@/src/application/mappers/VendaApiNormalizer'
import type { VendaGestorApiResponse } from '@/src/application/dto/api/vendaGestorApi'
import { textoFromObservacoesApi } from '@/src/shared/helpers/observacaoPedido'
import type { IVendaDetalheReadRepository } from '@/src/domain/repositories/IVendaDetalheReadRepository'
import { vendaDetalheReadRepository } from '@/src/infrastructure/api/repositories/VendaDetalheReadRepository'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'
import type {
  DetalhesEntregaPedido,
  DetalhesPedidoMeta,
  FluxoPagamentoEntrega,
  OrigemVenda,
  ResumoFiscalVenda,
} from '@/src/domain/types/vendaDetalhe'

export interface MeioPagamentoCacheItem {
  getId(): string
  getNome(): string
}

export interface CarregarVendaDetalheParams {
  vendaId: string
  tabelaOrigemVenda: 'venda' | 'venda_gestor'
  token: string
  modoVisualizacao?: boolean
  meiosPagamentoCache?: MeioPagamentoCacheItem[]
}

function mapDetalhesPedidoMeta(vendaData: Record<string, unknown>): DetalhesPedidoMeta {
  return {
    numeroVenda: (vendaData.numeroVenda as number | null | undefined) ?? null,
    codigoVenda: vendaData.codigoVenda != null ? String(vendaData.codigoVenda) : null,
    tipoVenda: vendaData.tipoVenda != null ? String(vendaData.tipoVenda) : null,
    numeroMesa: (vendaData.numeroMesa as string | number | null | undefined) ?? null,
    statusMesa: vendaData.statusMesa != null ? String(vendaData.statusMesa) : null,
    abertoPorId: vendaData.abertoPorId != null ? String(vendaData.abertoPorId) : null,
    ultimoResponsavelId:
      vendaData.ultimoResponsavelId != null ? String(vendaData.ultimoResponsavelId) : null,
    canceladoPorId: vendaData.canceladoPorId != null ? String(vendaData.canceladoPorId) : null,
    codigoTerminal: vendaData.codigoTerminal != null ? String(vendaData.codigoTerminal) : null,
    terminalId: vendaData.terminalId != null ? String(vendaData.terminalId) : null,
    identificacao: vendaData.identificacao != null ? String(vendaData.identificacao) : null,
    solicitarEmissaoFiscal:
      vendaData.solicitarEmissaoFiscal != null
        ? Boolean(vendaData.solicitarEmissaoFiscal)
        : null,
    dataCriacao: vendaData.dataCriacao != null ? String(vendaData.dataCriacao) : null,
    dataFinalizacao:
      vendaData.dataFinalizacao != null ? String(vendaData.dataFinalizacao) : null,
    dataCancelamento:
      vendaData.dataCancelamento != null ? String(vendaData.dataCancelamento) : null,
    dataUltimaModificacao:
      vendaData.dataUltimaModificacao != null ? String(vendaData.dataUltimaModificacao) : null,
    dataUltimoProdutoLancado:
      vendaData.dataUltimoProdutoLancado != null
        ? String(vendaData.dataUltimoProdutoLancado)
        : null,
  }
}

async function resolverClienteEntrega(
  repo: IVendaDetalheReadRepository,
  clienteIdVenda: string,
  token: string,
  detalhesEntrega: DetalhesEntregaPedido
): Promise<{ clienteNome: string | null; detalhesEntrega: DetalhesEntregaPedido }> {
  const clienteData = await repo.fetchCliente(clienteIdVenda, token)
  if (!clienteData) {
    return {
      clienteNome: detalhesEntrega.clienteNome ?? null,
      detalhesEntrega,
    }
  }

  const clienteNome =
    String(clienteData.nome ?? clienteData.name ?? detalhesEntrega.clienteNome ?? '').trim() ||
    null
  const detalhesAtualizados =
    mergeClienteDetalhesEntrega(detalhesEntrega, clienteData) ?? detalhesEntrega

  return { clienteNome, detalhesEntrega: detalhesAtualizados }
}

async function resolverNomeEntregador(
  repo: IVendaDetalheReadRepository,
  entregadorIdVenda: string,
  token: string,
  detalhesEntrega: DetalhesEntregaPedido
): Promise<DetalhesEntregaPedido> {
  const entregadorData = await repo.fetchUsuarioPdv(entregadorIdVenda, token)
  if (!entregadorData) return detalhesEntrega

  const nomeEntregador = String(entregadorData.nome ?? entregadorData.name ?? '').trim()
  if (!nomeEntregador) return detalhesEntrega

  return { ...detalhesEntrega, entregadorNome: nomeEntregador }
}

async function resolverNomeCliente(
  repo: IVendaDetalheReadRepository,
  clienteId: string,
  token: string
): Promise<string | null> {
  const clienteData = await repo.fetchCliente(clienteId, token)
  if (!clienteData) return null
  return String(clienteData.nome ?? clienteData.name ?? '').trim() || null
}

function mapPagamentosDetalheVenda(vendaData: Record<string, unknown>): {
  pagamentos: PagamentoSelecionado[]
  fluxoPagamentoEntrega: FluxoPagamentoEntrega
} {
  const pagamentosApi = Array.isArray(vendaData.pagamentos) ? vendaData.pagamentos : []
  const pagamentoEntregaApi =
    vendaData.pagamento && typeof vendaData.pagamento === 'object'
      ? (vendaData.pagamento as Record<string, unknown>)
      : null
  const meiosCobrancaApi = Array.isArray(pagamentoEntregaApi?.meios)
    ? (pagamentoEntregaApi.meios as Record<string, unknown>[])
    : []

  if (pagamentosApi.length > 0) {
    const pagamentosMapeados = pagamentosApi.map((pag: unknown) =>
      mapearPagamentoDetalheVenda(pag as Record<string, unknown>)
    )
    return {
      pagamentos: pagamentosMapeados,
      fluxoPagamentoEntrega: pagamentosMapeados.some(pag => pag.cobrarNaEntrega)
        ? 'cobrar_entregador'
        : 'ja_pago',
    }
  }

  if (meiosCobrancaApi.length > 0) {
    const pagamentosPrevistos = meiosCobrancaApi
      .map(meio => ({
        id: meio.id != null ? String(meio.id) : undefined,
        meioPagamentoId: String(meio.meioPagamentoId ?? meio.id ?? '').trim(),
        valor: Number(meio.valor ?? 0) || 0,
        cobrarNaEntrega: true as const,
      }))
      .filter(pag => pag.meioPagamentoId && pag.valor > 0)

    return {
      pagamentos: pagamentosPrevistos,
      fluxoPagamentoEntrega: 'cobrar_entregador',
    }
  }

  let fluxoPagamentoEntrega: FluxoPagamentoEntrega = 'ja_pago'
  if (
    pagamentoEntregaApi?.cobrarCliente === true ||
    String(pagamentoEntregaApi?.status ?? '').toLowerCase() === 'pendente'
  ) {
    fluxoPagamentoEntrega = 'cobrar_entregador'
  }

  return { pagamentos: [], fluxoPagamentoEntrega }
}

async function resolverNomesUsuarios(
  repo: IVendaDetalheReadRepository,
  idsUsuarios: Set<string>,
  tabelaOrigemVenda: 'venda' | 'venda_gestor',
  token: string
): Promise<Record<string, string>> {
  const mapUsuarios: Record<string, string> = {}

  await Promise.all(
    Array.from(idsUsuarios).map(async usuarioId => {
      const d =
        tabelaOrigemVenda === 'venda_gestor'
          ? await repo.fetchUsuarioGestor(usuarioId, token)
          : await repo.fetchUsuarioPdv(usuarioId, token)
      if (!d) return
      const nome = String(d.nome ?? d.name ?? d.username ?? '').trim()
      if (nome) mapUsuarios[usuarioId] = nome
    })
  )

  return mapUsuarios
}

async function resolverNomesMeiosPagamento(
  repo: IVendaDetalheReadRepository,
  vendaData: Record<string, unknown>,
  meiosPagamentoCache: MeioPagamentoCacheItem[],
  token: string
): Promise<Record<string, string>> {
  const mapMeios: Record<string, string> = {}
  const idsMeios = new Set<string>()

  const pagamentos = Array.isArray(vendaData.pagamentos) ? vendaData.pagamentos : []
  pagamentos.forEach((pag: unknown) => {
    const p = pag as Record<string, unknown>
    const meioId = String(p.meioPagamentoId ?? '').trim()
    if (meioId) idsMeios.add(meioId)
  })

  const pagamentoEntregaApi =
    vendaData.pagamento && typeof vendaData.pagamento === 'object'
      ? (vendaData.pagamento as Record<string, unknown>)
      : null
  const meiosCobrancaApi = Array.isArray(pagamentoEntregaApi?.meios)
    ? (pagamentoEntregaApi.meios as Record<string, unknown>[])
    : []

  meiosCobrancaApi.forEach(meio => {
    const meioId = String(meio.meioPagamentoId ?? meio.id ?? '').trim()
    if (meioId) idsMeios.add(meioId)
    if (meioId && typeof meio.nome === 'string' && meio.nome.trim()) {
      mapMeios[meioId] = meio.nome.trim()
    }
  })

  await Promise.all(
    Array.from(idsMeios).map(async meioId => {
      const meioCache = meiosPagamentoCache.find(m => m.getId() === meioId)
      if (meioCache) {
        mapMeios[meioId] = meioCache.getNome()
        return
      }

      const d = await repo.fetchMeioPagamento(meioId, token)
      if (!d) return
      const nome = String(d.nome ?? d.name ?? '').trim()
      if (nome) mapMeios[meioId] = nome
    })
  )

  return mapMeios
}

function coletarIdsUsuarios(vendaData: VendaGestorApiResponse): Set<string> {
  const idsUsuarios = new Set<string>()
  ;[vendaData.abertoPorId, vendaData.ultimoResponsavelId, vendaData.canceladoPorId].forEach(
    (id: unknown) => {
      const v = String(id || '').trim()
      if (v) idsUsuarios.add(v)
    }
  )

  pickProdutosLancados(vendaData).forEach((prod: unknown) => {
      const p = prod as Record<string, unknown>
      const lancadoPorId = String(p.lancadoPorId ?? '').trim()
      const removidoPorId = String(p.removidoPorId ?? '').trim()
      if (lancadoPorId) idsUsuarios.add(lancadoPorId)
      if (removidoPorId) idsUsuarios.add(removidoPorId)
  })

  const pagamentos = Array.isArray(vendaData.pagamentos) ? vendaData.pagamentos : []
  pagamentos.forEach((pag: unknown) => {
    const p = pag as Record<string, unknown>
    const realizadoPorId = String(p.realizadoPorId ?? '').trim()
    const canceladoPorId = String(p.canceladoPorId ?? '').trim()
    if (realizadoPorId) idsUsuarios.add(realizadoPorId)
    if (canceladoPorId) idsUsuarios.add(canceladoPorId)
  })

  return idsUsuarios
}

export class CarregarVendaDetalheUseCase {
  constructor(
    private readonly vendaDetalheRepo: IVendaDetalheReadRepository = vendaDetalheReadRepository
  ) {}

  async execute(params: CarregarVendaDetalheParams): Promise<VendaDetalheCarregadaDTO> {
    const { vendaId, tabelaOrigemVenda, token, modoVisualizacao, meiosPagamentoCache = [] } =
      params

    const vendaData = (await this.vendaDetalheRepo.loadVenda(
      vendaId,
      tabelaOrigemVenda,
      token
    )) as VendaGestorApiResponse

    const detalhesPedidoMeta = mapDetalhesPedidoMeta(vendaData)
    const resumoFiscal =
      vendaData.resumoFiscal && typeof vendaData.resumoFiscal === 'object'
        ? (vendaData.resumoFiscal as ResumoFiscalVenda)
        : null

    const origemTextoApi =
      vendaData.origem !== undefined && vendaData.origem !== null
        ? String(vendaData.origem)
        : null
    const statusVendaTextoApi =
      vendaData.statusVenda !== undefined && vendaData.statusVenda !== null
        ? String(vendaData.statusVenda)
        : null

    const origem = normalizeOrigemApi(origemTextoApi)
    const status = normalizeStatusVenda(vendaData)

    const tipoVendaCarregada = String(vendaData.tipoVenda ?? '')
      .trim()
      .toLowerCase()

    let clienteId: string | null = null
    let clienteNome: string | null = null
    let detalhesEntregaPedido: DetalhesEntregaPedido | null = null

    if (tipoVendaCarregada === 'entrega') {
      let detalhesEntrega = mapDetalhesEntregaFromVendaApi(vendaData)
      const clienteIdVenda = String(vendaData.clienteId ?? '').trim()

      if (clienteIdVenda) {
        clienteId = clienteIdVenda
        const clienteResolvido = await resolverClienteEntrega(
          this.vendaDetalheRepo,
          clienteIdVenda,
          token,
          detalhesEntrega
        )
        clienteNome = clienteResolvido.clienteNome
        detalhesEntrega = clienteResolvido.detalhesEntrega
      } else if (detalhesEntrega.clienteNome) {
        clienteNome = detalhesEntrega.clienteNome
      }

      const entregadorIdVenda = String(vendaData.entregadorId ?? '').trim()
      if (entregadorIdVenda) {
        detalhesEntrega = await resolverNomeEntregador(
          this.vendaDetalheRepo,
          entregadorIdVenda,
          token,
          detalhesEntrega
        )
      }

      detalhesEntregaPedido = detalhesEntrega
    } else if (vendaData.clienteId) {
      clienteId = String(vendaData.clienteId)
      clienteNome = await resolverNomeCliente(this.vendaDetalheRepo, clienteId, token)
    }

    const dataVenda = vendaData.dataCriacao
      ? String(vendaData.dataCriacao)
      : vendaData.dataFinalizacao
        ? String(vendaData.dataFinalizacao)
        : null

    const valorFinalVenda =
      vendaData.valorFinal !== undefined && vendaData.valorFinal !== null
        ? Number(vendaData.valorFinal)
        : null

    const df = vendaData.dataFinalizacao
    const dataFinalizacaoCarregada =
      df != null && String(df).trim() !== '' ? String(df) : null
    const vendaGestorJaCancelada = Boolean(vendaData.dataCancelamento || vendaData.canceladoPorId)

    const produtosResult = mapProdutosDetalheVenda(vendaData)
    let resumoFinanceiroDetalhes = produtosResult.resumoFinanceiroDetalhes

    if (tipoVendaCarregada === 'entrega') {
      const taxaEntrega = await resolverTaxaEntregaDetalhe(
        vendaData,
        token,
        produtosResult.totalDosItensResumo
      )
      const totalTaxasEntrega =
        taxaEntregaTemValor(taxaEntrega) && taxaEntrega?.valor != null
          ? Number(taxaEntrega.valor)
          : 0

      if (totalTaxasEntrega > 0) {
        resumoFinanceiroDetalhes = aplicarTaxaEntregaAoResumoFinanceiro(
          resumoFinanceiroDetalhes,
          totalTaxasEntrega
        )
      }

      if (taxaEntrega) {
        detalhesEntregaPedido = detalhesEntregaPedido
          ? { ...detalhesEntregaPedido, taxaEntrega }
          : { taxaEntrega }
      }
    }

    const { pagamentos, fluxoPagamentoEntrega } = mapPagamentosDetalheVenda(vendaData)

    const idsUsuarios = coletarIdsUsuarios(vendaData)
    const nomesUsuariosPedido = await resolverNomesUsuarios(
      this.vendaDetalheRepo,
      idsUsuarios,
      tabelaOrigemVenda,
      token
    )
    const nomesMeiosPagamentoPedido = await resolverNomesMeiosPagamento(
      this.vendaDetalheRepo,
      vendaData,
      meiosPagamentoCache,
      token
    )

    const statusFiscal = resolveStatusFiscal(vendaData)

    const observacaoPedidoCarregada = (() => {
      const fromEntrega = detalhesEntregaPedido?.observacaoPedido?.trim()
      if (fromEntrega) return fromEntrega
      const fromArray = textoFromObservacoesApi(vendaData.observacoes)
      if (fromArray) return fromArray
      if (vendaData.observacaoPedido != null) {
        return String(vendaData.observacaoPedido).trim() || null
      }
      return null
    })()

    return {
      origem,
      status,
      statusFiscal,
      clienteId,
      clienteNome,
      produtos: produtosResult.produtos,
      pagamentos,
      fluxoPagamentoEntrega,
      detalhesPedidoMeta,
      resumoFiscal,
      resumoFinanceiroDetalhes,
      detalhesEntregaPedido,
      nomesUsuariosPedido,
      nomesMeiosPagamentoPedido,
      dataVenda,
      valorFinalVenda,
      dataFinalizacaoCarregada,
      vendaGestorJaCancelada,
      observacaoPedido: observacaoPedidoCarregada,
      irParaStep4: Boolean(modoVisualizacao),
    }
  }
}

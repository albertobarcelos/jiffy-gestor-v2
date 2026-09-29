import type { VendaDetalheCarregadaDTO } from '@/src/application/dto/VendaDetalheCarregadaDTO'
import {
  mapDetalhesEntregaFromVendaApi,
  mergeClienteDetalhesEntrega,
  resolverEnderecoEntregaDetalhePedido,
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
import { deveUsarModuloDeliveryParaDetalhe } from '@/src/application/mappers/PedidoDeliveryDetalheAdapter'
import {
  atorUsuarioId,
  copiarNomeEntreIdsDoAtor,
  idUsuarioParaConsulta,
  idsConsultaveisDoAtor,
  nomeUsuarioDePayloadApi,
  rotuloAtorPedido,
  completarNomesAtoresPedidoDelivery,
} from '@/src/application/mappers/atorPedidoDelivery'
import { textoFromObservacoesApi } from '@/src/shared/helpers/observacaoPedido'
import type { IVendaDetalheReadRepository } from '@/src/domain/repositories/IVendaDetalheReadRepository'
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
  /** Hint do Kanban (`delivery` vs balcão) para escolher GET delivery vs gestor. */
  tipoVendaGestor?: string | null
}

function mapDetalhesPedidoMeta(vendaData: Record<string, unknown>): DetalhesPedidoMeta {
  return {
    numeroVenda: (vendaData.numeroVenda as number | null | undefined) ?? null,
    codigoVenda: vendaData.codigoVenda != null ? String(vendaData.codigoVenda) : null,
    tipoVenda: vendaData.tipoVenda != null ? String(vendaData.tipoVenda) : null,
    tipoEntrega: (() => {
      const t = String(vendaData.tipoEntrega ?? '')
        .trim()
        .toLowerCase()
      return t === 'entrega' || t === 'retirada' ? t : null
    })(),
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
    statusEtapaOperacional:
      vendaData.statusDelivery != null
        ? String(vendaData.statusDelivery)
        : vendaData.statusEtapaOperacional != null
          ? String(vendaData.statusEtapaOperacional)
          : vendaData.statusOperacional != null
            ? String(vendaData.statusOperacional)
            : null,
  }
}

async function resolverDadosEntregador(
  repo: IVendaDetalheReadRepository,
  entregadorIdVenda: string,
  token: string,
  detalhesEntrega: DetalhesEntregaPedido
): Promise<DetalhesEntregaPedido> {
  const entregadorData = await repo.fetchUsuarioPdv(entregadorIdVenda, token)
  if (!entregadorData) return detalhesEntrega

  const nomeEntregador = String(entregadorData.nome ?? entregadorData.name ?? '').trim()
  const telefoneEntregador = String(
    entregadorData.telefone ?? entregadorData.celular ?? ''
  ).trim()
  if (!nomeEntregador && !telefoneEntregador) return detalhesEntrega

  return {
    ...detalhesEntrega,
    ...(nomeEntregador ? { entregadorNome: nomeEntregador } : {}),
    ...(telefoneEntregador ? { entregadorTelefone: telefoneEntregador } : {}),
  }
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
  token: string,
  nomesEmbutidos: Record<string, string> = {}
): Promise<Record<string, string>> {
  const mapUsuarios: Record<string, string> = { ...nomesEmbutidos }

  const aliasesPorConsulta = new Map<string, string[]>()
  for (const usuarioId of idsUsuarios) {
    const consultaId = idUsuarioParaConsulta(usuarioId)
    if (!consultaId) continue
    const aliases = aliasesPorConsulta.get(consultaId) ?? []
    aliases.push(usuarioId)
    aliasesPorConsulta.set(consultaId, aliases)
  }

  await Promise.all(
    Array.from(aliasesPorConsulta.entries()).map(async ([consultaId, aliases]) => {
      const nomeJaResolvido =
        mapUsuarios[consultaId] || aliases.map(id => mapUsuarios[id]).find(Boolean) || ''
      const nome =
        nomeJaResolvido ||
        (await buscarNomeUsuarioPedido(repo, consultaId, tabelaOrigemVenda, token))
      if (!nome) return
      mapUsuarios[consultaId] = nome
      for (const alias of aliases) mapUsuarios[alias] = nome
    })
  )

  return mapUsuarios
}

async function buscarNomeUsuarioPedido(
  repo: IVendaDetalheReadRepository,
  usuarioId: string,
  tabelaOrigemVenda: 'venda' | 'venda_gestor',
  token: string
): Promise<string> {
  const tentativas =
    tabelaOrigemVenda === 'venda_gestor'
      ? [
          () => repo.fetchUsuarioGestor(usuarioId, token),
          () => repo.fetchUsuarioPdv(usuarioId, token),
        ]
      : [
          () => repo.fetchUsuarioPdv(usuarioId, token),
          () => repo.fetchUsuarioGestor(usuarioId, token),
        ]

  for (const tentar of tentativas) {
    const nome = nomeUsuarioDePayloadApi(await tentar())
    if (nome) return nome
  }
  return ''
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
  const anexar = (ator: unknown) => {
    for (const id of idsConsultaveisDoAtor(ator)) idsUsuarios.add(id)
    const unico = atorUsuarioId(ator)
    if (unico) idsUsuarios.add(unico)
  }
  const anexarId = (id: unknown) => {
    const v = String(id || '').trim()
    if (v) idsUsuarios.add(v)
  }

  ;[vendaData.abertoPorId, vendaData.ultimoResponsavelId, vendaData.canceladoPorId].forEach(
    anexarId
  )
  anexar(vendaData.abertoPor)
  anexar(vendaData.ultimoResponsavel)
  anexar(vendaData.canceladoPor)

  pickProdutosLancados(vendaData).forEach((prod: unknown) => {
      const p = prod as Record<string, unknown>
      const lancadoPorId =
        String(p.lancadoPorId ?? '').trim() || atorUsuarioId(p.lancadoPor) || ''
      const removidoPorId =
        String(p.removidoPorId ?? '').trim() || atorUsuarioId(p.removidoPor) || ''
      if (lancadoPorId) idsUsuarios.add(lancadoPorId)
      if (removidoPorId) idsUsuarios.add(removidoPorId)
      anexar(p.lancadoPor)
      anexar(p.removidoPor)
  })

  const pagamentos = Array.isArray(vendaData.pagamentos) ? vendaData.pagamentos : []
  pagamentos.forEach((pag: unknown) => {
    const p = pag as Record<string, unknown>
    anexarId(p.realizadoPorId)
    anexarId(p.canceladoPorId)
    anexar(p.realizadoPor)
    anexar(p.criadaPor)
    anexar(p.criadoPor)
    anexar(p.canceladoPor)
  })

  const cobrancas = Array.isArray(vendaData.cobrancas) ? vendaData.cobrancas : []
  cobrancas.forEach(raw => {
    if (!raw || typeof raw !== 'object') return
    const c = raw as Record<string, unknown>
    anexar(c.criadaPor)
    anexar(c.criadoPor)
    anexar(c.lancadaPor)
    anexar(c.abertaPor)
    anexar(c.canceladaPor)
    anexarId(c.criadaPorId)
    anexarId(c.criadoPorId)
    const efetivado =
      c.pagamentoEfetivado && typeof c.pagamentoEfetivado === 'object'
        ? (c.pagamentoEfetivado as Record<string, unknown>)
        : null
    anexar(efetivado?.realizadoPor)
    anexarId(efetivado?.realizadoPorId)
  })

  return idsUsuarios
}

function registrarNomeAtor(map: Record<string, string>, ator: unknown) {
  const id = atorUsuarioId(ator)
  const rotulo = rotuloAtorPedido(ator)
  if (id && rotulo) map[id] = rotulo
}

function coletarNomesAtoresEmbutidos(vendaData: VendaGestorApiResponse): Record<string, string> {
  const map: Record<string, string> = {}
  const anexar = (ator: unknown) => {
    registrarNomeAtor(map, ator)
    copiarNomeEntreIdsDoAtor(map, ator)
  }
  anexar(vendaData.abertoPor)
  anexar(vendaData.ultimoResponsavel)
  anexar(vendaData.canceladoPor)
  anexar(vendaData.cliente)

  pickProdutosLancados(vendaData).forEach(prod => {
    const p = prod as Record<string, unknown>
    anexar(p.lancadoPor)
    anexar(p.removidoPor)
  })

  const pagamentos = Array.isArray(vendaData.pagamentos) ? vendaData.pagamentos : []
  pagamentos.forEach(pag => {
    const p = pag as Record<string, unknown>
    anexar(p.realizadoPor)
    anexar(p.canceladoPor)
    anexar(p.criadaPor)
    anexar(p.criadoPor)
  })

  const cobrancas = Array.isArray(vendaData.cobrancas) ? vendaData.cobrancas : []
  cobrancas.forEach(raw => {
    if (!raw || typeof raw !== 'object') return
    const c = raw as Record<string, unknown>
    anexar(c.criadaPor)
    anexar(c.criadoPor)
    anexar(c.lancadaPor)
    anexar(c.abertaPor)
    anexar(c.canceladaPor)
    const efetivado =
      c.pagamentoEfetivado && typeof c.pagamentoEfetivado === 'object'
        ? (c.pagamentoEfetivado as Record<string, unknown>)
        : null
    anexar(efetivado?.realizadoPor)
  })

  return map
}

function propagarNomesEntreAtoresRelacionados(
  map: Record<string, string>,
  vendaData: VendaGestorApiResponse
): Record<string, string> {
  const next = { ...map }
  const atores: unknown[] = [
    vendaData.abertoPor,
    vendaData.ultimoResponsavel,
    vendaData.canceladoPor,
  ]
  pickProdutosLancados(vendaData).forEach(prod => {
    const p = prod as Record<string, unknown>
    atores.push(p.lancadoPor, p.removidoPor)
  })
  const pagamentos = Array.isArray(vendaData.pagamentos) ? vendaData.pagamentos : []
  pagamentos.forEach(pag => {
    const p = pag as Record<string, unknown>
    atores.push(p.realizadoPor, p.criadaPor, p.criadoPor, p.canceladoPor)
  })
  const cobrancas = Array.isArray(vendaData.cobrancas) ? vendaData.cobrancas : []
  cobrancas.forEach(raw => {
    if (!raw || typeof raw !== 'object') return
    const c = raw as Record<string, unknown>
    atores.push(c.criadaPor, c.criadoPor, c.lancadaPor, c.abertaPor, c.canceladaPor)
    const efetivado =
      c.pagamentoEfetivado && typeof c.pagamentoEfetivado === 'object'
        ? (c.pagamentoEfetivado as Record<string, unknown>)
        : null
    atores.push(efetivado?.realizadoPor)
  })
  for (const ator of atores) copiarNomeEntreIdsDoAtor(next, ator)
  return next
}

export class CarregarVendaDetalheUseCase {
  constructor(
    private readonly vendaDetalheRepo: IVendaDetalheReadRepository
  ) {}

  async execute(params: CarregarVendaDetalheParams): Promise<VendaDetalheCarregadaDTO> {
    const { vendaId, tabelaOrigemVenda, token, modoVisualizacao, meiosPagamentoCache = [], tipoVendaGestor } =
      params

    const preferirModuloDelivery = deveUsarModuloDeliveryParaDetalhe(
      tabelaOrigemVenda,
      tipoVendaGestor
    )

    const vendaData = (await this.vendaDetalheRepo.loadVenda(
      vendaId,
      tabelaOrigemVenda,
      token,
      {
        preferirModuloDelivery: preferirModuloDelivery,
      }
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
    const isDeliveryPedido = tipoVendaCarregada === 'delivery'

    let clienteId: string | null = null
    let clienteNome: string | null = null
    let detalhesEntregaPedido: DetalhesEntregaPedido | null = null

    if (isDeliveryPedido) {
      let detalhesEntrega = mapDetalhesEntregaFromVendaApi(vendaData)
      const clienteIdVenda = String(vendaData.clienteId ?? '').trim()
      let clienteData: Record<string, unknown> | null = null

      if (clienteIdVenda) {
        clienteId = clienteIdVenda
        clienteData = await this.vendaDetalheRepo.fetchCliente(clienteIdVenda, token)
        if (clienteData) {
          clienteNome =
            String(clienteData.nome ?? clienteData.name ?? detalhesEntrega.clienteNome ?? '').trim() ||
            null
          detalhesEntrega =
            mergeClienteDetalhesEntrega(detalhesEntrega, clienteData) ?? detalhesEntrega
        }
      } else if (detalhesEntrega.clienteNome) {
        clienteNome = detalhesEntrega.clienteNome
      }

      const enderecoResolvido = await resolverEnderecoEntregaDetalhePedido({
        vendaData: vendaData as Record<string, unknown>,
        detalhesEntrega,
        clienteApi: clienteData,
        preferirModuloDelivery,
        fetchClienteDelivery: telefone =>
          this.vendaDetalheRepo.fetchClienteDeliveryByTelefone(telefone, token),
      })
      detalhesEntrega = {
        ...detalhesEntrega,
        enderecoEntrega: enderecoResolvido.enderecoEntrega,
        clienteCpfCnpj:
          detalhesEntrega.clienteCpfCnpj?.trim() ||
          enderecoResolvido.documentoClienteDelivery ||
          null,
      }

      const entregadorIdVenda = String(vendaData.entregadorId ?? '').trim()
      const entregadorNested =
        vendaData.entregador && typeof vendaData.entregador === 'object'
          ? (vendaData.entregador as Record<string, unknown>)
          : null
      const entregadorNomeApi =
        entregadorNested?.nome != null
          ? String(entregadorNested.nome).trim() || null
          : entregadorNested?.name != null
            ? String(entregadorNested.name).trim() || null
            : null
      const entregadorTelefoneApi = String(
        entregadorNested?.telefone ?? entregadorNested?.celular ?? ''
      ).trim()
      if (entregadorNomeApi || entregadorTelefoneApi) {
        detalhesEntrega = {
          ...detalhesEntrega,
          ...(entregadorNomeApi ? { entregadorNome: entregadorNomeApi } : {}),
          ...(entregadorTelefoneApi ? { entregadorTelefone: entregadorTelefoneApi } : {}),
        }
      }
      if (entregadorIdVenda && (!detalhesEntrega.entregadorNome || !detalhesEntrega.entregadorTelefone)) {
        detalhesEntrega = await resolverDadosEntregador(
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

    if (isDeliveryPedido) {
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

    const valorFinalVendaNormalizado =
      isDeliveryPedido
        ? (resumoFinanceiroDetalhes?.totalDosItens ?? valorFinalVenda)
        : valorFinalVenda

    const { pagamentos, fluxoPagamentoEntrega } = mapPagamentosDetalheVenda(vendaData)

    const idsUsuarios = coletarIdsUsuarios(vendaData)
    const nomesEmbutidos = coletarNomesAtoresEmbutidos(vendaData)
    if (clienteId && clienteNome) nomesEmbutidos[clienteId] = clienteNome
    const nomesResolvidos = await resolverNomesUsuarios(
      this.vendaDetalheRepo,
      idsUsuarios,
      tabelaOrigemVenda,
      token,
      nomesEmbutidos
    )
    const nomesComAtoresRelacionados = propagarNomesEntreAtoresRelacionados(
      nomesResolvidos,
      vendaData
    )
    const nomesUsuariosPedido = completarNomesAtoresPedidoDelivery(
      nomesComAtoresRelacionados,
      [clienteId, vendaData.abertoPorId].filter(
        (id): id is string => Boolean(String(id ?? '').trim())
      ),
      origemTextoApi,
      clienteNome
    )
    for (const pagamento of pagamentos) {
      const id = String(pagamento.realizadoPorId ?? '').trim()
      const nome = String(pagamento.realizadoPorNome ?? '').trim()
      if (id && nome && !nomesUsuariosPedido[id]) nomesUsuariosPedido[id] = nome
    }
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
      valorFinalVenda: valorFinalVendaNormalizado,
      dataFinalizacaoCarregada,
      vendaGestorJaCancelada,
      observacaoPedido: observacaoPedidoCarregada,
      irParaStep4: Boolean(modoVisualizacao),
    }
  }
}

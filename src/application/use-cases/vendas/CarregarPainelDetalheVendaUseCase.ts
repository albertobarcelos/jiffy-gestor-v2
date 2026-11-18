import type {
  CarregarPainelDetalheVendaParams,
  CarregarPainelDetalheVendaResultDTO,
  MeioPagamentoPainelDTO,
} from '@/src/application/dto/VendaPainelDetalheDTO'
import {
  codigoTerminalDePayload,
  coletarNomesEmbutidos,
  idUsuarioParaConsulta,
  mapMeioPagamentoPainel,
  mapVendaPainelDetalheFromApi,
  nomeClienteDePayload,
  nomeEmpresaDeApi,
  nomeTerminalDeDetalhesApi,
  nomeUsuarioDePayload,
} from '@/src/application/mappers/VendaPainelDetalheMapper'
import {
  completarNomesAtoresPedidoDelivery,
  idUsuarioGestorConsultavel,
} from '@/src/application/mappers/atorPedidoDelivery'
import type { IVendaDetalheReadRepository } from '@/src/domain/repositories/IVendaDetalheReadRepository'

type UnknownRecord = Record<string, unknown>

export class CarregarPainelDetalheVendaUseCase {
  constructor(private readonly repo: IVendaDetalheReadRepository) {}

  async execute(
    params: CarregarPainelDetalheVendaParams
  ): Promise<CarregarPainelDetalheVendaResultDTO> {
    const dataUnknown = await this.repo.loadVenda(
      params.vendaId,
      params.tabelaOrigem,
      params.token,
      { incluirFiscal: true, preferirModuloDelivery: false }
    )
    const dataRaw = (dataUnknown ?? {}) as UnknownRecord

    let terminalDetalhes: UnknownRecord | null = null
    const terminalId = dataRaw.terminalId != null ? String(dataRaw.terminalId) : ''
    if (params.tabelaOrigem === 'venda' && terminalId) {
      const codigoInicial = codigoTerminalDePayload(dataRaw, null)
      if (!codigoInicial || codigoInicial === terminalId) {
        terminalDetalhes = await this.repo.fetchTerminalDetalhes(terminalId, params.token)
      }
    }

    const codigoTerminal =
      params.tabelaOrigem === 'venda'
        ? codigoTerminalDePayload(dataRaw, terminalDetalhes)
        : ''

    const venda = mapVendaPainelDetalheFromApi({
      dataRaw,
      codigoTerminal,
      tipoEntregaLista: params.tipoEntregaLista,
    })

    const nomesEmbutidos = coletarNomesEmbutidos(dataRaw)

    const userIdsToFetch = new Set<string>()
    if (venda.abertoPorId) userIdsToFetch.add(venda.abertoPorId)
    if (venda.canceladoPorId) userIdsToFetch.add(venda.canceladoPorId)
    if (venda.ultimoResponsavelId) userIdsToFetch.add(venda.ultimoResponsavelId)
    venda.produtosLancados?.forEach(p => {
      if (p.lancadoPorId) userIdsToFetch.add(p.lancadoPorId)
      if (p.removidoPorId) userIdsToFetch.add(p.removidoPorId)
    })
    venda.pagamentos?.forEach(p => {
      if (p.realizadoPorId) userIdsToFetch.add(p.realizadoPorId)
      if (p.canceladoPorId) userIdsToFetch.add(p.canceladoPorId)
    })
    venda.taxasLancadas?.forEach(t => {
      if (t.lancadoPorId) userIdsToFetch.add(t.lancadoPorId)
      if (t.removidoPorId) userIdsToFetch.add(t.removidoPorId)
    })

    const meioIdsToFetch = new Set<string>()
    venda.pagamentos?.forEach(p => {
      if (p.meioPagamentoId) meioIdsToFetch.add(p.meioPagamentoId)
    })

    const terminalIdResumo = venda.resumoFiscal?.terminalId?.trim() || null
    const empresaIdResumo = venda.resumoFiscal?.empresaId?.trim() || null

    const [userNamesResolved, meioPagamentoResolved, clientePayload, terminalRf, empresaRf] =
      await Promise.all([
        Promise.all(
          Array.from(userIdsToFetch).map(id => this.resolveUsuarioNome(id, params))
        ),
        Promise.all(
          Array.from(meioIdsToFetch).map(async id => {
            const data = await this.repo.fetchMeioPagamento(id, params.token)
            return mapMeioPagamentoPainel(id, data)
          })
        ),
        venda.clienteId
          ? this.repo.fetchCliente(venda.clienteId, params.token)
          : Promise.resolve(null),
        terminalIdResumo
          ? this.repo.fetchTerminalDetalhes(terminalIdResumo, params.token)
          : Promise.resolve(null),
        empresaIdResumo
          ? this.repo.fetchEmpresa(empresaIdResumo, params.token)
          : Promise.resolve(null),
      ])

    const finalNomesUsuarios: Record<string, string> = { ...nomesEmbutidos }
    Array.from(userIdsToFetch).forEach((id, index) => {
      const nome = userNamesResolved[index]
      if (nome) finalNomesUsuarios[id] = nome
    })

    const clienteNomeResult = nomeClienteDePayload(clientePayload)
    const idsCliente = Array.from(userIdsToFetch).filter(id => !idUsuarioGestorConsultavel(id))
    const nomesComCliente = completarNomesAtoresPedidoDelivery(
      finalNomesUsuarios,
      idsCliente,
      venda.origem,
      clienteNomeResult
    )
    for (const id of idsCliente) {
      if (!nomesComCliente[id]) nomesComCliente[id] = 'Cliente'
    }

    const finalNomesMeiosPagamento: Record<string, MeioPagamentoPainelDTO> = {}
    Array.from(meioIdsToFetch).forEach((id, index) => {
      const meio = meioPagamentoResolved[index]
      if (meio) finalNomesMeiosPagamento[id] = meio
    })

    return {
      venda,
      nomesUsuarios: nomesComCliente,
      nomesMeiosPagamento: finalNomesMeiosPagamento,
      nomeCliente: clienteNomeResult,
      nomeTerminalResumoFiscal: nomeTerminalDeDetalhesApi(terminalRf ?? {}),
      nomeEmpresaResumoFiscal: nomeEmpresaDeApi(empresaRf ?? {}),
    }
  }

  private async resolveUsuarioNome(
    usuarioId: string,
    params: CarregarPainelDetalheVendaParams
  ): Promise<string | null> {
    const consultaId = idUsuarioParaConsulta(usuarioId)
    if (!consultaId) return null

    const order =
      params.tabelaOrigem === 'venda_gestor'
        ? (['gestor', 'pdv'] as const)
        : (['pdv', 'gestor'] as const)

    for (const kind of order) {
      const data =
        kind === 'gestor'
          ? await this.repo.fetchUsuarioGestor(consultaId, params.token)
          : await this.repo.fetchUsuarioPdv(consultaId, params.token)
      const nome = nomeUsuarioDePayload(data)
      if (nome) return nome
    }
    return null
  }
}

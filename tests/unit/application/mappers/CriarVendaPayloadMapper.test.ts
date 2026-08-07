import { describe, expect, it } from 'vitest'
import {
  buildCriarVendaGestorPayload,
  mapProdutosLancadosPayload,
} from '@/src/application/mappers/CriarVendaPayloadMapper'
import type { CriarVendaGestorInputDTO } from '@/src/application/dto/CriarVendaGestorDTO'
import type { ProdutoSelecionado } from '@/src/domain/types/pedido'

function produto(over: Partial<ProdutoSelecionado> = {}): ProdutoSelecionado {
  return {
    produtoId: 'prod-1',
    nome: 'Produto',
    quantidade: 1,
    valorUnitario: 10,
    valorCatalogo: 10,
    permiteAlterarPreco: false,
    complementos: [],
    ...over,
  }
}

function baseInput(
  overrides: Partial<CriarVendaGestorInputDTO> = {}
): CriarVendaGestorInputDTO {
  return {
    tipoInicioPedido: 'balcao',
    origem: 'GESTOR',
    status: 'FINALIZADA',
    produtos: [produto()],
    pagamentos: [{ meioPagamentoId: 'mp-1', valor: 10 }],
    totalProdutos: 10,
    totalPagamentos: 10,
    totalPagamentosLancados: 10,
    tipoAtendimentoDelivery: 'retirada',
    tempoPrevistoMinutos: 0,
    pedidoComEntrega: false,
    valorTaxaEntrega: 0,
    entregaComCobrancaPeloEntregador: false,
    valorRecebido: '',
    trocoLancamento: 0,
    statusPagamentoPedido: 'pago',
    valorAPagar: 0,
    meiosPagamento: [],
    nomesMeiosPagamentoPedido: {},
    ...overrides,
  }
}

describe('CriarVendaPayloadMapper (contrato PR #115)', () => {
  it('não envia valorUnitario quando preço é o do catálogo', () => {
    const mapped = mapProdutosLancadosPayload([
      produto({ valorUnitario: 10, valorCatalogo: 10, permiteAlterarPreco: true }),
    ])
    expect(mapped[0].valorUnitario).toBeUndefined()
  })

  it('envia valorUnitario só com override e permiteAlterarPreco', () => {
    const mapped = mapProdutosLancadosPayload([
      produto({
        valorUnitario: 15.5,
        valorCatalogo: 10,
        permiteAlterarPreco: true,
      }),
    ])
    expect(mapped[0].valorUnitario).toBe(15.5)
  })

  it('não envia valorUnitario se produto não permite alterar preço', () => {
    const mapped = mapProdutosLancadosPayload([
      produto({
        valorUnitario: 15.5,
        valorCatalogo: 10,
        permiteAlterarPreco: false,
      }),
    ])
    expect(mapped[0].valorUnitario).toBeUndefined()
  })

  it('não envia valorFinal do item nem valorUnitario do complemento', () => {
    const mapped = mapProdutosLancadosPayload([
      produto({
        complementos: [
          {
            id: 'comp-1',
            grupoId: 'g-1',
            nome: 'Extra',
            valor: 2,
            quantidade: 1,
          },
        ],
      }),
    ])
    expect(mapped[0]).not.toHaveProperty('valorFinal')
    expect(mapped[0].complementos?.[0]).toEqual({
      complementoId: 'comp-1',
      grupoComplementoId: 'g-1',
      quantidade: 1,
    })
  })

  it('não envia totais inventados na raiz do create', () => {
    const payload = buildCriarVendaGestorPayload(baseInput())
    expect(payload.valorFinal).toBeUndefined()
    expect(payload.totalDesconto).toBeUndefined()
    expect(payload.totalAcrescimo).toBeUndefined()
    expect(payload.produtosLancados).toHaveLength(1)
  })
})

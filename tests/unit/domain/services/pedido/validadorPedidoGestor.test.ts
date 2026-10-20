import { describe, expect, it } from 'vitest'
import {
  validarInformacoesPedidoEntrega,
  validarPedidoGestor,
  type ValidarPedidoGestorInput,
} from '@/src/domain/services/pedido/ValidadorPedidoGestor'

const base = {
  pedidoDeliveryGestor: true,
  clienteEntregaVinculadoId: 'cli-1',
  pedidoComEntrega: true,
  temEnderecoEntrega: true,
}

describe('validarInformacoesPedidoEntrega', () => {
  it('não bloqueia o wizard por falta de pin', () => {
    expect(
      validarInformacoesPedidoEntrega({
        ...base,
        enderecoEntregaTemGeo: false,
        enderecoEntregaCoberturaStatus: 'ok',
      })
    ).toBeNull()
  })

  it('bloqueia avançar quando o endereço está fora da cobertura', () => {
    const erro = validarInformacoesPedidoEntrega({
      ...base,
      enderecoEntregaTemGeo: true,
      enderecoEntregaCoberturaStatus: 'fora',
    })
    expect(erro?.code).toBe('cobertura')
    expect(erro?.goToStep).toBe(2)
    expect(erro?.message).toMatch(/fora da área de cobertura/i)
  })

  it('não libera Pagamento com taxa de catálogo se estiver fora da cobertura', () => {
    expect(
      validarInformacoesPedidoEntrega({
        ...base,
        enderecoEntregaCoberturaStatus: 'fora',
        taxaEntregaOverride: 'catalogo',
      })?.code
    ).toBe('cobertura')
  })

  it('bloqueia Pagamento enquanto a taxa automática está calculando', () => {
    expect(
      validarInformacoesPedidoEntrega({
        ...base,
        enderecoEntregaTemGeo: true,
        enderecoEntregaCoberturaStatus: 'pendente',
        taxaEntregaOverride: 'automatica',
      })?.message
    ).toMatch(/aguarde o cálculo da taxa/i)
  })

  it('libera Pagamento se o atendente escolher outra taxa durante o cálculo', () => {
    expect(
      validarInformacoesPedidoEntrega({
        ...base,
        enderecoEntregaTemGeo: true,
        enderecoEntregaCoberturaStatus: 'pendente',
        taxaEntregaOverride: 'catalogo',
      })
    ).toBeNull()

    expect(
      validarInformacoesPedidoEntrega({
        ...base,
        enderecoEntregaTemGeo: true,
        enderecoEntregaCoberturaStatus: 'pendente',
        taxaEntregaOverride: 'sem_taxa',
      })
    ).toBeNull()
  })

  it('ainda exige cliente e endereço de entrega', () => {
    expect(
      validarInformacoesPedidoEntrega({
        pedidoDeliveryGestor: true,
        pedidoComEntrega: true,
        temEnderecoEntrega: true,
      })?.message
    ).toMatch(/cliente/i)

    expect(
      validarInformacoesPedidoEntrega({
        pedidoDeliveryGestor: true,
        telefoneClienteDelivery: '65992934536',
        pedidoComEntrega: true,
        temEnderecoEntrega: true,
      })?.message
    ).toMatch(/cliente nesta empresa/i)

    expect(
      validarInformacoesPedidoEntrega({
        pedidoDeliveryGestor: true,
        clienteEntregaVinculadoId: 'cli-1',
        pedidoComEntrega: true,
        temEnderecoEntrega: false,
      })?.message
    ).toMatch(/endereço de entrega/i)
  })
})

function basePedidoEntrega(
  overrides: Partial<ValidarPedidoGestorInput> = {}
): ValidarPedidoGestorInput {
  return {
    produtosCount: 1,
    produtos: [
      {
        produtoId: 'prod-1',
        quantidade: 1,
        valorUnitario: 71,
        valorCatalogo: 71,
        permiteAlterarPreco: false,
        valorDesconto: null,
        valorAcrescimo: null,
        tipoDesconto: null,
        tipoAcrescimo: null,
        complementos: [],
      },
    ],
    pedidoDeliveryGestor: true,
    clienteEntregaVinculadoId: 'cli-1',
    pedidoComEntrega: true,
    temEnderecoEntrega: true,
    enderecoEntregaCoberturaStatus: 'ok',
    taxaEntregaOverride: 'automatica',
    pedidoGestorComPagamentoNoPasso3: true,
    pedidoEntregaAceitaPagamentoPendente: true,
    pagamentosCount: 1,
    entregaComCobrancaPeloEntregador: true,
    pedidoComRetirada: false,
    totalProdutos: 76,
    totalPagamentos: 0,
    troco: 0,
    status: 'ABERTA',
    pagamentos: [
      {
        meioPagamentoId: 'mp-1',
        valor: 76,
        cobrarNaEntrega: true,
        naoEfetivo: true,
      },
    ],
    ...overrides,
  }
}

describe('validarPedidoGestor — entregador vai cobrar', () => {
  it('libera quando o valor lançado fecha o total', () => {
    expect(validarPedidoGestor(basePedidoEntrega()).podeSubmeter).toBe(true)
  })

  it('bloqueia quando o valor lançado é menor que o total', () => {
    const resultado = validarPedidoGestor(
      basePedidoEntrega({
        pagamentos: [
          {
            meioPagamentoId: 'mp-1',
            valor: 10,
            cobrarNaEntrega: true,
            naoEfetivo: true,
          },
        ],
      })
    )

    expect(resultado.podeSubmeter).toBe(false)
    expect(resultado.erros[0]?.code).toBe('pagamentos_total')
  })

  it('libera parte já paga e o restante na entrega quando a soma fecha o total', () => {
    expect(
      validarPedidoGestor(
        basePedidoEntrega({
          entregaComCobrancaPeloEntregador: false,
          totalPagamentos: 30,
          pagamentos: [
            { meioPagamentoId: 'mp-pix', valor: 30 },
            {
              meioPagamentoId: 'mp-dinheiro',
              valor: 46,
              cobrarNaEntrega: true,
              naoEfetivo: true,
            },
          ],
          pagamentosCount: 2,
        })
      ).podeSubmeter
    ).toBe(true)
  })

  it('bloqueia já pago acima do total somado à cobrança na entrega', () => {
    expect(
      validarPedidoGestor(
        basePedidoEntrega({
          entregaComCobrancaPeloEntregador: false,
          totalProdutos: 45,
          totalPagamentos: 45,
          pagamentos: [
            { meioPagamentoId: 'mp-credito', valor: 45 },
            {
              meioPagamentoId: 'mp-dinheiro',
              valor: 10,
              cobrarNaEntrega: true,
              naoEfetivo: true,
            },
          ],
          pagamentosCount: 2,
        })
      ).podeSubmeter
    ).toBe(false)
  })

  it('libera dinheiro acima do total quando há troco', () => {
    expect(
      validarPedidoGestor(
        basePedidoEntrega({
          pagamentos: [
            {
              meioPagamentoId: 'mp-dinheiro',
              valor: 100,
              cobrarNaEntrega: true,
              naoEfetivo: true,
            },
          ],
          troco: 24,
        })
      ).podeSubmeter
    ).toBe(true)
  })
})

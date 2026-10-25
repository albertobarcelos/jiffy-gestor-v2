import { describe, expect, it } from 'vitest'
import { resolverEfeitoTrocaTipoAtendimento } from '@/src/application/meios-pagamentos/resolverEfeitoTrocaTipoAtendimento'

describe('resolverEfeitoTrocaTipoAtendimento', () => {
  it('pedido novo: troca entrega → retirada limpa pagamento e endereço', () => {
    expect(
      resolverEfeitoTrocaTipoAtendimento({
        tipoAtual: 'entrega',
        tipoNovo: 'retirada',
        pedidoExistente: false,
      })
    ).toEqual({
      trocou: true,
      limparPagamentos: true,
      limparEnderecoTaxa: true,
    })
  })

  it('pedido novo: troca retirada → entrega limpa pagamento e mantém o endereço vazio', () => {
    expect(
      resolverEfeitoTrocaTipoAtendimento({
        tipoAtual: 'retirada',
        tipoNovo: 'entrega',
        pedidoExistente: false,
      })
    ).toEqual({
      trocou: true,
      limparPagamentos: true,
      limparEnderecoTaxa: false,
    })
  })

  it('pedido existente não limpa pagamento ao mudar o rótulo', () => {
    expect(
      resolverEfeitoTrocaTipoAtendimento({
        tipoAtual: 'entrega',
        tipoNovo: 'retirada',
        pedidoExistente: true,
      })
    ).toEqual({
      trocou: true,
      limparPagamentos: false,
      limparEnderecoTaxa: true,
    })
  })

  it('mesmo tipo não mexe em nada', () => {
    expect(
      resolverEfeitoTrocaTipoAtendimento({
        tipoAtual: 'entrega',
        tipoNovo: 'entrega',
        pedidoExistente: false,
      })
    ).toEqual({
      trocou: false,
      limparPagamentos: false,
      limparEnderecoTaxa: false,
    })
  })
})

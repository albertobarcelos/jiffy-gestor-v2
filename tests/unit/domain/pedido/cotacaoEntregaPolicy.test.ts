import { describe, expect, it } from 'vitest'
import {
  mensagemBloqueioTaxaAutomatica,
  resolverResultadoCotacaoTaxaUi,
} from '@/src/domain/policies/pedido/cotacaoEntregaPolicy'

describe('resolverResultadoCotacaoTaxaUi', () => {
  const cotacaoOk = { status: 'ok' as const, valorTaxa: 5 }

  it('reutiliza a cotação em cache da chave atual (volta de Pagamento)', () => {
    const resultado = resolverResultadoCotacaoTaxaUi({
      podeCotar: true,
      chaveItensAtual: '["pizza"]',
      chaveItensDebounced: '["pizza"]',
      data: cotacaoOk,
    })
    expect(resultado).toEqual(cotacaoOk)
  })

  it('mostra calculando só na primeira cotação, sem cache', () => {
    const resultado = resolverResultadoCotacaoTaxaUi({
      podeCotar: true,
      chaveItensAtual: '["pizza"]',
      chaveItensDebounced: '["pizza"]',
    })
    expect(resultado).toEqual({ status: 'loading' })
  })

  it('não reutiliza cotação antiga quando os itens mudaram', () => {
    const resultado = resolverResultadoCotacaoTaxaUi({
      podeCotar: true,
      chaveItensAtual: '["pizza","refri"]',
      chaveItensDebounced: '["pizza"]',
      data: cotacaoOk,
    })
    expect(resultado).toEqual({ status: 'loading' })
  })

  it('não mantém erro em cache enquanto busca de novo', () => {
    const resultado = resolverResultadoCotacaoTaxaUi({
      podeCotar: true,
      chaveItensAtual: '["pizza"]',
      chaveItensDebounced: '["pizza"]',
      data: { status: 'erro', message: 'timeout' },
      isFetching: true,
    })
    expect(resultado).toEqual({ status: 'loading' })
  })

  it('mantém cotação ok na tela ao voltar de Pagamento mesmo se houver fetch', () => {
    const resultado = resolverResultadoCotacaoTaxaUi({
      podeCotar: true,
      chaveItensAtual: '["pizza"]',
      chaveItensDebounced: '["pizza"]',
      data: cotacaoOk,
      isFetching: true,
    })
    expect(resultado).toEqual(cotacaoOk)
  })
})

describe('mensagemBloqueioTaxaAutomatica', () => {
  it('bloqueia enquanto a automática está calculando', () => {
    expect(
      mensagemBloqueioTaxaAutomatica({
        pedidoComEntrega: true,
        taxaEntregaOverride: 'automatica',
        enderecoEntregaCoberturaStatus: 'pendente',
      })
    ).toMatch(/aguarde o cálculo da taxa/i)
  })

  it('não bloqueia se o atendente escolheu outra taxa', () => {
    expect(
      mensagemBloqueioTaxaAutomatica({
        pedidoComEntrega: true,
        taxaEntregaOverride: 'catalogo',
        enderecoEntregaCoberturaStatus: 'pendente',
      })
    ).toBeNull()
  })
})

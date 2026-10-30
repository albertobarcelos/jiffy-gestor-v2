import { describe, expect, it } from 'vitest'
import { isErroProdutosLancadosNaoEncontrados } from '@/src/application/delivery/erroProdutosLancadosNaoEncontrados'

describe('isErroProdutosLancadosNaoEncontrados', () => {
  it('reconhece a mensagem do backend', () => {
    expect(
      isErroProdutosLancadosNaoEncontrados(
        new Error('Produtos lançados não encontrados para remoção: 40d2999a-fe85-4075-a74f-6616979834e3')
      )
    ).toBe(true)
  })

  it('ignora outros erros', () => {
    expect(isErroProdutosLancadosNaoEncontrados(new Error('Pedido precisa ter pelo menos um produto'))).toBe(
      false
    )
  })
})

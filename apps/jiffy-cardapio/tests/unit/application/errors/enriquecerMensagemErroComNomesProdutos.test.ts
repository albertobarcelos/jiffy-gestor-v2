import { describe, expect, it } from 'vitest'
import { enriquecerMensagemErroComNomesProdutos } from '@/src/application/errors/publicDeliveryErrors'

describe('enriquecerMensagemErroComNomesProdutos', () => {
  it('substitui o id pelo nome do produto no carrinho', () => {
    const id = 'cmt78pfra00chpb01xoms3k05'
    expect(
      enriquecerMensagemErroComNomesProdutos(`Produto não está ativo: ${id}`, [
        { produtoId: id, produtoNome: 'X-BACON' },
      ])
    ).toBe('Produto não está ativo: X-BACON')
  })

  it('mantém a mensagem se o id não estiver no carrinho', () => {
    const msg = 'Produto não está ativo: outro-id'
    expect(
      enriquecerMensagemErroComNomesProdutos(msg, [
        { produtoId: 'cmt78pfra00chpb01xoms3k05', produtoNome: 'X-BACON' },
      ])
    ).toBe(msg)
  })
})

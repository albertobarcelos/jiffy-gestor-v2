import { describe, expect, it } from 'vitest'
import {
  isErroProdutoIndisponivelCheckout,
  resolverProdutoIndisponivelDoErro,
} from '@/src/application/errors/publicDeliveryErrors'

describe('resolverProdutoIndisponivelDoErro', () => {
  const itens = [
    { produtoId: 'cmt78pfra00chpb01xoms3k05', produtoNome: 'X-BACON' },
    { produtoId: 'outro-id', produtoNome: 'Água' },
  ]

  it('detecta produto inativo no base pelo id', () => {
    expect(
      resolverProdutoIndisponivelDoErro(
        'Produto não está ativo: cmt78pfra00chpb01xoms3k05',
        itens
      )
    ).toEqual({
      produtoIds: ['cmt78pfra00chpb01xoms3k05'],
      nomes: ['X-BACON'],
    })
  })

  it('detecta produto pausado no menu', () => {
    expect(
      resolverProdutoIndisponivelDoErro(
        'Produto não está ativo no menu: cmt78pfra00chpb01xoms3k05',
        itens
      )
    ).toEqual({
      produtoIds: ['cmt78pfra00chpb01xoms3k05'],
      nomes: ['X-BACON'],
    })
  })

  it('detecta soft delete (não encontrado no menu)', () => {
    expect(
      resolverProdutoIndisponivelDoErro(
        'Produto cmt78pfra00chpb01xoms3k05 não encontrado no menu menu-1',
        itens
      )
    ).toEqual({
      produtoIds: ['cmt78pfra00chpb01xoms3k05'],
      nomes: ['X-BACON'],
    })
  })

  it('retorna null para outros erros', () => {
    expect(resolverProdutoIndisponivelDoErro('Telefone inválido', itens)).toBeNull()
    expect(isErroProdutoIndisponivelCheckout('Telefone inválido')).toBe(false)
  })
})

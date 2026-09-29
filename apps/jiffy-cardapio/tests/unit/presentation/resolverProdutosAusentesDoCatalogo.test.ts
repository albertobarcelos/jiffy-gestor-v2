import { describe, expect, it } from 'vitest'
import type { CatalogoPublicoGrupoProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { resolverProdutosAusentesDoCatalogo } from '@/src/presentation/components/features/delivery-publico/shared/utils/resolverProdutosAusentesDoCatalogo'

describe('resolverProdutosAusentesDoCatalogo', () => {
  const grupos = [
    {
      id: 'g1',
      produtos: [{ id: 'ativo-1', nome: 'Burger' }],
    },
  ] as CatalogoPublicoGrupoProdutoDTO[]

  it('lista itens do carrinho que sumiram do catálogo', () => {
    expect(
      resolverProdutosAusentesDoCatalogo(
        [
          { produtoId: 'ativo-1', produtoNome: 'Burger' },
          { produtoId: 'pausado-2', produtoNome: 'X-BACON' },
        ],
        grupos
      )
    ).toEqual({
      produtoIds: ['pausado-2'],
      nomes: ['X-BACON'],
    })
  })

  it('retorna null quando todos estão no catálogo', () => {
    expect(
      resolverProdutosAusentesDoCatalogo(
        [{ produtoId: 'ativo-1', produtoNome: 'Burger' }],
        grupos
      )
    ).toBeNull()
  })
})

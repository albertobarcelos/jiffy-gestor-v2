import { describe, expect, it } from 'vitest'
import { resolverLayoutCatalogoProdutoPedido } from '@/src/presentation/components/features/pedidos/components/catalogo/pedidoCatalogoLayout'

describe('resolverLayoutCatalogoProdutoPedido', () => {
  it('usa foto quando ha url', () => {
    expect(resolverLayoutCatalogoProdutoPedido('https://cdn.jiffy/a.jpg')).toBe('foto')
  })

  it('usa quadradinho quando nao ha foto', () => {
    expect(resolverLayoutCatalogoProdutoPedido(null)).toBe('quadradinho')
    expect(resolverLayoutCatalogoProdutoPedido('')).toBe('quadradinho')
    expect(resolverLayoutCatalogoProdutoPedido('   ')).toBe('quadradinho')
  })

  it('cai no quadradinho se a imagem falhar', () => {
    expect(resolverLayoutCatalogoProdutoPedido('https://cdn.jiffy/a.jpg', true)).toBe(
      'quadradinho'
    )
  })
})

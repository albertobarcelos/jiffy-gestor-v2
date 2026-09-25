import { describe, expect, it } from 'vitest'
import {
  normalizeMenuProduto,
  unwrapMenuProdutoPayload,
} from '@/src/application/mappers/MenuProdutoCatalogMapper'
import type { MenuProduto } from '@/src/shared/types/menus'

describe('normalizeMenuProduto', () => {
  const base = {
    id: 'mp-1',
    nome: 'X',
    descricao: null,
    valor: 10,
    ordem: 1,
    favorito: false,
    ativo: true,
    menu: { id: 'm1', nome: 'Menu' },
    produtoId: 'p1',
    grupoProduto: { id: 'g1', nome: 'G' },
    image: null,
    gruposComplementos: [],
    dataCriacao: '',
    dataAtualizacao: '',
  } as MenuProduto

  it('preenche defaults quando a API não envia promo', () => {
    const normalized = normalizeMenuProduto(base)
    expect(normalized.valorPromocional).toBe(0)
    expect(normalized.promocaoAtiva).toBe(false)
  })

  it('preserva promo válida', () => {
    const normalized = normalizeMenuProduto({
      ...base,
      valorPromocional: 7.5,
      promocaoAtiva: true,
    })
    expect(normalized.valorPromocional).toBe(7.5)
    expect(normalized.promocaoAtiva).toBe(true)
  })

  it('unwrap aplica normalize', () => {
    const item = unwrapMenuProdutoPayload({ data: { ...base, produtoId: 'p1' } })
    expect(item?.valorPromocional).toBe(0)
    expect(item?.promocaoAtiva).toBe(false)
  })
})

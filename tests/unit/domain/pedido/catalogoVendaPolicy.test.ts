import { describe, expect, it } from 'vitest'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { Produto } from '@/src/domain/entities/Produto'
import {
  MIN_CARACTERES_BUSCA_CATALOGO_VENDA,
  buscaCatalogoVendaAtiva,
  montarGruposCatalogoVenda,
  montarProdutosCatalogoVenda,
  mesclarProdutosNoCatalogo,
  resolverGrupoCatalogoSelecionadoId,
} from '@/src/domain/policies/pedido/CatalogoVendaPolicy'

function grupo(params: { id: string; nome: string; ativo?: boolean; ordem?: number }): GrupoProduto {
  return GrupoProduto.create({
    id: params.id,
    nome: params.nome,
    corHex: '#000000',
    iconName: '',
    ativo: params.ativo ?? true,
    ativoDelivery: true,
    ativoLocal: true,
    ordem: params.ordem,
  })
}

function produto(params: { id: string; nome: string; ativo?: boolean }): Produto {
  return Produto.fromJSON({
    id: params.id,
    codigoProduto: params.id,
    nome: params.nome,
    valor: 10,
    ativo: params.ativo ?? true,
  })
}

describe('CatalogoVendaPolicy', () => {
  it('considera busca ativa a partir do mínimo de caracteres', () => {
    expect(MIN_CARACTERES_BUSCA_CATALOGO_VENDA).toBe(2)
    expect(buscaCatalogoVendaAtiva('a')).toBe(false)
    expect(buscaCatalogoVendaAtiva(' ab')).toBe(true)
  })

  it('não monta grupos sem menu', () => {
    expect(
      montarGruposCatalogoVenda({
        menuId: null,
        gruposMenu: [grupo({ id: 'g1', nome: 'Lanches' })],
        grupoIdsComProdutosAtivos: new Set(['g1']),
      })
    ).toEqual([])
  })

  it('omite grupos inativos e, sem ids, mantém os vazios ordenados por ordem', () => {
    const result = montarGruposCatalogoVenda({
      menuId: 'menu-1',
      gruposMenu: [
        grupo({ id: 'g2', nome: 'Bebidas', ordem: 2 }),
        grupo({ id: 'g-inativo', nome: 'Inativo', ativo: false, ordem: 0 }),
        grupo({ id: 'g1', nome: 'Lanches', ordem: 1 }),
        grupo({ id: 'g-vazio', nome: 'Vazio', ordem: 3 }),
      ],
    })
    expect(result.map(item => item.getId())).toEqual(['g1', 'g2', 'g-vazio'])
  })

  it('quando há ids com produto, omite grupos vazios', () => {
    const result = montarGruposCatalogoVenda({
      menuId: 'menu-1',
      gruposMenu: [
        grupo({ id: 'g2', nome: 'Bebidas', ordem: 2 }),
        grupo({ id: 'g1', nome: 'Lanches', ordem: 1 }),
        grupo({ id: 'g-vazio', nome: 'Vazio', ordem: 3 }),
      ],
      grupoIdsComProdutosAtivos: new Set(['g1', 'g2']),
    })
    expect(result.map(item => item.getId())).toEqual(['g1', 'g2'])
  })

  it('não espera ids para montar grupos ativos', () => {
    const result = montarGruposCatalogoVenda({
      menuId: 'menu-1',
      gruposMenu: [grupo({ id: 'g1', nome: 'Lanches' })],
    })
    expect(result.map(item => item.getId())).toEqual(['g1'])
  })

  it('seleciona o primeiro grupo quando o atual é inválido', () => {
    const grupos = [grupo({ id: 'g1', nome: 'A' }), grupo({ id: 'g2', nome: 'B' })]
    expect(resolverGrupoCatalogoSelecionadoId(grupos, 'g2')).toBe('g2')
    expect(resolverGrupoCatalogoSelecionadoId(grupos, 'inexistente')).toBe('g1')
    expect(resolverGrupoCatalogoSelecionadoId([], 'g1')).toBe('g1')
  })

  it('lista só produtos ativos na ordem recebida da página', () => {
    const result = montarProdutosCatalogoVenda({
      menuId: 'menu-1',
      buscaFiltrada: '',
      produtosGrupo: [
        produto({ id: 'p2', nome: 'X-Bacon' }),
        produto({ id: 'p-off', nome: 'Inativo', ativo: false }),
        produto({ id: 'p1', nome: 'Água' }),
      ],
    })
    expect(result.map(item => item.getNome())).toEqual(['X-Bacon', 'Água'])
  })

  it('mescla produtos no mapa do catálogo sem perder os anteriores', () => {
    const p1 = produto({ id: 'p1', nome: 'A' })
    const p2 = produto({ id: 'p2', nome: 'B' })
    const next = mesclarProdutosNoCatalogo({ p1 }, [p2])
    expect(next.p1).toBe(p1)
    expect(next.p2).toBe(p2)
  })
})

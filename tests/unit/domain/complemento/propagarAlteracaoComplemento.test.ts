import { describe, expect, it } from 'vitest'
import type { ComplementoUsoNoMenu } from '@/src/domain/complemento/tipos'
import {
  alteracaoValorAtivo,
  chaveUsoComplemento,
  montarVinculosPropagacao,
  usosParaPropagar,
} from '@/src/domain/policies/complemento/propagarAlteracaoComplemento'

function uso(parcial: {
  menuProdutoId: string
  menuId: string
  produtoId: string
  grupoId: string
  valor?: number
  ativo?: boolean
}): ComplementoUsoNoMenu {
  return {
    menuProdutoId: parcial.menuProdutoId,
    menu: { id: parcial.menuId, nome: parcial.menuId, ativo: true },
    produto: { id: parcial.produtoId, nome: parcial.produtoId, ativo: true },
    grupoProduto: { id: 'gp', nome: 'Lanches' },
    grupoComplementos: { id: parcial.grupoId, nome: parcial.grupoId },
    complementoConfig: {
      ordem: 0,
      valor: parcial.valor ?? 2,
      ativo: parcial.ativo ?? true,
    },
  }
}

describe('alteracaoValorAtivo', () => {
  it('ignora quando valor e ativo continuam iguais', () => {
    expect(
      alteracaoValorAtivo({
        valorAnterior: 10,
        ativoAnterior: true,
        valorNovo: 10,
        ativoNovo: true,
      })
    ).toBeNull()
  })

  it('ignora diferença de centavos que não muda o preço', () => {
    expect(
      alteracaoValorAtivo({
        valorAnterior: 10,
        ativoAnterior: true,
        valorNovo: 10.001,
        ativoNovo: true,
      })
    ).toBeNull()
  })

  it('devolve só o campo que mudou', () => {
    expect(
      alteracaoValorAtivo({
        valorAnterior: 10,
        ativoAnterior: true,
        valorNovo: 12.5,
        ativoNovo: true,
      })
    ).toEqual({ valor: 12.5 })

    expect(
      alteracaoValorAtivo({
        valorAnterior: 10,
        ativoAnterior: true,
        valorNovo: 10,
        ativoNovo: false,
      })
    ).toEqual({ ativo: false })
  })
})

describe('usosParaPropagar', () => {
  const usos = [
    uso({ menuProdutoId: 'mp1', menuId: 'menu-a', produtoId: 'prod', grupoId: 'grupo-1' }),
    uso({ menuProdutoId: 'mp1', menuId: 'menu-a', produtoId: 'prod', grupoId: 'grupo-2' }),
    uso({ menuProdutoId: 'mp2', menuId: 'menu-b', produtoId: 'prod', grupoId: 'grupo-1' }),
  ]

  it('no cadastro base lista todos os usos', () => {
    expect(usosParaPropagar(usos)).toHaveLength(3)
  })

  it('tira só o uso de origem e mantém o outro grupo do mesmo produto', () => {
    const destinos = usosParaPropagar(usos, {
      menuId: 'menu-a',
      produtoId: 'prod',
      grupoComplementoId: 'grupo-1',
    })
    expect(destinos.map(chaveUsoComplemento)).toEqual(['mp1:grupo-2', 'mp2:grupo-1'])
  })
})

describe('montarVinculosPropagacao', () => {
  it('copia apenas valor quando o ativo não mudou', () => {
    const destinos = [
      uso({ menuProdutoId: 'mp2', menuId: 'menu-b', produtoId: 'prod', grupoId: 'grupo-1' }),
    ]
    expect(
      montarVinculosPropagacao({
        complementoId: 'comp',
        usos: destinos,
        alteracao: { valor: 8 },
      })
    ).toEqual([
      {
        menuId: 'menu-b',
        produtoId: 'prod',
        complementoId: 'comp',
        grupoComplementoId: 'grupo-1',
        valor: 8,
      },
    ])
  })

  it('não monta vínculo sem valor nem ativo', () => {
    expect(
      montarVinculosPropagacao({
        complementoId: 'comp',
        usos: [uso({ menuProdutoId: 'mp2', menuId: 'menu-b', produtoId: 'prod', grupoId: 'grupo-1' })],
        alteracao: {},
      })
    ).toEqual([])
  })
})

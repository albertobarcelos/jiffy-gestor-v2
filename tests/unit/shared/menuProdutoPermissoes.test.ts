import { describe, expect, it } from 'vitest'
import type { MenuProduto, UpdateMenuProdutoInput } from '@/src/shared/types/menus'
import {
  aplicarTogglePermissaoNoIndex,
  PERMISSOES_GRAVAM_NO_SNAPSHOT_MENU,
  resolverPermissoesMenuProduto,
  sanitizarPatchMenuProduto,
} from '@/src/shared/utils/menuProdutoPermissoes'

function snapshot(over: Partial<MenuProduto> = {}): MenuProduto {
  return {
    id: 'mp-1',
    nome: 'X-Calabresa',
    descricao: null,
    valor: 16,
    ordem: 1,
    favorito: false,
    ativo: true,
    menu: { id: 'menu-1', nome: 'Cardápio' },
    produtoId: 'prod-1',
    grupoProduto: { id: 'g-1', nome: 'Lanches' },
    image: null,
    gruposComplementos: [],
    dataCriacao: '',
    dataAtualizacao: '',
    ...over,
  }
}

describe('resolverPermissoesMenuProduto', () => {
  it('usa o cadastro quando o snapshot ainda não traz as permissões', () => {
    expect(
      resolverPermissoesMenuProduto(snapshot(), {
        permiteAcrescimo: true,
        permiteDesconto: true,
        abreComplementos: false,
        permiteAlterarPreco: true,
        incideTaxa: false,
      })
    ).toEqual({
      permiteAcrescimo: true,
      permiteDesconto: true,
      abreComplementos: false,
      permiteAlterarPreco: true,
      incideTaxa: false,
    })
  })

  it('prefere o snapshot quando a API do menu já mandar o campo', () => {
    expect(
      resolverPermissoesMenuProduto(
        snapshot({ permiteAcrescimo: false, incideTaxa: true }),
        { permiteAcrescimo: true, incideTaxa: false }
      )
    ).toMatchObject({
      permiteAcrescimo: false,
      incideTaxa: true,
    })
  })
})

describe('sanitizarPatchMenuProduto', () => {
  it('remove permissões do PATCH do menu enquanto a API não as aceita', () => {
    expect(PERMISSOES_GRAVAM_NO_SNAPSHOT_MENU).toBe(false)
    const input: UpdateMenuProdutoInput = {
      favorito: true,
      permiteAcrescimo: true,
      nome: 'X-Calabresa',
    }
    expect(sanitizarPatchMenuProduto(input)).toEqual({
      favorito: true,
      nome: 'X-Calabresa',
    })
  })
})

describe('aplicarTogglePermissaoNoIndex', () => {
  it('atualiza só o campo do produto no índice do catálogo', () => {
    const next = aplicarTogglePermissaoNoIndex(
      {
        codigos: { 'prod-1': '4' },
        permissoes: {
          'prod-1': {
            permiteAcrescimo: false,
            permiteDesconto: false,
            abreComplementos: false,
            permiteAlterarPreco: false,
            incideTaxa: false,
          },
        },
      },
      'prod-1',
      'permiteAcrescimo',
      true
    )
    expect(next?.permissoes['prod-1']?.permiteAcrescimo).toBe(true)
    expect(next?.codigos['prod-1']).toBe('4')
  })
})

import { describe, expect, it } from 'vitest'
import type { MenuGrupoProduto } from '@/src/shared/types/menus'
import { coletarGruposMenuPorSnapshot } from '@/src/presentation/components/features/menus/ordenarGruposMenuSnapshot'

function grupo(partial: {
  id: string
  ordem: number
  baseId: string
  baseOrdem?: number
  nome?: string
}): MenuGrupoProduto {
  return {
    id: partial.id,
    nome: partial.nome ?? partial.baseId,
    ordem: partial.ordem,
    menuId: 'menu-1',
    grupoBase: {
      id: partial.baseId,
      nome: partial.nome ?? partial.baseId,
      ordem: partial.baseOrdem,
    },
    dataCriacao: '2026-01-01',
    dataAtualizacao: '2026-01-01',
  }
}

describe('coletarGruposMenuPorSnapshot', () => {
  it('ordena pela ordem do snapshot, não pela ordem do cadastro base', () => {
    const ordered = coletarGruposMenuPorSnapshot([
      {
        items: [
          grupo({ id: 's-pizza', ordem: 2, baseId: 'pizza', baseOrdem: 1, nome: 'Pizzas' }),
          grupo({ id: 's-lanche', ordem: 1, baseId: 'lanche', baseOrdem: 9, nome: 'Lanches' }),
        ],
      },
    ])

    expect(ordered.map(g => g.grupoBase.id)).toEqual(['lanche', 'pizza'])
  })
})

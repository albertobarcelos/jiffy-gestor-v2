import { describe, expect, it } from 'vitest'
import {
  aplicarColunasOcultas,
  alternarColunaOculta,
  colunasOcultasPadraoDoModo,
  podeOcultarColuna,
  sanitizarColunasOcultas,
} from '@/src/presentation/components/features/kanban/utils/kanbanColunasVisibilidade'
import type { KanbanColumn } from '@/src/presentation/components/features/kanban/types'

function col(id: string, title = id): KanbanColumn {
  return {
    id,
    title,
    color: '',
    borderColor: '',
    icon: null,
    placeholder: '',
  }
}

const delivery = [
  col('NOVOS_PEDIDOS', 'Novos Pedidos'),
  col('EM_PREPARO', 'Em Preparo'),
  col('PRONTO_ENTREGA', 'Pronto'),
  col('EM_ROTA', 'Em Rota'),
  col('FINALIZADAS', 'Finalizadas'),
  col('COM_FISCAL', 'Com NF Solicitada'),
]

describe('sanitizarColunasOcultas', () => {
  it('ignora ids inválidos e duplicados', () => {
    expect(sanitizarColunasOcultas(['NOVOS_PEDIDOS', 'FOO', 'NOVOS_PEDIDOS', 1])).toEqual([
      'NOVOS_PEDIDOS',
    ])
  })
})

describe('colunasOcultasPadraoDoModo', () => {
  it('delivery esconde Novos e Com NF', () => {
    expect(colunasOcultasPadraoDoModo('delivery')).toEqual(['NOVOS_PEDIDOS', 'COM_FISCAL'])
  })

  it('balcão não esconde nada por defeito', () => {
    expect(colunasOcultasPadraoDoModo('balcao')).toEqual([])
  })
})

describe('aplicarColunasOcultas', () => {
  it('deixa as 4 colunas operacionais do delivery', () => {
    const visiveis = aplicarColunasOcultas(delivery, ['NOVOS_PEDIDOS', 'COM_FISCAL'])
    expect(visiveis.map(c => c.id)).toEqual([
      'EM_PREPARO',
      'PRONTO_ENTREGA',
      'EM_ROTA',
      'FINALIZADAS',
    ])
  })

  it('não esvazia o quadro', () => {
    const unica = [col('EM_PREPARO')]
    expect(aplicarColunasOcultas(unica, ['EM_PREPARO']).map(c => c.id)).toEqual(['EM_PREPARO'])
  })
})

describe('podeOcultarColuna / alternarColunaOculta', () => {
  it('não deixa esconder a última visível', () => {
    const ocultas = ['NOVOS_PEDIDOS', 'EM_PREPARO', 'PRONTO_ENTREGA', 'EM_ROTA', 'COM_FISCAL']
    expect(podeOcultarColuna(delivery, ocultas, 'FINALIZADAS')).toBe(false)
  })

  it('permite esconder quando ainda há outra visível', () => {
    expect(podeOcultarColuna(delivery, ['NOVOS_PEDIDOS'], 'COM_FISCAL')).toBe(true)
  })

  it('alterna visibilidade', () => {
    expect(alternarColunaOculta(['NOVOS_PEDIDOS'], 'NOVOS_PEDIDOS', true)).toEqual([])
    expect(alternarColunaOculta([], 'COM_FISCAL', false)).toEqual(['COM_FISCAL'])
  })
})

import { describe, expect, it } from 'vitest'
import {
  classesKanbanColunaCasco,
  classesKanbanQuadroFaixa,
  classesKanbanQuadroRow,
} from '@/src/presentation/components/features/kanban/utils/kanbanQuadroLayout'

describe('kanbanQuadroLayout', () => {
  it('no Gestor a faixa rola na horizontal e a coluna tem largura fixa', () => {
    expect(classesKanbanQuadroFaixa('gestor')).toContain('overflow-x-auto')
    expect(classesKanbanQuadroRow('gestor')).toContain('w-max')
    expect(classesKanbanColunaCasco('gestor')).toContain('w-80')
    expect(classesKanbanColunaCasco('gestor')).toContain('shrink-0')
  })

  it('no Fredy a faixa preenche a tela e as colunas esticam', () => {
    expect(classesKanbanQuadroFaixa('fredy')).toContain('overflow-hidden')
    expect(classesKanbanQuadroRow('fredy')).toContain('w-full')
    expect(classesKanbanQuadroRow('fredy')).toContain('min-w-0')
    expect(classesKanbanColunaCasco('fredy')).toContain('flex-1')
  })
})

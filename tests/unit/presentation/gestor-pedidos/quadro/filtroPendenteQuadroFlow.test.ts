/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import {
  gravarPendenciaQuadroFlow,
  lerPendenciaQuadroFlow,
} from '@/src/presentation/gestor-pedidos/quadro/filtroPendenteQuadroFlow'

describe('filtro pendente do quadro Flow', () => {
  it('grava busca e todos os períodos e consome uma vez', () => {
    gravarPendenciaQuadroFlow('65992934536', true)
    expect(lerPendenciaQuadroFlow()).toEqual({ busca: '65992934536', periodoTodos: true })
    expect(lerPendenciaQuadroFlow()).toEqual({ busca: '', periodoTodos: false })
  })
})

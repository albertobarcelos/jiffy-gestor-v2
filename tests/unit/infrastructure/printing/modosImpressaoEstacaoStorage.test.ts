/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  lerModosImpressaoEstacaoLocal,
  salvarModosImpressaoEstacaoLocal,
} from '@/src/infrastructure/printing/modosImpressaoEstacaoStorage'

describe('modosImpressaoEstacaoStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('grava e lê o modo por impressora nesta estação', () => {
    salvarModosImpressaoEstacaoLocal('est-1', { 'imp-cozinha': 'porUnidade' })
    expect(lerModosImpressaoEstacaoLocal('est-1')).toEqual({ 'imp-cozinha': 'porUnidade' })
  })

  it('não mistura estações', () => {
    salvarModosImpressaoEstacaoLocal('est-1', { 'imp-1': 'agrupado' })
    salvarModosImpressaoEstacaoLocal('est-2', { 'imp-1': 'ficha' })
    expect(lerModosImpressaoEstacaoLocal('est-1')['imp-1']).toBe('agrupado')
    expect(lerModosImpressaoEstacaoLocal('est-2')['imp-1']).toBe('ficha')
  })
})

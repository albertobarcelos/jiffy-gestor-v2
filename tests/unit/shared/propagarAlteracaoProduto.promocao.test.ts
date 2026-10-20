import { describe, expect, it } from 'vitest'
import { snapshotPropagavelDePatch } from '@/src/shared/types/propagarAlteracaoProduto'

describe('snapshotPropagavelDePatch — promoção', () => {
  it('inclui valorPromocional e promocaoAtiva', () => {
    expect(
      snapshotPropagavelDePatch({
        valorPromocional: 19.9,
        promocaoAtiva: true,
      })
    ).toEqual({
      valorPromocional: 19.9,
      promocaoAtiva: true,
    })
  })

  it('não aceita valorPromocional negativo', () => {
    expect(
      snapshotPropagavelDePatch({
        valorPromocional: -5,
      })
    ).toEqual({
      valorPromocional: 0,
    })
  })
})

import { describe, expect, it } from 'vitest'
import {
  montarPatchEmissaoAutomatica,
  montarPatchPapelReceptora,
} from '@/src/application/estacao-impressao/montarPatchAtualizarEstacao'

describe('montarPatchAtualizarEstacao', () => {
  it('mapeia desligar receptora com zero do auto', () => {
    expect(
      montarPatchPapelReceptora({
        gestorDelivery: false,
        emissaoAutomaticaAoFinalizar: false,
      })
    ).toEqual({
      gestorDelivery: false,
      emissaoAutomaticaAoFinalizar: false,
    })
  })

  it('mapeia ligar receptora sem tocar no auto', () => {
    expect(montarPatchPapelReceptora({ gestorDelivery: true })).toEqual({
      gestorDelivery: true,
    })
  })

  it('mapeia só o flag de emissão', () => {
    expect(montarPatchEmissaoAutomatica(true)).toEqual({
      emissaoAutomaticaAoFinalizar: true,
    })
  })
})

import { describe, expect, it } from 'vitest'
import {
  EmissaoAutomaticaEstacaoPolicy,
  MENSAGEM_EMISSAO_AUTOMATICA_SO_RECEPTORA,
} from '@/src/domain/policies/estacao/EmissaoAutomaticaEstacaoPolicy'

describe('EmissaoAutomaticaEstacaoPolicy', () => {
  it('check permite ativar só na receptora', () => {
    expect(EmissaoAutomaticaEstacaoPolicy.check({ ehReceptora: true, ativar: true })).toEqual({
      permitida: true,
      motivo: null,
    })
    expect(EmissaoAutomaticaEstacaoPolicy.check({ ehReceptora: false, ativar: true })).toEqual({
      permitida: false,
      motivo: MENSAGEM_EMISSAO_AUTOMATICA_SO_RECEPTORA,
    })
  })

  it('check permite desligar em qualquer estação', () => {
    expect(EmissaoAutomaticaEstacaoPolicy.check({ ehReceptora: false, ativar: false })).toEqual({
      permitida: true,
      motivo: null,
    })
  })

  it('assert lança fora da receptora ao ativar', () => {
    expect(() =>
      EmissaoAutomaticaEstacaoPolicy.assert({ ehReceptora: false, ativar: true })
    ).toThrow(MENSAGEM_EMISSAO_AUTOMATICA_SO_RECEPTORA)
  })

  it('valorEfetivo fica false sem receptora', () => {
    expect(EmissaoAutomaticaEstacaoPolicy.valorEfetivo(false, true)).toBe(false)
    expect(EmissaoAutomaticaEstacaoPolicy.valorEfetivo(true, true)).toBe(true)
    expect(EmissaoAutomaticaEstacaoPolicy.valorEfetivo(true, false)).toBe(false)
  })

  it('ao desligar receptora zera emissão automática', () => {
    expect(EmissaoAutomaticaEstacaoPolicy.estadoAoDesligarReceptora()).toEqual({
      gestorDelivery: false,
      emissaoAutomaticaAoFinalizar: false,
    })
  })

  it('ao ligar receptora não liga emissão sozinha', () => {
    expect(EmissaoAutomaticaEstacaoPolicy.estadoAoLigarReceptora()).toEqual({
      gestorDelivery: true,
    })
  })
})

import { describe, expect, it } from 'vitest'
import {
  normalizarEstacaoImpressaoResumo,
  normalizarListaEstacoesImpressao,
} from '@/src/infrastructure/api/normalizarEstacaoImpressaoResumo'

describe('normalizarEstacaoImpressaoResumo', () => {
  it('preserva gestorDelivery e emissaoAutomaticaAoFinalizar', () => {
    expect(
      normalizarEstacaoImpressaoResumo({
        id: 'est-1',
        nome: 'Caixa',
        ativo: true,
        gestorDelivery: true,
        emissaoAutomaticaAoFinalizar: true,
      })
    ).toEqual({
      id: 'est-1',
      nome: 'Caixa',
      ativo: true,
      gestorDelivery: true,
      emissaoAutomaticaAoFinalizar: true,
    })
  })

  it('default gestorDelivery e emissao false quando ausente', () => {
    expect(normalizarEstacaoImpressaoResumo({ id: 'est-2', nome: 'Bar' })).toEqual({
      id: 'est-2',
      nome: 'Bar',
      ativo: true,
      gestorDelivery: false,
      emissaoAutomaticaAoFinalizar: false,
    })
  })

  it('aceita envelope data', () => {
    expect(
      normalizarEstacaoImpressaoResumo({
        data: { id: 'est-3', nome: 'Cozinha', ativo: false, gestorDelivery: true },
      })
    ).toMatchObject({
      id: 'est-3',
      gestorDelivery: true,
      ativo: false,
      emissaoAutomaticaAoFinalizar: false,
    })
  })

  it('normaliza lista', () => {
    const lista = normalizarListaEstacoesImpressao({
      items: [
        { id: 'a', nome: 'A', gestorDelivery: true, emissaoAutomaticaAoFinalizar: true },
        { id: 'b', nome: 'B' },
      ],
    })
    expect(lista).toHaveLength(2)
    expect(lista[0].gestorDelivery).toBe(true)
    expect(lista[0].emissaoAutomaticaAoFinalizar).toBe(true)
    expect(lista[1].gestorDelivery).toBe(false)
    expect(lista[1].emissaoAutomaticaAoFinalizar).toBe(false)
  })
})

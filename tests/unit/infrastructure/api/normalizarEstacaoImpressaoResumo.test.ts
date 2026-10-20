import { describe, expect, it } from 'vitest'
import {
  normalizarEstacaoImpressaoResumo,
  normalizarListaEstacoesImpressao,
} from '@/src/infrastructure/api/normalizarEstacaoImpressaoResumo'

describe('normalizarEstacaoImpressaoResumo', () => {
  it('preserva gestorDelivery true', () => {
    expect(
      normalizarEstacaoImpressaoResumo({
        id: 'est-1',
        nome: 'Caixa',
        ativo: true,
        gestorDelivery: true,
      })
    ).toEqual({
      id: 'est-1',
      nome: 'Caixa',
      ativo: true,
      gestorDelivery: true,
    })
  })

  it('default gestorDelivery false quando ausente', () => {
    expect(normalizarEstacaoImpressaoResumo({ id: 'est-2', nome: 'Bar' })).toEqual({
      id: 'est-2',
      nome: 'Bar',
      ativo: true,
      gestorDelivery: false,
    })
  })

  it('aceita envelope data', () => {
    expect(
      normalizarEstacaoImpressaoResumo({
        data: { id: 'est-3', nome: 'Cozinha', ativo: false, gestorDelivery: true },
      })
    ).toMatchObject({ id: 'est-3', gestorDelivery: true, ativo: false })
  })

  it('normaliza lista', () => {
    const lista = normalizarListaEstacoesImpressao({
      items: [
        { id: 'a', nome: 'A', gestorDelivery: true },
        { id: 'b', nome: 'B' },
      ],
    })
    expect(lista).toHaveLength(2)
    expect(lista[0].gestorDelivery).toBe(true)
    expect(lista[1].gestorDelivery).toBe(false)
  })
})

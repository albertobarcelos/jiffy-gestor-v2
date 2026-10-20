import { describe, expect, it } from 'vitest'
import {
  deveTravarPrecoNormal,
  recalcularPromocionalPreservandoPercentual,
  resolverAtualizacaoPrecoNormal,
} from '@/src/domain/policies/menu/atualizarPrecoNormalSnapshot'
import { valorPromocionalFromDesconto } from '@/src/domain/policies/menu/precoVigenteSnapshot'

describe('atualizarPrecoNormalSnapshot', () => {
  it('trava o preço normal só com promoção vigente', () => {
    expect(
      deveTravarPrecoNormal({ valor: 39.9, valorPromocional: 33.92, promocaoAtiva: true })
    ).toBe(true)
    expect(
      deveTravarPrecoNormal({ valor: 39.9, valorPromocional: 33.92, promocaoAtiva: false })
    ).toBe(false)
  })

  it('recalcula o promocional preservando o % quando o normal muda', () => {
    const anterior = 39.9
    const promocional = valorPromocionalFromDesconto(anterior, 15)
    expect(promocional).toBe(33.92)
    expect(recalcularPromocionalPreservandoPercentual(49.9, anterior, promocional!)).toBe(
      valorPromocionalFromDesconto(49.9, 15)
    )
    expect(recalcularPromocionalPreservandoPercentual(0, anterior, promocional!)).toBeNull()
  })

  it('bloqueia atualização quando a promoção está vigente', () => {
    expect(
      resolverAtualizacaoPrecoNormal(49.9, {
        valor: 39.9,
        valorPromocional: 33.92,
        promocaoAtiva: true,
      })
    ).toEqual({ tipo: 'bloqueada' })
  })

  it('preserva o % quando a promoção está pausada', () => {
    const promocional = valorPromocionalFromDesconto(39.9, 15)!
    expect(
      resolverAtualizacaoPrecoNormal(49.9, {
        valor: 39.9,
        valorPromocional: promocional,
        promocaoAtiva: false,
      })
    ).toEqual({
      tipo: 'valorEPromocional',
      valor: 49.9,
      valorPromocional: valorPromocionalFromDesconto(49.9, 15),
    })
  })

  it('atualiza só o normal quando não há promoção preenchida', () => {
    expect(
      resolverAtualizacaoPrecoNormal(49.9, {
        valor: 39.9,
        valorPromocional: 0,
        promocaoAtiva: false,
      })
    ).toEqual({ tipo: 'somenteValor', valor: 49.9 })
  })
})

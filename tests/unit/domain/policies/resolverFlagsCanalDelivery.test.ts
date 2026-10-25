import { describe, expect, it } from 'vitest'
import { resolverFlagsCanalDelivery } from '@/src/domain/policies/pagamento/resolverFlagsCanalDelivery'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'

describe('resolverFlagsCanalDelivery', () => {
  it('payload só com ativoDelivery liga os dois canais', () => {
    expect(resolverFlagsCanalDelivery({ ativoDelivery: true })).toEqual({
      ativoEntregaDelivery: true,
      ativoRetiradaDelivery: true,
    })
  })

  it('sem flag nenhuma os dois canais ficam desligados', () => {
    expect(resolverFlagsCanalDelivery({})).toEqual({
      ativoEntregaDelivery: false,
      ativoRetiradaDelivery: false,
    })
  })

  it('flag nova explícita não herda o legado', () => {
    expect(
      resolverFlagsCanalDelivery({
        ativoEntregaDelivery: true,
        ativoRetiradaDelivery: false,
        ativoDelivery: true,
      })
    ).toEqual({
      ativoEntregaDelivery: true,
      ativoRetiradaDelivery: false,
    })
  })

  it('é a mesma hidratação do fromJSON da entidade', () => {
    const bruto = { id: 'mp-1', nome: 'PIX', isDelivery: true }
    const flags = resolverFlagsCanalDelivery(bruto)
    const entidade = MeioPagamento.fromJSON(bruto)
    expect(entidade.isEntregaDelivery()).toBe(flags.ativoEntregaDelivery)
    expect(entidade.isRetiradaDelivery()).toBe(flags.ativoRetiradaDelivery)
  })
})

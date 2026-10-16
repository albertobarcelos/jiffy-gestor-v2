import { describe, expect, it } from 'vitest'
import {
  complementoVisivelNoPedido,
  listarComplementosVisiveisNoPedido,
} from '@/src/domain/policies/pedido/ComplementoCatalogoVendaPolicy'

describe('ComplementoCatalogoVendaPolicy', () => {
  it('considera ativo quando o campo está ausente', () => {
    expect(complementoVisivelNoPedido({})).toBe(true)
    expect(complementoVisivelNoPedido({ ativo: true })).toBe(true)
    expect(complementoVisivelNoPedido({ ativo: false })).toBe(false)
  })

  it('lista só ativos e ordena por ordem efetiva', () => {
    expect(
      listarComplementosVisiveisNoPedido([
        { id: 'c2', nome: 'Ovo', ativo: true, ordem: 2 },
        { id: 'c0', nome: 'Pausado', ativo: false, ordem: 0 },
        { id: 'c1', nome: 'Bacon', ativo: true, ordem: 1 },
      ]).map(item => item.id)
    ).toEqual(['c1', 'c2'])
  })
})

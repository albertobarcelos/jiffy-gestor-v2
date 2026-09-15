import { describe, expect, it } from 'vitest'
import { deveTocarSomPedidoNovo } from '@/src/presentation/gestor-pedidos/som/somPedidoNovo'

describe('deveTocarSomPedidoNovo', () => {
  it('toca so no Fredy com som ligado', () => {
    expect(deveTocarSomPedidoNovo({ superficie: 'fredy', silenciado: false })).toBe(true)
  })

  it('nao toca no Gestor web', () => {
    expect(deveTocarSomPedidoNovo({ superficie: 'gestor', silenciado: false })).toBe(false)
  })

  it('nao toca no Fredy silenciado', () => {
    expect(deveTocarSomPedidoNovo({ superficie: 'fredy', silenciado: true })).toBe(false)
  })
})

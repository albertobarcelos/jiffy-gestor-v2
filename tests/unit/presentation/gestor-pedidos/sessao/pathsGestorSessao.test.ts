import { describe, expect, it } from 'vitest'
import { mesmaRotaLocal } from '@/src/presentation/gestor-pedidos/sessao/pathsGestorSessao'

describe('mesmaRotaLocal', () => {
  it('reconhece /login?gestor igual a si mesmo', () => {
    expect(
      mesmaRotaLocal(
        { pathname: '/login', search: '?gestor' },
        '/login?gestor'
      )
    ).toBe(true)
  })

  it('não trata /login e /login?gestor como a mesma rota', () => {
    expect(mesmaRotaLocal({ pathname: '/login', search: '' }, '/login?gestor')).toBe(
      false
    )
  })

  it('não trata /pedidos?gestor como login', () => {
    expect(
      mesmaRotaLocal({ pathname: '/pedidos', search: '?gestor' }, '/login?gestor')
    ).toBe(false)
  })
})

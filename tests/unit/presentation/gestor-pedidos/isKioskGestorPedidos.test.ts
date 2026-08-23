import { describe, expect, it } from 'vitest'
import {
  deveEsconderTopNavNoGestorPedidos,
  isRotaPedidos,
  isSinalKioskGestorPedidos,
} from '@/src/presentation/gestor-pedidos/isKioskGestorPedidos'

describe('rota /pedidos', () => {
  it('reconhece o quadro e ignora rotas mortas', () => {
    expect(isRotaPedidos('/pedidos')).toBe(true)
    expect(isRotaPedidos('/pedidos/abrir-windows')).toBe(true)
    expect(isRotaPedidos('/pedidos-clientes')).toBe(false)
    expect(isRotaPedidos('/gestor-pedidos')).toBe(false)
    expect(isRotaPedidos('/portal-pedidos')).toBe(false)
    expect(isRotaPedidos('/dashboard')).toBe(false)
  })

  it('sinal extra de kiosk: Tauri ou query (dev no browser)', () => {
    expect(isSinalKioskGestorPedidos({ hasTauri: true })).toBe(true)
    expect(isSinalKioskGestorPedidos({ hasTauri: false, search: 'gestor' })).toBe(true)
    expect(isSinalKioskGestorPedidos({ hasTauri: false, search: 'gestor=1' })).toBe(true)
    expect(isSinalKioskGestorPedidos({ hasTauri: false, search: 'kiosk=1' })).toBe(false)
    expect(isSinalKioskGestorPedidos({ hasTauri: false, search: '' })).toBe(false)
  })

  it('esconde TopNav em /pedidos só com sinal', () => {
    expect(deveEsconderTopNavNoGestorPedidos('/pedidos', { hasTauri: false, search: '' })).toBe(false)
    expect(
      deveEsconderTopNavNoGestorPedidos('/pedidos', { hasTauri: false, search: 'gestor' })
    ).toBe(true)
    expect(deveEsconderTopNavNoGestorPedidos('/dashboard', { hasTauri: true, search: '' })).toBe(
      false
    )
  })
})

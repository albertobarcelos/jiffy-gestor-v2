import { describe, expect, it } from 'vitest'
import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'
import {
  deveEsconderTopNavNoGestorPedidos,
  isRotaKioskPedidos,
  isRotaPermitidaNoJiffyFlow,
  isRotaPedidos,
  isRotaWhatsAppFlow,
  isSinalKioskGestorPedidos,
  lerSinalKioskFlowPersistido,
  pedidoVeioDoAppJiffyFlow,
} from '@/src/presentation/gestor-pedidos/kiosk/isKioskGestorPedidos'

describe('rota /pedidos', () => {
  it('reconhece o quadro e ignora rotas mortas', () => {
    expect(isRotaPedidos('/pedidos')).toBe(true)
    expect(isRotaPedidos('/pedidos/empresas')).toBe(true)
    expect(isRotaPedidos('/pedidos/whatsapp')).toBe(true)
    expect(isRotaWhatsAppFlow('/pedidos/whatsapp')).toBe(true)
    expect(
      isRotaWhatsAppFlow(stripGestaoEmpresaSlugFromPath('/gestao/ak-cmpfyj8p/pedidos/whatsapp'))
    ).toBe(true)
    expect(isRotaWhatsAppFlow('/pedidos')).toBe(false)
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

  it('não trata storage como se fosse o aplicativo instalado', () => {
    expect(lerSinalKioskFlowPersistido()).toBe(false)
  })

  it('distingue o .exe do Chrome pelo User-Agent', () => {
    expect(
      pedidoVeioDoAppJiffyFlow(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36 JiffyFlow/0.1.0'
      )
    ).toBe(true)
    expect(
      pedidoVeioDoAppJiffyFlow(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36'
      )
    ).toBe(false)
    expect(pedidoVeioDoAppJiffyFlow(null)).toBe(false)
  })

  it('lista e quadro do Flow são kiosk com ?gestor', () => {
    expect(isRotaKioskPedidos('/pedidos/empresas', '')).toBe(true)
    expect(isRotaKioskPedidos('/minhas-empresas', '?gestor')).toBe(false)
    expect(isRotaKioskPedidos('/pedidos/empresas', '?gestor')).toBe(true)
    expect(isRotaKioskPedidos('/pedidos', '?gestor')).toBe(true)
  })

  it('no .exe só conta, lista e quadro — nunca hub nem dashboard', () => {
    expect(isRotaPermitidaNoJiffyFlow('/pedidos/empresas')).toBe(true)
    expect(isRotaPermitidaNoJiffyFlow('/login')).toBe(true)
    expect(isRotaPermitidaNoJiffyFlow('/minhas-empresas')).toBe(false)
    expect(isRotaPermitidaNoJiffyFlow('/dashboard')).toBe(false)
    expect(isRotaPermitidaNoJiffyFlow('/')).toBe(false)
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

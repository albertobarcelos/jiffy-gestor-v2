import { describe, expect, it } from 'vitest'
import {
  mesmaRotaLocal,
  pathHubComSinalGestor,
  pathWhatsAppKiosk,
} from '@/src/presentation/gestor-pedidos/sessao/pathsGestorSessao'

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

describe('pathHubComSinalGestor', () => {
  it('no ERP web continua Minhas Empresas', () => {
    expect(pathHubComSinalGestor({ hasTauri: false, search: '' })).toBe('/minhas-empresas')
  })

  it('no casco Windows vai à lista do Flow, não ao hub', () => {
    expect(pathHubComSinalGestor({ hasTauri: true, search: '' })).toBe('/pedidos/empresas?gestor')
    expect(pathHubComSinalGestor({ hasTauri: false, search: '?gestor' })).toBe(
      '/pedidos/empresas?gestor'
    )
  })
})

describe('pathWhatsAppKiosk', () => {
  it('sem janela fica no path do Flow', () => {
    expect(pathWhatsAppKiosk()).toBe('/pedidos/whatsapp?gestor')
  })
})

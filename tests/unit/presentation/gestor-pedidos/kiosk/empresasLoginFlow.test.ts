import { describe, expect, it } from 'vitest'

const sessionStore = new Map<string, string>()
Object.defineProperty(globalThis, 'sessionStorage', {
  value: {
    getItem: (key: string) => sessionStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      sessionStore.set(key, value)
    },
    removeItem: (key: string) => {
      sessionStore.delete(key)
    },
    clear: () => sessionStore.clear(),
  },
  writable: true,
})

import {
  gravarEmpresasLoginFlow,
  lerEmpresasLoginFlow,
  STORAGE_EMPRESAS_LOGIN_FLOW,
} from '@/src/presentation/gestor-pedidos/kiosk/empresasLoginFlow'

describe('empresasLoginFlow', () => {
  it('grava e lê a lista do login', () => {
    sessionStorage.clear()
    gravarEmpresasLoginFlow([
      { id: 'a', nomeFantasia: 'Alpha', cnpj: '1', bloqueado: false },
      { id: 'b', nomeFantasia: 'Beta', cnpj: '2', bloqueado: false },
    ])
    expect(lerEmpresasLoginFlow().map(e => e.id)).toEqual(['a', 'b'])
  })

  it('ignora payload inválido', () => {
    sessionStorage.setItem(STORAGE_EMPRESAS_LOGIN_FLOW, '{')
    expect(lerEmpresasLoginFlow()).toEqual([])
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import {
  gravarUltimaEmpresaKiosk,
  lerUltimaEmpresaKiosk,
  resolverEmpresaInicialKiosk,
  STORAGE_ULTIMA_EMPRESA_KIOSK,
} from '@/src/presentation/gestor-pedidos/kiosk/ultimaEmpresaKiosk'

const store = new Map<string, string>()
const localStorageShim = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
  removeItem: (key: string) => {
    store.delete(key)
  },
}

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageShim,
  writable: true,
})

const empresa = (id: string, nome = id): LoginEmpresaSnapshot => ({
  id,
  nomeFantasia: nome,
  cnpj: '00000000000000',
  bloqueado: false,
})

describe('ultimaEmpresaKiosk', () => {
  beforeEach(() => {
    store.clear()
  })

  it('grava e lê a última empresa', () => {
    gravarUltimaEmpresaKiosk({
      userId: 'user-1',
      empresaId: 'emp-b',
      empParam: 'loja-b-abcd1234',
    })
    expect(lerUltimaEmpresaKiosk()).toEqual({
      userId: 'user-1',
      empresaId: 'emp-b',
      empParam: 'loja-b-abcd1234',
    })
    expect(store.get(STORAGE_ULTIMA_EMPRESA_KIOSK)).toContain('emp-b')
  })

  it('escolhe a última se ainda estiver na lista', () => {
    gravarUltimaEmpresaKiosk({
      userId: 'user-1',
      empresaId: 'emp-b',
      empParam: 'loja-b-abcd1234',
    })
    expect(
      resolverEmpresaInicialKiosk([empresa('emp-a'), empresa('emp-b')], 'user-1')?.id
    ).toBe('emp-b')
  })

  it('cai na primeira se a última saiu da lista', () => {
    gravarUltimaEmpresaKiosk({
      userId: 'user-1',
      empresaId: 'emp-z',
      empParam: 'loja-z-abcd1234',
    })
    expect(
      resolverEmpresaInicialKiosk([empresa('emp-a'), empresa('emp-b')], 'user-1')?.id
    ).toBe('emp-a')
  })

  it('sem histórico escolhe a primeira', () => {
    expect(resolverEmpresaInicialKiosk([empresa('emp-a'), empresa('emp-b')], 'user-1')?.id).toBe(
      'emp-a'
    )
  })

  it('não reutiliza a empresa de outro utilizador', () => {
    gravarUltimaEmpresaKiosk({
      userId: 'user-1',
      empresaId: 'emp-b',
      empParam: 'loja-b-abcd1234',
    })
    expect(
      resolverEmpresaInicialKiosk([empresa('emp-a'), empresa('emp-b')], 'user-2')?.id
    ).toBe('emp-a')
  })
})

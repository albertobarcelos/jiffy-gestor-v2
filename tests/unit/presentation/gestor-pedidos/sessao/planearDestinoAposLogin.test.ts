import { describe, expect, it } from 'vitest'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { escolherEmpresaUnicaAtiva } from '@/src/presentation/gestor-pedidos/sessao/escolherEmpresaUnicaAtiva'
import { planearDestinoAposLogin } from '@/src/presentation/gestor-pedidos/sessao/planearDestinoAposLogin'

const ativa = (id: string): LoginEmpresaSnapshot => ({
  id,
  nomeFantasia: `Empresa ${id}`,
  cnpj: '00000000000000',
  bloqueado: false,
})

describe('escolherEmpresaUnicaAtiva', () => {
  it('só entra automático com exatamente uma ativa', () => {
    expect(escolherEmpresaUnicaAtiva([ativa('a')])?.id).toBe('a')
    expect(escolherEmpresaUnicaAtiva([ativa('a'), ativa('b')])).toBeNull()
    expect(escolherEmpresaUnicaAtiva([{ ...ativa('a'), bloqueado: true }])).toBeNull()
    expect(escolherEmpresaUnicaAtiva([])).toBeNull()
  })
})

describe('planearDestinoAposLogin', () => {
  it('no browser ERP continua no hub', () => {
    expect(
      planearDestinoAposLogin({
        empresas: [ativa('a')],
        sinalGestor: { hasTauri: false, search: '' },
      })
    ).toEqual({ tipo: 'hub', path: '/minhas-empresas' })
  })

  it('no gestor com uma empresa vai ao quadro', () => {
    const empresa = ativa('a')
    expect(
      planearDestinoAposLogin({
        empresas: [empresa],
        sinalGestor: { hasTauri: true, search: '' },
      })
    ).toEqual({ tipo: 'pedidos-gestor', empresa })
  })

  it('no Flow com várias empresas e sem última vai à lista, não ao hub', () => {
    expect(
      planearDestinoAposLogin({
        empresas: [ativa('a'), ativa('b')],
        sinalGestor: { hasTauri: false, search: 'gestor' },
      })
    ).toEqual({ tipo: 'escolher-empresa-kiosk', path: '/pedidos/empresas?gestor' })
  })

  it('no Flow com várias empresas vai à lista mesmo com última gravada', () => {
    expect(
      planearDestinoAposLogin({
        empresas: [ativa('a'), ativa('b')],
        sinalGestor: { hasTauri: true, search: '' },
        ultimaEmpresaId: 'b',
      })
    ).toEqual({ tipo: 'escolher-empresa-kiosk', path: '/pedidos/empresas?gestor' })
  })

  it('no Flow ignora última empresa que já não está na lista', () => {
    expect(
      planearDestinoAposLogin({
        empresas: [ativa('a'), ativa('b')],
        sinalGestor: { hasTauri: true, search: '' },
        ultimaEmpresaId: 'sumiu',
      })
    ).toEqual({ tipo: 'escolher-empresa-kiosk', path: '/pedidos/empresas?gestor' })
  })
})

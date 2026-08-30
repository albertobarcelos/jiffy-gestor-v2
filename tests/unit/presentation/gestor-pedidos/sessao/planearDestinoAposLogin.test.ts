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

  it('no gestor com várias empresas vai ao quadro, não ao hub', () => {
    expect(
      planearDestinoAposLogin({
        empresas: [ativa('a'), ativa('b')],
        sinalGestor: { hasTauri: false, search: 'gestor' },
      })
    ).toEqual({ tipo: 'quadro-kiosk', path: '/pedidos?gestor' })
  })
})

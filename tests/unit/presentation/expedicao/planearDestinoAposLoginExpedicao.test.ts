import { describe, expect, it } from 'vitest'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { planearDestinoAposLoginExpedicao } from '@/src/presentation/expedicao/sessao/planearDestinoAposLoginExpedicao'

const ativa = (id: string): LoginEmpresaSnapshot => ({
  id,
  nomeFantasia: `Empresa ${id}`,
  cnpj: '00000000000000',
  bloqueado: false,
})

describe('planearDestinoAposLoginExpedicao', () => {
  it('com uma empresa vai à bancada', () => {
    const empresa = ativa('a')
    expect(planearDestinoAposLoginExpedicao({ empresas: [empresa] })).toEqual({
      tipo: 'expedicao',
      empresa,
      superficie: 'bancada',
    })
  })

  it('com várias empresas vai à lista', () => {
    expect(planearDestinoAposLoginExpedicao({ empresas: [ativa('a'), ativa('b')] })).toEqual({
      tipo: 'escolher-empresa',
      path: '/expedicao/empresas?expedicao',
    })
  })

  it('no app preserva a superfície do entregador', () => {
    const empresa = ativa('a')
    expect(planearDestinoAposLoginExpedicao({ empresas: [empresa], superficie: 'app' })).toEqual({
      tipo: 'expedicao',
      empresa,
      superficie: 'app',
    })
    expect(
      planearDestinoAposLoginExpedicao({ empresas: [ativa('a'), ativa('b')], superficie: 'app' })
    ).toEqual({
      tipo: 'escolher-empresa',
      path: '/expedicao/empresas?expedicao&app',
    })
  })
})

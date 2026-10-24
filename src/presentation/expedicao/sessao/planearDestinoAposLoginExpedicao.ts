import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { escolherEmpresaUnicaAtiva } from '@/src/presentation/gestor-pedidos/sessao/escolherEmpresaUnicaAtiva'
import { pathEscolherEmpresaExpedicao, type SuperficieExpedicao } from './pathsExpedicao'

export type DestinoAposLoginExpedicao =
  | { tipo: 'expedicao'; empresa: LoginEmpresaSnapshot; superficie: SuperficieExpedicao }
  | { tipo: 'escolher-empresa'; path: string }

export function planearDestinoAposLoginExpedicao(input: {
  empresas: readonly LoginEmpresaSnapshot[] | null | undefined
  superficie?: SuperficieExpedicao
  ultimaEmpresaId?: string | null
}): DestinoAposLoginExpedicao {
  const superficie = input.superficie ?? 'bancada'
  const unica = escolherEmpresaUnicaAtiva(input.empresas)
  if (unica) {
    return { tipo: 'expedicao', empresa: unica, superficie }
  }
  const ultimaId = input.ultimaEmpresaId?.trim()
  if (superficie === 'app' && ultimaId) {
    const persistida = (input.empresas ?? []).find(e => e.id === ultimaId && !e.bloqueado)
    if (persistida) {
      return { tipo: 'expedicao', empresa: persistida, superficie }
    }
  }
  return { tipo: 'escolher-empresa', path: pathEscolherEmpresaExpedicao(superficie) }
}

import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { escolherEmpresaUnicaAtiva } from '@/src/presentation/gestor-pedidos/sessao/escolherEmpresaUnicaAtiva'
import { pathEscolherEmpresaExpedicao, type SuperficieExpedicao } from './pathsExpedicao'

export type DestinoAposLoginExpedicao =
  | { tipo: 'expedicao'; empresa: LoginEmpresaSnapshot; superficie: SuperficieExpedicao }
  | { tipo: 'escolher-empresa'; path: string }

export function planearDestinoAposLoginExpedicao(input: {
  empresas: readonly LoginEmpresaSnapshot[] | null | undefined
  superficie?: SuperficieExpedicao
}): DestinoAposLoginExpedicao {
  const superficie = input.superficie ?? 'bancada'
  const unica = escolherEmpresaUnicaAtiva(input.empresas)
  if (unica) {
    return { tipo: 'expedicao', empresa: unica, superficie }
  }
  return { tipo: 'escolher-empresa', path: pathEscolherEmpresaExpedicao(superficie) }
}

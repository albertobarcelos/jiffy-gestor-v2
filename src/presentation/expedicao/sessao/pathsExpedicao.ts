import {
  EXPEDICAO_APP_PATH,
  EXPEDICAO_EMPRESAS_PATH,
  EXPEDICAO_PATH,
  QUERY_EXPEDICAO,
  QUERY_EXPEDICAO_APP,
} from '@/src/presentation/expedicao/constantes'
import { buildGestaoPath } from '@/src/shared/utils/gestaoRoutes'

export type SuperficieExpedicao = 'bancada' | 'app'

function queryExpedicao(superficie: SuperficieExpedicao): string {
  return superficie === 'app' ? `${QUERY_EXPEDICAO}&${QUERY_EXPEDICAO_APP}` : QUERY_EXPEDICAO
}

export function pathLoginExpedicao(superficie: SuperficieExpedicao = 'bancada'): string {
  return `/login?${queryExpedicao(superficie)}`
}

export function pathEscolherEmpresaExpedicao(superficie: SuperficieExpedicao = 'bancada'): string {
  return `${EXPEDICAO_EMPRESAS_PATH}?${queryExpedicao(superficie)}`
}

export function pathExpedicaoBancada(empParam?: string | null): string {
  const modulo = `${EXPEDICAO_PATH}?${QUERY_EXPEDICAO}`
  return empParam ? buildGestaoPath(empParam, modulo) : modulo
}

export function pathExpedicaoApp(empParam?: string | null): string {
  const modulo = `${EXPEDICAO_APP_PATH}?${QUERY_EXPEDICAO}&${QUERY_EXPEDICAO_APP}`
  return empParam ? buildGestaoPath(empParam, modulo) : modulo
}

/** URL curta para instalar / abrir o app no celular. */
export function pathExpedicaoAppCurto(): string {
  return '/e'
}

export function pathExpedicaoDaSuperficie(
  superficie: SuperficieExpedicao,
  empParam?: string | null
): string {
  return superficie === 'app' ? pathExpedicaoApp(empParam) : pathExpedicaoBancada(empParam)
}

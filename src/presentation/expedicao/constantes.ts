/** App de expedição (bancada). Mesmo Gestor, outro sinal — não misturar com `?gestor`. */

export {
  EXPEDICAO_APP_PATH,
  EXPEDICAO_APP_PATH_CURTO,
  QUERY_EXPEDICAO_APP,
} from '@/src/application/expedicao/app/constantesSuperficie'

export const EXPEDICAO_PATH = '/expedicao'
export const EXPEDICAO_EMPRESAS_PATH = '/expedicao/empresas'
export const QUERY_EXPEDICAO = 'expedicao'

/** Sem ação na lista, a sessão do entregador cai. */
export const EXPEDICAO_INATIVIDADE_MS = 180_000

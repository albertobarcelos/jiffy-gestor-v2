import { isSuperficieExpedicaoApp } from '@/src/application/expedicao/app/detectarSuperficieExpedicao'
import { lerUltimaEmpresaApp } from './ultimaEmpresaAppStorage'

/** Empresa persistida do PWA — só na superfície do entregador. */
export function empresaIdRefreshExpedicaoApp(): string | null {
  if (typeof window === 'undefined') return null
  if (
    !isSuperficieExpedicaoApp({
      pathname: window.location.pathname,
      search: window.location.search,
      host: window.location.host,
    })
  ) {
    return null
  }
  return lerUltimaEmpresaApp()?.empresaId ?? null
}

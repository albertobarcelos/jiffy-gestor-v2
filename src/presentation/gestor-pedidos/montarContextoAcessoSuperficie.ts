import { ContextoAcessoSuperficieMapper } from '@/src/application/mappers/ContextoAcessoSuperficieMapper'
import type { ContextoAcessoSuperficie } from '@/src/domain/superficie/ContextoAcessoSuperficie'
import { criarContextoAcessoSuperficie } from '@/src/domain/superficie/ContextoAcessoSuperficie'
import { decodeToken } from '@/src/shared/utils/validateToken'
import { STORAGE_SOMENTE_PORTAL } from './constantes'

function lerOverrideSomentePortal(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(STORAGE_SOMENTE_PORTAL) === '1'
  } catch {
    return false
  }
}

export function montarContextoAcessoSuperficie(
  accessToken: string | null | undefined
): ContextoAcessoSuperficie {
  if (lerOverrideSomentePortal()) {
    return criarContextoAcessoSuperficie({
      somentePortalPedidos: true,
      modulosAcesso: ['portal-pedidos'],
      claimPortalPedidos: true,
    })
  }

  if (!accessToken) {
    return criarContextoAcessoSuperficie()
  }

  return ContextoAcessoSuperficieMapper.fromClaims(decodeToken(accessToken))
}

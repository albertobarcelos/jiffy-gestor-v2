import { ContextoAcessoSuperficieMapper } from '@/src/application/mappers/superficie/ContextoAcessoSuperficieMapper'
import type { ContextoAcessoSuperficie } from '@/src/domain/superficie/ContextoAcessoSuperficie'
import { criarContextoAcessoSuperficie } from '@/src/domain/superficie/ContextoAcessoSuperficie'
import { MODULO_CLAIM_PEDIDOS } from '@/src/domain/superficie/ContextoAcessoSuperficie'
import { decodeToken } from '@/src/shared/utils/validateToken'
import { STORAGE_SOMENTE_PEDIDOS } from '../constantes'

function lerOverrideSomentePedidos(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(STORAGE_SOMENTE_PEDIDOS) === '1'
  } catch {
    return false
  }
}

export function montarContextoAcessoSuperficie(
  accessToken: string | null | undefined
): ContextoAcessoSuperficie {
  if (lerOverrideSomentePedidos()) {
    return criarContextoAcessoSuperficie({
      somentePedidos: true,
      modulosAcesso: [MODULO_CLAIM_PEDIDOS],
      claimPedidos: true,
    })
  }

  if (!accessToken) {
    return criarContextoAcessoSuperficie()
  }

  return ContextoAcessoSuperficieMapper.fromClaims(decodeToken(accessToken))
}

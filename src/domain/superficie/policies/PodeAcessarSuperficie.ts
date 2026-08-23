import { Superficie } from '@/src/domain/superficie/Superficie'
import {
  type ContextoAcessoSuperficie,
  isOperadorSomentePortal,
  MODULO_PORTAL_PEDIDOS,
  temModulo,
} from '@/src/domain/superficie/ContextoAcessoSuperficie'

/**
 * Quem pode estar em cada superfície.
 * Utilizador sem sinais de portal continua no ERP (compatibilidade).
 * Portal vazio é visível a qualquer sessão ativa (preview); só o operador
 * exclusivo é barrado no ERP.
 */
export class PodeAcessarSuperficie {
  static check(superficie: Superficie, contexto: ContextoAcessoSuperficie): boolean {
    if (!contexto.usuarioAtivo) return false

    if (superficie.isErp()) {
      return !isOperadorSomentePortal(contexto)
    }

    if (superficie.isPortalPedidos()) {
      if (contexto.claimPortalPedidos === false && !temModulo(contexto, MODULO_PORTAL_PEDIDOS)) {
        return false
      }
      return true
    }

    return false
  }

  static assert(superficie: Superficie, contexto: ContextoAcessoSuperficie): void {
    if (!this.check(superficie, contexto)) {
      throw new Error(`Acesso negado à superfície ${superficie.getCodigo()}`)
    }
  }
}

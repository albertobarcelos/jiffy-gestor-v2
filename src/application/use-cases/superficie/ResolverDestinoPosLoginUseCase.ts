import type { ContextoAcessoSuperficie } from '@/src/domain/superficie/ContextoAcessoSuperficie'
import { isOperadorSomentePedidos } from '@/src/domain/superficie/ContextoAcessoSuperficie'
import { Superficie } from '@/src/domain/superficie/Superficie'
import {
  PATH_DASHBOARD_ERP,
  PATH_GESTOR_PEDIDOS,
} from '@/src/domain/superficie/policies/RotasDaSuperficie'
import type { DestinoPosLoginDTO } from '@/src/application/dto/superficie/DestinoPosLoginDTO'

export class ResolverDestinoPosLoginUseCase {
  execute(contexto: ContextoAcessoSuperficie): DestinoPosLoginDTO {
    if (isOperadorSomentePedidos(contexto)) {
      return {
        superficie: Superficie.GESTOR_PEDIDOS.getCodigo(),
        pathModulo: PATH_GESTOR_PEDIDOS,
      }
    }
    return {
      superficie: Superficie.ERP.getCodigo(),
      pathModulo: PATH_DASHBOARD_ERP,
    }
  }
}

export const resolverDestinoPosLoginUseCase = new ResolverDestinoPosLoginUseCase()

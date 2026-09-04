import type { ContextoAcessoSuperficie } from '@/src/domain/superficie/ContextoAcessoSuperficie'
import { Superficie } from '@/src/domain/superficie/Superficie'
import { PodeAcessarSuperficie } from '@/src/domain/superficie/policies/PodeAcessarSuperficie'
import {
  isRotaQuadroPedidos,
  isRotaPublicaAuth,
  isRotaSessaoHub,
  normalizarPathModulo,
  PATH_DASHBOARD_ERP,
  PATH_GESTOR_PEDIDOS,
} from '@/src/domain/superficie/policies/RotasDaSuperficie'
import type { AutorizacaoRotaSuperficieDTO } from '@/src/application/dto/superficie/DestinoPosLoginDTO'
import { ResolverDestinoPosLoginUseCase } from './ResolverDestinoPosLoginUseCase'

export class AutorizarRotaNaSuperficieUseCase {
  constructor(private readonly resolverDestino = new ResolverDestinoPosLoginUseCase()) {}

  execute(input: {
    pathModulo: string
    contexto: ContextoAcessoSuperficie
  }): AutorizacaoRotaSuperficieDTO {
    const pathModulo = normalizarPathModulo(input.pathModulo)
    const destino = this.resolverDestino.execute(input.contexto)
    const superficie = Superficie.create(destino.superficie)

    if (isRotaPublicaAuth(pathModulo) || isRotaSessaoHub(pathModulo)) {
      return {
        permitido: true,
        pathModulo,
        destinoSeNegado: destino.pathModulo,
        superficie: destino.superficie,
      }
    }

    if (isRotaQuadroPedidos(pathModulo)) {
      const permitido = PodeAcessarSuperficie.check(Superficie.GESTOR_PEDIDOS, input.contexto)
      return {
        permitido,
        pathModulo,
        destinoSeNegado: permitido ? pathModulo : PATH_DASHBOARD_ERP,
        superficie: destino.superficie,
      }
    }

    const permitido = PodeAcessarSuperficie.check(Superficie.ERP, input.contexto)
    return {
      permitido,
      pathModulo,
      destinoSeNegado: permitido ? pathModulo : PATH_GESTOR_PEDIDOS,
      superficie: superficie.getCodigo(),
    }
  }
}

export const autorizarRotaNaSuperficieUseCase = new AutorizarRotaNaSuperficieUseCase()

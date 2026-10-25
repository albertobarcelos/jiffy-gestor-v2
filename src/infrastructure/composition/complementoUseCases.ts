import { BuscarComplementoCompletoGestorUseCase } from '@/src/application/use-cases/complementos/BuscarComplementoCompletoGestorUseCase'
import { GravarOverridesComplementoGestorUseCase } from '@/src/application/use-cases/complementos/GravarOverridesComplementoGestorUseCase'
import { ListarUsosParaPropagarComplementoUseCase } from '@/src/application/use-cases/complementos/ListarUsosParaPropagarComplementoUseCase'
import { propagacaoComplementoApi } from '@/src/infrastructure/api/propagacaoComplementoApi'

export const buscarComplementoCompletoGestorUseCase = new BuscarComplementoCompletoGestorUseCase(
  propagacaoComplementoApi
)

export const listarUsosParaPropagarComplementoUseCase =
  new ListarUsosParaPropagarComplementoUseCase(buscarComplementoCompletoGestorUseCase)

export const gravarOverridesComplementoGestorUseCase = new GravarOverridesComplementoGestorUseCase(
  propagacaoComplementoApi
)

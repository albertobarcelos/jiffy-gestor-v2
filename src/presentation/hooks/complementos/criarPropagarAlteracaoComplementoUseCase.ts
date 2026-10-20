import { PropagarAlteracaoComplementoUseCase } from '@/src/application/use-cases/complementos/PropagarAlteracaoComplementoUseCase'
import { propagacaoComplementoApi } from '@/src/infrastructure/api/propagacaoComplementoApi'

export function criarPropagarAlteracaoComplementoUseCase(): PropagarAlteracaoComplementoUseCase {
  return new PropagarAlteracaoComplementoUseCase(propagacaoComplementoApi)
}

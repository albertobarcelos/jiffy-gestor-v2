import { PersistirCadastroComplementoUseCase } from '@/src/application/use-cases/complementos/PersistirCadastroComplementoUseCase'
import { cadastroComplementoApi } from '@/src/infrastructure/api/cadastroComplementoApi'

export function criarPersistirCadastroComplementoUseCase(): PersistirCadastroComplementoUseCase {
  return new PersistirCadastroComplementoUseCase(cadastroComplementoApi)
}

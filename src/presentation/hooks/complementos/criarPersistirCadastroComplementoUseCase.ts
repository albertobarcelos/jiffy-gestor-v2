import { PersistirCadastroComplementoUseCase } from '@/src/application/use-cases/complementos/PersistirCadastroComplementoUseCase'
import { cadastroComplementoApi } from '@/src/infrastructure/api/cadastroComplementoApi'
import { complementoImagemMedia } from '@/src/infrastructure/api/deliveryMediaApi'

export function criarPersistirCadastroComplementoUseCase(): PersistirCadastroComplementoUseCase {
  return new PersistirCadastroComplementoUseCase(cadastroComplementoApi, complementoImagemMedia)
}

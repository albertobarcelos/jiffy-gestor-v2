import { AtualizarImpactoComplementoNosGruposSchema } from '@/src/application/dto/complementos/ComplementoOverrideSchemas'
import type {
  IComplementoOverrideRepository,
  ImpactoComplementoNoGrupo,
  ResultadoOverridesComplemento,
} from '@/src/domain/repositories/IComplementoOverrideRepository'

export class AtualizarImpactoComplementoNosGruposUseCase {
  constructor(private readonly repository: IComplementoOverrideRepository) {}

  async execute(input: {
    grupos: ImpactoComplementoNoGrupo[]
  }): Promise<ResultadoOverridesComplemento> {
    const data = AtualizarImpactoComplementoNosGruposSchema.parse(input)
    return this.repository.gravarOverrides({ grupos: data.grupos })
  }
}

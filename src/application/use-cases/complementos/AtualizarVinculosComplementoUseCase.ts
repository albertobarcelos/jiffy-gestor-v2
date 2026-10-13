import { AtualizarVinculosComplementoSchema } from '@/src/application/dto/complementos/ComplementoOverrideSchemas'
import type {
  IComplementoOverrideRepository,
  ResultadoOverridesComplemento,
  VinculoComplementoOverride,
} from '@/src/domain/repositories/IComplementoOverrideRepository'

export class AtualizarVinculosComplementoUseCase {
  constructor(private readonly repository: IComplementoOverrideRepository) {}

  async execute(input: {
    vinculos: VinculoComplementoOverride[]
  }): Promise<ResultadoOverridesComplemento> {
    const data = AtualizarVinculosComplementoSchema.parse(input)
    return this.repository.gravarOverrides({ vinculos: data.vinculos })
  }
}

import { AtualizarOverridesComplementoSchema } from '@/src/application/dto/complementos/ComplementoOverrideSchemas'
import type {
  IComplementoOverrideRepository,
  ResultadoOverridesComplemento,
} from '@/src/domain/repositories/IComplementoOverrideRepository'

/** Grava valor/ativo de cardápio e/ou impacto por grupo num único PATCH. */
export class AtualizarOverridesComplementoUseCase {
  constructor(private readonly repository: IComplementoOverrideRepository) {}

  async execute(input: unknown): Promise<ResultadoOverridesComplemento> {
    const data = AtualizarOverridesComplementoSchema.parse(input)
    return this.repository.gravarOverrides({
      vinculos: data.vinculos,
      grupos: data.grupos,
    })
  }
}

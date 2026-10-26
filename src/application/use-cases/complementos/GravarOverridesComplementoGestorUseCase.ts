import { AtualizarOverridesComplementoSchema } from '@/src/application/dto/complementos/ComplementoOverrideSchemas'
import type { IPropagacaoComplemento } from '@/src/application/ports/IPropagacaoComplemento'
import type {
  ImpactoComplementoNoGrupo,
  ResultadoOverridesComplemento,
  VinculoComplementoOverride,
} from '@/src/domain/repositories/IComplementoOverrideRepository'

export class GravarOverridesComplementoGestorUseCase {
  constructor(private readonly propagacao: IPropagacaoComplemento) {}

  async execute(input: {
    token: string
    vinculos?: VinculoComplementoOverride[]
    grupos?: ImpactoComplementoNoGrupo[]
  }): Promise<ResultadoOverridesComplemento> {
    const token = input.token.trim()
    if (!token) {
      throw new Error('Token não encontrado. Faça login novamente.')
    }

    const semVinculos =
      input.vinculos === undefined || (Array.isArray(input.vinculos) && input.vinculos.length === 0)
    const semGrupos =
      input.grupos === undefined || (Array.isArray(input.grupos) && input.grupos.length === 0)
    if (semVinculos && semGrupos) {
      return { message: 'Nada para gravar', atualizados: 0 }
    }

    const vinculos =
      Array.isArray(input.vinculos) && input.vinculos.length === 0
        ? undefined
        : input.vinculos
    const grupos =
      Array.isArray(input.grupos) && input.grupos.length === 0
        ? undefined
        : input.grupos
    const data = AtualizarOverridesComplementoSchema.parse({
      ...(vinculos !== undefined ? { vinculos } : {}),
      ...(grupos !== undefined ? { grupos } : {}),
    })
    return this.propagacao.gravarOverrides(
      {
        ...(data.vinculos ? { vinculos: data.vinculos } : {}),
        ...(data.grupos ? { grupos: data.grupos } : {}),
      },
      token
    )
  }
}

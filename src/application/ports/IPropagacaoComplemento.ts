import type { ComplementoCompleto } from '@/src/domain/complemento/tipos'
import type {
  ImpactoComplementoNoGrupo,
  ResultadoOverridesComplemento,
  VinculoComplementoOverride,
} from '@/src/domain/repositories/IComplementoOverrideRepository'

/**
 * Lê usos do complemento e grava exceção de cardápio/grupo.
 * A implementação fala com o BFF; o cadastro do complemento não entra aqui.
 */
export interface IPropagacaoComplemento {
  buscarCompleto(complementoId: string, token: string): Promise<ComplementoCompleto>
  gravarVinculos(vinculos: VinculoComplementoOverride[], token: string): Promise<void>
  gravarOverrides(
    input: {
      vinculos?: VinculoComplementoOverride[]
      grupos?: ImpactoComplementoNoGrupo[]
    },
    token: string
  ): Promise<ResultadoOverridesComplemento>
}

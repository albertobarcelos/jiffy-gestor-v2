import type {
  ComplementoCompleto,
  TipoImpactoPreco,
} from '@/src/domain/complemento/tipos'

/** Valor e/ou ativo só naquele produto daquele cardápio. `produtoId` é o id do cadastro. */
export type VinculoComplementoOverride = {
  menuId: string
  produtoId: string
  complementoId: string
  grupoComplementoId: string
  valor?: number
  ativo?: boolean
}

/** Impacto do complemento dentro de um grupo. Vale em todo cardápio que usa o grupo. */
export type ImpactoComplementoNoGrupo = {
  grupoComplementoId: string
  complementoId: string
  tipoImpactoPreco: TipoImpactoPreco
}

export type ResultadoOverridesComplemento = {
  message: string
  atualizados: number
}

/**
 * Porta de exceção do complemento (vínculo de menu, impacto no grupo e ordem no cardápio).
 * Não altera a entidade de cadastro.
 */
export interface IComplementoOverrideRepository {
  buscarCompleto(id: string): Promise<ComplementoCompleto | null>
  gravarOverrides(input: {
    vinculos?: VinculoComplementoOverride[]
    grupos?: ImpactoComplementoNoGrupo[]
  }): Promise<ResultadoOverridesComplemento>
  reordenarGrupoNoMenu(
    menuId: string,
    produtoId: string,
    grupoComplementoId: string,
    novaPosicao: number
  ): Promise<void>
  reordenarComplementoNoMenu(
    menuId: string,
    produtoId: string,
    grupoComplementoId: string,
    complementoId: string,
    novaPosicao: number
  ): Promise<void>
}

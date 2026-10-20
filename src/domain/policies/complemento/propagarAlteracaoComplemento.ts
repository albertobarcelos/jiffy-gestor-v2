import type { ComplementoUsoNoMenu } from '@/src/domain/complemento/tipos'
import type { VinculoComplementoOverride } from '@/src/domain/repositories/IComplementoOverrideRepository'

/** Campos que o cardápio guarda por uso. Só estes podem ser copiados para outros locais. */
export type AlteracaoComplementoPropagavel = {
  valor?: number
  ativo?: boolean
}

/** Uso que está sendo editado. Ele não entra na lista de destinos. */
export type OrigemUsoComplemento = {
  menuId: string
  produtoId: string
  grupoComplementoId: string
}

function centavos(valor: number): number {
  return Math.round(valor * 100)
}

export function chaveUsoComplemento(uso: {
  menuProdutoId: string
  grupoComplementos: { id: string }
}): string {
  return `${uso.menuProdutoId}:${uso.grupoComplementos.id}`
}

/**
 * Retorna só o que mudou em valor ou ativo.
 * Nome, descrição, foto e impacto de preço não entram: o cardápio não tem cópia desses campos.
 */
export function alteracaoValorAtivo(params: {
  valorAnterior: number
  ativoAnterior: boolean
  valorNovo: number
  ativoNovo: boolean
}): AlteracaoComplementoPropagavel | null {
  const alteracao: AlteracaoComplementoPropagavel = {}
  if (centavos(params.valorAnterior) !== centavos(params.valorNovo)) {
    alteracao.valor = params.valorNovo
  }
  if (params.ativoAnterior !== params.ativoNovo) {
    alteracao.ativo = params.ativoNovo
  }
  if (alteracao.valor === undefined && alteracao.ativo === undefined) return null
  return alteracao
}

export function usosParaPropagar(
  usos: ComplementoUsoNoMenu[],
  origem?: OrigemUsoComplemento | null
): ComplementoUsoNoMenu[] {
  if (!origem) return usos
  const menuId = origem.menuId.trim()
  const produtoId = origem.produtoId.trim()
  const grupoId = origem.grupoComplementoId.trim()
  return usos.filter(
    uso =>
      !(
        uso.menu.id === menuId &&
        uso.produto.id === produtoId &&
        uso.grupoComplementos.id === grupoId
      )
  )
}

export function montarVinculosPropagacao(params: {
  complementoId: string
  usos: ComplementoUsoNoMenu[]
  alteracao: AlteracaoComplementoPropagavel
}): VinculoComplementoOverride[] {
  if (params.alteracao.valor === undefined && params.alteracao.ativo === undefined) {
    return []
  }
  return params.usos.map(uso => ({
    menuId: uso.menu.id,
    produtoId: uso.produto.id,
    complementoId: params.complementoId,
    grupoComplementoId: uso.grupoComplementos.id,
    ...(params.alteracao.valor !== undefined ? { valor: params.alteracao.valor } : {}),
    ...(params.alteracao.ativo !== undefined ? { ativo: params.alteracao.ativo } : {}),
  }))
}

import type { ComplementoCompleto, ComplementoUsoNoMenu } from '@/src/domain/complemento/tipos'
import type { IPropagacaoComplemento } from '@/src/application/ports/IPropagacaoComplemento'
import {
  usosParaPropagar,
  type OrigemUsoComplemento,
} from '@/src/domain/policies/complemento/propagarAlteracaoComplemento'
import type { VinculoComplementoOverride } from '@/src/domain/repositories/IComplementoOverrideRepository'

function exigirToken(token: string): string {
  const valor = token.trim()
  if (!valor) {
    throw new Error('Token não encontrado. Faça login novamente.')
  }
  return valor
}

function exigirComplementoId(id: string): string {
  const valor = id.trim()
  if (!valor) {
    throw new Error('ID do complemento é obrigatório')
  }
  return valor
}

function vinculoPronto(vinculo: VinculoComplementoOverride): VinculoComplementoOverride | null {
  const menuId = vinculo.menuId.trim()
  const produtoId = vinculo.produtoId.trim()
  const complementoId = vinculo.complementoId.trim()
  const grupoComplementoId = vinculo.grupoComplementoId.trim()
  if (!menuId || !produtoId || !complementoId || !grupoComplementoId) return null
  if (vinculo.valor === undefined && vinculo.ativo === undefined) return null
  return {
    menuId,
    produtoId,
    complementoId,
    grupoComplementoId,
    ...(vinculo.valor !== undefined ? { valor: vinculo.valor } : {}),
    ...(vinculo.ativo !== undefined ? { ativo: vinculo.ativo } : {}),
  }
}

export class PropagarAlteracaoComplementoUseCase {
  constructor(private readonly porta: IPropagacaoComplemento) {}

  async buscarCompleto(params: {
    complementoId: string
    token: string
  }): Promise<ComplementoCompleto> {
    return this.porta.buscarCompleto(
      exigirComplementoId(params.complementoId),
      exigirToken(params.token)
    )
  }

  async listarUsosParaPropagar(params: {
    complementoId: string
    token: string
    origem?: OrigemUsoComplemento
  }): Promise<ComplementoUsoNoMenu[]> {
    const completo = await this.buscarCompleto(params)
    return usosParaPropagar(completo.vinculos ?? [], params.origem)
  }

  async aplicarVinculos(params: {
    token: string
    vinculos: VinculoComplementoOverride[]
  }): Promise<void> {
    const token = exigirToken(params.token)
    const vinculos = params.vinculos
      .map(vinculoPronto)
      .filter((item): item is VinculoComplementoOverride => item != null)
    if (vinculos.length === 0) return
    await this.porta.gravarVinculos(vinculos, token)
  }
}

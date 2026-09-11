import type { Produto } from '@/src/domain/entities/Produto'
import type { ToggleField } from '@/src/shared/types/produto'

export function toggleStatesFromProduto(produto: Produto): Record<ToggleField, boolean> {
  return {
    favorito: produto.isFavorito(),
    permiteAcrescimo: produto.permiteAcrescimoAtivo(),
    permiteDesconto: produto.permiteDescontoAtivo(),
    abreComplementos: produto.abreComplementosAtivo(),
    permiteAlterarPreco: produto.permiteAlterarPrecoAtivo(),
    incideTaxa: produto.incideTaxaAtivo(),
  }
}

import type { UpdateMenuProdutoInput } from '@/src/shared/types/menus'
import { toggleFieldConfig } from '@/src/presentation/components/features/produtos/ProdutosList/constants'
import { MENU_PRODUTO_PERMISSAO_FIELDS } from '@/src/shared/utils/menuProdutoPermissoes'

export function mensagemSucessoPatchMenu(input: UpdateMenuProdutoInput): string {
  if (input.favorito !== undefined) {
    return input.favorito ? 'Marcado como favorito neste cardápio' : 'Removido dos favoritos'
  }
  if (input.nome !== undefined) return 'Nome atualizado neste cardápio'
  if (input.valor !== undefined) return 'Preço atualizado neste cardápio'
  if (input.descricao !== undefined) return 'Descrição atualizada neste cardápio'
  if (input.gruposComplementosIds !== undefined) {
    return 'Complementos atualizados neste cardápio'
  }
  const permissaoField = MENU_PRODUTO_PERMISSAO_FIELDS.find(field => input[field] !== undefined)
  if (permissaoField !== undefined) {
    const cfg = toggleFieldConfig[permissaoField]
    return input[permissaoField] ? cfg.successTrue : cfg.successFalse
  }
  return 'Produto atualizado neste cardápio'
}

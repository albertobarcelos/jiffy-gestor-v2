'use client'

import { memo } from 'react'
import { CatalogProductRow } from '@/src/presentation/components/features/catalogo/CatalogProductRow'
import { MenuProdutoRowQuickActions } from '@/src/presentation/components/features/menus/MenuProdutoRowQuickActions'
import type { MenuProduto, UpdateMenuProdutoInput } from '@/src/shared/types/menus'
import { resolverImagemMenuProduto } from '@/src/shared/utils/catalogoProdutoIndex'
import type {
  MenuProdutoPermissaoField,
  MenuProdutoPermissoes,
} from '@/src/shared/utils/menuProdutoPermissoes'
import type { MenuProdutoListaSaving } from '@/src/presentation/hooks/menus/useMenuProdutoLista'

export type MenuProdutoCatalogRowProps = {
  produto: MenuProduto
  codigo?: string
  imagemCadastro?: string | null
  permissoesCadastro?: Partial<MenuProdutoPermissoes> | null
  saving: MenuProdutoListaSaving
  onNomeChange: (produtoId: string, nome: string) => void | boolean | Promise<void | boolean>
  onValorChange: (produtoId: string, valor: number) => void | boolean | Promise<void | boolean>
  onSwitchToggle: (produtoId: string, ativo: boolean) => void
  onEdit: (produtoId: string) => void
  onPatch: (
    produtoId: string,
    input: UpdateMenuProdutoInput
  ) => boolean | Promise<boolean>
  onTogglePermissao: (
    produtoId: string,
    field: MenuProdutoPermissaoField,
    value: boolean
  ) => boolean | Promise<boolean>
}

function MenuProdutoCatalogRowInner({
  produto,
  codigo,
  imagemCadastro,
  permissoesCadastro,
  saving,
  onNomeChange,
  onValorChange,
  onSwitchToggle,
  onEdit,
  onPatch,
  onTogglePermissao,
}: MenuProdutoCatalogRowProps) {
  return (
    <CatalogProductRow
      variant="menu"
      id={produto.produtoId}
      nome={produto.nome}
      valor={Number(produto.valor)}
      ativo={produto.ativo}
      imagemUrl={resolverImagemMenuProduto(produto, imagemCadastro)}
      codigo={codigo}
      isSavingValor={saving.valor}
      isSavingStatus={saving.status}
      isSavingNome={saving.nome}
      onNomeChange={onNomeChange}
      onValorChange={onValorChange}
      onSwitchToggle={onSwitchToggle}
      onEdit={onEdit}
      actionsSlot={
        <MenuProdutoRowQuickActions
          produto={produto}
          disabled={saving.acoes}
          permissoesCadastro={permissoesCadastro}
          onPatch={onPatch}
          onTogglePermissao={onTogglePermissao}
        />
      }
    />
  )
}

function areEqual(
  prev: MenuProdutoCatalogRowProps,
  next: MenuProdutoCatalogRowProps
): boolean {
  return (
    prev.produto === next.produto &&
    prev.codigo === next.codigo &&
    prev.imagemCadastro === next.imagemCadastro &&
    prev.permissoesCadastro === next.permissoesCadastro &&
    prev.saving.nome === next.saving.nome &&
    prev.saving.valor === next.saving.valor &&
    prev.saving.status === next.saving.status &&
    prev.saving.acoes === next.saving.acoes &&
    prev.onNomeChange === next.onNomeChange &&
    prev.onValorChange === next.onValorChange &&
    prev.onSwitchToggle === next.onSwitchToggle &&
    prev.onEdit === next.onEdit &&
    prev.onPatch === next.onPatch &&
    prev.onTogglePermissao === next.onTogglePermissao
  )
}

/** Linha memoizada do cardápio — evita re-render de todas as rows quando o pai atualiza. */
export const MenuProdutoCatalogRow = memo(MenuProdutoCatalogRowInner, areEqual)

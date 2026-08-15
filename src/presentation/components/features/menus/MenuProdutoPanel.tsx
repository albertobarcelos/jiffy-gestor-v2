'use client'

import { MenuProdutoSnapshotForm } from './MenuProdutoSnapshotForm'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import type { MenuProduto } from '@/src/shared/types/menus'
import { MENU_PRODUTO_FORM_ID, MENU_SIDE_PANEL_CLASS } from './menuPanelConstants'

interface MenuProdutoPanelProps {
  open: boolean
  menuId: string
  produto: MenuProduto | null
  onClose: () => void
}

/** Painel legado de snapshot; a edição no cardápio usa `MenuProdutoTabsModal`. */
export function MenuProdutoPanel({
  open,
  menuId,
  produto,
  onClose,
}: MenuProdutoPanelProps) {
  if (!produto) return null

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title="Editar produto no cardápio"
      subtitle={
        produto.nome ? (
          <span className="text-base font-medium normal-case"># {produto.nome}</span>
        ) : undefined
      }
      scrollableBody={false}
      footerVariant="bar"
      panelClassName={MENU_SIDE_PANEL_CLASS}
      footerActions={{
        showCancel: true,
        cancelLabel: 'Fechar',
        cancelVariant: 'primaryTint10',
        onCancel: onClose,
        showSave: true,
        saveLabel: 'Salvar',
        saveFormId: MENU_PRODUTO_FORM_ID,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <MenuProdutoSnapshotForm menuId={menuId} produto={produto} />
      </div>
    </JiffySidePanelModal>
  )
}

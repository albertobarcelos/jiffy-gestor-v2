'use client'

import { MenuGrupoSnapshotForm, MENU_GRUPO_SNAPSHOT_FORM_ID } from './MenuGrupoSnapshotForm'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import type { MenuGrupoProduto } from '@/src/shared/types/menus'
import { MENU_MODAL_CANCEL_VARIANT, MENU_SIDE_PANEL_CLASS } from './menuPanelConstants'

interface MenuCategoriaSnapshotPanelProps {
  open: boolean
  menuId: string
  grupo: MenuGrupoProduto | null
  onClose: () => void
}

export function MenuCategoriaSnapshotPanel({
  open,
  menuId,
  grupo,
  onClose,
}: MenuCategoriaSnapshotPanelProps) {
  if (!grupo) return null

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title="Editar categoria neste cardápio"
      subtitle={
        grupo.nome ? (
          <span className="text-base font-medium normal-case"># {grupo.nome}</span>
        ) : undefined
      }
      scrollableBody={false}
      footerVariant="bar"
      panelClassName={MENU_SIDE_PANEL_CLASS}
      footerActions={{
        showCancel: true,
        cancelLabel: 'Fechar',
        cancelVariant: MENU_MODAL_CANCEL_VARIANT,
        onCancel: onClose,
        showSave: true,
        saveLabel: 'Salvar',
        saveFormId: MENU_GRUPO_SNAPSHOT_FORM_ID,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <MenuGrupoSnapshotForm menuId={menuId} grupo={grupo} />
      </div>
    </JiffySidePanelModal>
  )
}

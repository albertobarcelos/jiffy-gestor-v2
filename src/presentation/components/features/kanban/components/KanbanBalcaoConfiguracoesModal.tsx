'use client'

import { useEffect, useState } from 'react'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { MenuParametroEmpresaSelect } from '@/src/presentation/components/features/configuracoes/MenuParametroEmpresaSelect'
import { useAtualizarParametroEmpresa } from '@/src/presentation/hooks/useAtualizarParametroEmpresa'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { showToast } from '@/src/shared/utils/toast'
import { patchMenuIdEmParametroEmpresa } from '@/src/shared/utils/parametroEmpresaMenus'

interface KanbanBalcaoConfiguracoesModalProps {
  open: boolean
  onClose: () => void
}

export function KanbanBalcaoConfiguracoesModal({
  open,
  onClose,
}: KanbanBalcaoConfiguracoesModalProps) {
  const { parametroEmpresa, menuVendaGestorId, isLoading } = useEmpresaMe()
  const atualizarParametroEmpresa = useAtualizarParametroEmpresa()
  const [menuId, setMenuId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMenuId(menuVendaGestorId)
  }, [open, menuVendaGestorId])

  const salvando = atualizarParametroEmpresa.isPending

  const handleSalvar = async () => {
    if (!menuId) {
      showToast.error('Selecione um cardápio para o balcão.')
      return
    }
    try {
      await atualizarParametroEmpresa.mutateAsync(
        patchMenuIdEmParametroEmpresa(parametroEmpresa, 'menuVendaGestorId', menuId)
      )
      showToast.success('Cardápio do balcão atualizado.')
      onClose()
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Não foi possível salvar o cardápio do balcão.'
      )
    }
  }

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title="Cardápio do balcão"
      subtitle="Escolha o menu usado nas vendas do Gestor neste canal."
      panelClassName="w-[min(28rem,96vw)] max-w-[100vw]"
      footerVariant="bar"
      footerActions={{
        barActionOrder: ['cancel', 'saveAndClose'],
        showCancel: true,
        cancelLabel: 'Fechar',
        cancelVariant: 'primaryTint10',
        onCancel: onClose,
        showSaveAndClose: true,
        saveAndCloseLabel: 'Salvar',
        onSaveAndClose: () => void handleSalvar(),
        saveAndCloseLoading: salvando,
        saveAndCloseDisabled: isLoading || salvando,
      }}
    >
      <div className="space-y-4 p-5 md:p-6">
        <MenuParametroEmpresaSelect
          id="kanban-balcao-menu"
          label="Cardápio em uso"
          description="Produtos e preços das vendas no balcão saem deste cardápio."
          value={menuId}
          onChange={setMenuId}
          disabled={isLoading || salvando}
        />
      </div>
    </JiffySidePanelModal>
  )
}

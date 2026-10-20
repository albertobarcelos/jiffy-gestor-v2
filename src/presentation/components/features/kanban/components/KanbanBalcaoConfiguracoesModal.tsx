'use client'

import { useEffect, useState } from 'react'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { MenuParametroEmpresaSelect } from '@/src/presentation/components/features/configuracoes/MenuParametroEmpresaSelect'
import { EstacaoDestePcCampos } from '@/src/presentation/components/features/estacao/EstacaoDestePcCampos'
import { useAtualizarParametroEmpresa } from '@/src/presentation/hooks/useAtualizarParametroEmpresa'
import { useConfigurarEstacaoDestePc } from '@/src/presentation/hooks/useConfigurarEstacaoDestePc'
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
  const {
    estacoes,
    estacaoId,
    ocupado,
    carregando: carregandoEstacao,
    selecionar,
    criar,
    renomear,
  } = useConfigurarEstacaoDestePc(open)
  const [menuId, setMenuId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMenuId(menuVendaGestorId)
  }, [open, menuVendaGestorId])

  const salvando = atualizarParametroEmpresa.isPending
  const bloqueado = isLoading || salvando || ocupado || carregandoEstacao

  const handleSalvar = async () => {
    if (!menuId) {
      showToast.error('Selecione um cardápio para o balcão.')
      return
    }
    if (!estacaoId.trim()) {
      showToast.error('Selecione a estação deste computador.')
      return
    }
    try {
      await atualizarParametroEmpresa.mutateAsync(
        patchMenuIdEmParametroEmpresa(parametroEmpresa, 'menuVendaGestorId', menuId)
      )
      showToast.success('Configurações do balcão atualizadas.')
      onClose()
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Não foi possível salvar as configurações do balcão.'
      )
    }
  }

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title="Configurações do balcão"
      subtitle="Cardápio das vendas e estação deste computador."
      panelClassName="w-[min(32rem,96vw)] max-w-[100vw]"
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
        saveAndCloseDisabled: bloqueado,
      }}
    >
      <div className="space-y-6 p-5 md:p-6">
        <MenuParametroEmpresaSelect
          id="kanban-balcao-menu"
          label="Cardápio em uso"
          description="Produtos e preços das vendas no balcão saem deste cardápio."
          value={menuId}
          onChange={setMenuId}
          disabled={bloqueado}
        />
        <EstacaoDestePcCampos
          estacoes={estacoes}
          estacaoId={estacaoId}
          mostrarReceptora={false}
          disabled={bloqueado}
          ocupado={ocupado}
          onSelecionar={selecionar}
          onCriar={criar}
          onRenomear={renomear}
        />
      </div>
    </JiffySidePanelModal>
  )
}

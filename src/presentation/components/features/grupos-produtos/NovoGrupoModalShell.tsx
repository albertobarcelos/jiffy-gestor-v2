'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovoGrupo } from './NovoGrupo'
import { GRUPO_PRODUTOS_MODAL_FORM_ID } from './grupoProdutosModalConstants'

interface NovoGrupoModalShellProps {
  grupoId?: string
}

/**
 * Páginas `/cadastros/grupos-produtos/novo` e `.../editar` — mesmo shell do modal da lista (`JiffySidePanelModal`).
 */
export function NovoGrupoModalShell({ grupoId }: NovoGrupoModalShellProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const mode = grupoId ? 'edit' : 'create'

  const title = useMemo(
    () =>
      mode === 'create'
        ? 'Novo Grupo de Produtos'
        : 'Editar Grupo de Produtos',
    [mode]
  )

  const [embedFormState, setEmbedFormState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })
  const [embedSubTab, setEmbedSubTab] = useState(0)

  const handleClose = () => {
    router.push('/cadastros/grupos-produtos')
    router.refresh()
    queryClient.invalidateQueries({ queryKey: ['grupos-produtos'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['produtos', 'infinite'] })
  }

  const footerActions =
    embedSubTab === 0
      ? {
          showSave: true,
          saveLabel: mode === 'edit' ? 'Atualizar' : 'Salvar',
          saveFormId: GRUPO_PRODUTOS_MODAL_FORM_ID,
          saveLoading: embedFormState.isSubmitting,
          saveDisabled:
            !embedFormState.canSubmit || embedFormState.isSubmitting,
        }
      : {
          showSave: true,
          saveLabel: 'Fechar',
          onSave: handleClose,
        }

  return (
    <JiffySidePanelModal
      open
      onClose={handleClose}
      title={title}
      scrollableBody={false}
      footerVariant="bar"
      panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,60vw)]"
      footerActions={footerActions}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <NovoGrupo
          grupoId={grupoId}
          isEmbedded
          embeddedFormId={GRUPO_PRODUTOS_MODAL_FORM_ID}
          hideEmbeddedFormActions
          onEmbedFormStateChange={setEmbedFormState}
          onEmbeddedTabChange={setEmbedSubTab}
          onClose={handleClose}
          onSaved={handleClose}
        />
      </div>
    </JiffySidePanelModal>
  )
}

'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovoGrupo, type NovoGrupoHandle } from './NovoGrupo'
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
  const [grupoNome, setGrupoNome] = useState('')

  const title = useMemo(
    () => (mode === 'create' ? 'Novo Grupo de Produtos' : 'Editar Grupo de Produtos'),
    [mode]
  )

  const subtitle = useMemo(() => {
    if (mode !== 'edit') return null
    const nome = grupoNome.trim()
    if (!nome) return null
    return <span className="text-sm font-medium normal-case">{nome}</span>
  }, [mode, grupoNome])

  const [embedFormState, setEmbedFormState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })
  const [embedSubTab, setEmbedSubTab] = useState(0)
  const ngRef = useRef<NovoGrupoHandle>(null)

  const handleClose = () => {
    router.push('/cadastros/grupos-produtos')
    router.refresh()
    queryClient.invalidateQueries({ queryKey: ['grupos-produtos'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['produtos', 'infinite'] })
  }

  const handleReloadCaches = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['grupos-produtos'], exact: false })
    void queryClient.invalidateQueries({
      queryKey: ['produtos', 'infinite'],
      exact: false,
      refetchType: 'active',
    })
  }, [queryClient])

  const handleSalvarGrupoAbaProdutos = useCallback(() => {
    void ngRef.current?.saveGrupo?.()
  }, [])

  const footerActions =
    embedSubTab === 0
      ? {
          showSave: true,
          saveLabel: 'Salvar',
          saveFormId: GRUPO_PRODUTOS_MODAL_FORM_ID,
          saveLoading: embedFormState.isSubmitting,
          saveDisabled:
            !embedFormState.canSubmit || embedFormState.isSubmitting,
        }
      : {
          showCancel: true,
          cancelLabel: 'Fechar',
          onCancel: handleClose,
          showSave: true,
          saveLabel: 'Salvar',
          onSave: handleSalvarGrupoAbaProdutos,
          saveLoading: embedFormState.isSubmitting,
          saveDisabled:
            !embedFormState.canSubmit || embedFormState.isSubmitting,
        }

  return (
    <JiffySidePanelModal
      open
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      scrollableBody={false}
      footerVariant="bar"
      panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,60vw)]"
      footerActions={footerActions}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <NovoGrupo
          ref={ngRef}
          grupoId={grupoId}
          isEmbedded
          embeddedFormId={GRUPO_PRODUTOS_MODAL_FORM_ID}
          hideEmbeddedFormActions
          onGrupoNomeChange={setGrupoNome}
          onEmbedFormStateChange={setEmbedFormState}
          onEmbeddedTabChange={setEmbedSubTab}
          onClose={handleClose}
          onReload={handleReloadCaches}
          onSaved={handleClose}
        />
      </div>
    </JiffySidePanelModal>
  )
}

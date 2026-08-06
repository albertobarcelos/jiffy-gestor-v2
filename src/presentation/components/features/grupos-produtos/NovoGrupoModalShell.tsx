'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovoGrupo, type NovoGrupoHandle } from './NovoGrupo'
import { GRUPO_PRODUTOS_MODAL_FORM_ID } from './grupoProdutosModalConstants'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'

interface NovoGrupoModalShellProps {
  grupoId?: string
}

/**
 * Páginas `/grupos-produtos/novo` e `.../editar` — mesmo shell do modal da lista (`JiffySidePanelModal`).
 */
export function NovoGrupoModalShell({ grupoId }: NovoGrupoModalShellProps) {
  const router = useRouter()
  const invalidate = useInvalidateTenantQueries()
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

  const invalidateListas = useCallback(async () => {
    await invalidate(['grupos-produtos'])
    await invalidate(['produtos', 'infinite'])
  }, [invalidate])

  const handleClose = () => {
    void invalidateListas()
    router.push('/grupos-produtos')
    router.refresh()
  }

  const handleReloadCaches = useCallback(() => {
    void invalidateListas()
  }, [invalidateListas])

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

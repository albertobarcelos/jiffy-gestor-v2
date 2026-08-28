'use client'

import { createPortal } from 'react-dom'
import { cn } from '@/src/shared/utils/cn'

export interface JiffyUnsavedChangesDialogProps {
  open: boolean
  title?: string
  description?: string
  continueLabel?: string
  exitLabel?: string
  onContinue: () => void
  onExit: () => void
  /** z-index acima do painel lateral (padrão 2000). */
  zIndex?: number
  titleId?: string
}

const DEFAULT_TITLE = 'Alterações não salvas'
const DEFAULT_DESCRIPTION =
  'Se você sair agora, perderá todas as informações digitadas e as alterações feitas neste cadastro. Nada será salvo até você concluir.'
const DEFAULT_CONTINUE_LABEL = 'Continuar editando'
const DEFAULT_EXIT_LABEL = 'Sair'

/**
 * Modal central ao tentar fechar um fluxo com rascunho não salvo.
 */
export function JiffyUnsavedChangesDialog({
  open,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  continueLabel = DEFAULT_CONTINUE_LABEL,
  exitLabel = DEFAULT_EXIT_LABEL,
  onContinue,
  onExit,
  zIndex = 2000,
  titleId = 'jiffy-unsaved-changes-title',
}: JiffyUnsavedChangesDialogProps) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 md:p-4"
      style={{ zIndex }}
      role="presentation"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onContinue()
      }}
    >
      <div
        className="w-[85vw] max-w-[85vw] rounded-lg bg-white p-6 shadow-lg md:w-auto md:max-w-md"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h3 id={titleId} className="mb-4 text-lg font-semibold text-primary-text">
          {title}
        </h3>
        <p className="mb-6 text-sm text-secondary-text">{description}</p>
        <div className="flex flex-col justify-end gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onContinue}
            className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            {continueLabel}
          </button>
          <button
            type="button"
            onClick={onExit}
            className={cn(
              'rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-secondary-text transition-colors hover:bg-gray-50'
            )}
          >
            {exitLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

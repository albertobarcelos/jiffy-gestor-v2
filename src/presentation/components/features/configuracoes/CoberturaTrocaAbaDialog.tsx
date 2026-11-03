'use client'

import { createPortal } from 'react-dom'

export function CoberturaTrocaAbaDialog({
  aberto,
  salvando,
  onCancelar,
  onSairSemSalvar,
  onSalvar,
}: {
  aberto: boolean
  salvando: boolean
  onCancelar: () => void
  onSairSemSalvar: () => void
  onSalvar: () => void
}) {
  if (!aberto || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 md:p-4"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !salvando) onCancelar()
      }}
    >
      <div
        className="w-[85vw] max-w-[85vw] rounded-lg bg-white p-6 shadow-lg md:w-auto md:max-w-md"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cobertura-troca-aba-title"
      >
        <h3
          id="cobertura-troca-aba-title"
          className="mb-4 text-lg font-semibold text-primary-text"
        >
          Alterações não salvas
        </h3>
        <p className="mb-6 text-sm text-secondary-text">
          Você pode salvar antes de sair ou descartar as alterações.
        </p>
        <div className="mb-2 flex flex-col justify-between gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
          <button
            type="button"
            onClick={onCancelar}
            disabled={salvando}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            Continuar editando
          </button>
          <button
            type="button"
            onClick={onSairSemSalvar}
            disabled={salvando}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-secondary-text transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            Sair sem salvar
          </button>
        </div>
        <button
          type="button"
          onClick={onSalvar}
          disabled={salvando}
          className="w-full rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </div>,
    document.body
  )
}

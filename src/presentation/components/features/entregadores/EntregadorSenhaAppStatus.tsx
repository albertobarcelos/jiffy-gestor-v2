'use client'

import { MdLock } from 'react-icons/md'

type EntregadorSenhaAppStatusProps = {
  cadastrada: boolean
  disabled?: boolean
  onAlterar: () => void
}

export function EntregadorSenhaAppStatus({
  cadastrada,
  disabled,
  onAlterar,
}: EntregadorSenhaAppStatusProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <MdLock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-primary-text">Senha do app</p>
            <span
              className={
                cadastrada
                  ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700'
                  : 'rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700'
              }
            >
              {cadastrada ? 'Cadastrada' : 'Não cadastrada'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-secondary-text">
            {cadastrada
              ? 'A senha atual não é exibida. Só é possível alterar.'
              : 'Defina 4 dígitos para o entregador entrar no app.'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAlterar}
        disabled={disabled}
        className="h-8 shrink-0 rounded-lg border border-primary/30 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
      >
        {cadastrada ? 'Alterar senha' : 'Cadastrar senha'}
      </button>
    </div>
  )
}

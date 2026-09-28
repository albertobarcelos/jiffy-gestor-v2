'use client'

import { MdArrowBack, MdClose } from 'react-icons/md'
import { TbCashRegister } from 'react-icons/tb'
import { cn } from '@/src/shared/utils/cn'

function StatusBadge({
  aberta,
  loading,
}: {
  aberta?: boolean
  loading?: boolean
}) {
  if (loading) {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
        …
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        aberta ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
      )}
    >
      {aberta ? 'Aberto' : 'Fechado'}
    </span>
  )
}

export function CaixaPanelHeader({
  aba,
  aberta,
  loading,
  onVoltar,
  onClose,
}: {
  aba: 'atual' | 'recentes'
  aberta?: boolean
  loading?: boolean
  onVoltar?: () => void
  onClose: () => void
}) {
  const titulo = aba === 'recentes' ? 'Caixas recentes' : 'Meu Caixa'

  return (
    <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-4">
      {aba === 'recentes' && onVoltar ? (
        <button
          type="button"
          onClick={onVoltar}
          className="mb-3 flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-80"
        >
          <MdArrowBack className="h-4 w-4" aria-hidden />
          Voltar
        </button>
      ) : null}

      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            aba === 'recentes'
              ? 'bg-gray-100 text-secondary-text'
              : aberta
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-primary/10 text-primary'
          )}
        >
          <TbCashRegister className="h-5 w-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="jiffy-side-panel-title" className="text-base font-semibold text-primary-text">
              {titulo}
            </h2>
            {aba === 'atual' ? <StatusBadge aberta={aberta} loading={loading} /> : null}
          </div>
          {aba === 'recentes' ? (
            <p className="mt-0.5 text-xs text-secondary-text">Histórico de fechamentos</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-secondary-text transition-colors hover:bg-gray-100 hover:text-primary-text"
          aria-label="Fechar"
        >
          <MdClose className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

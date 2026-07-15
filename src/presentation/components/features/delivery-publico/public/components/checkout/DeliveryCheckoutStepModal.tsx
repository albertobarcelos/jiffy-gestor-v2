'use client'

import type { ReactNode } from 'react'
import { MdClose } from 'react-icons/md'

type DeliveryCheckoutStepModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Título centralizado com seta de voltar à esquerda (ex.: form endereço). */
  showBack?: boolean
  onBack?: () => void
  /** Ocupa 100% da viewport (ex.: revisão do pedido). */
  fullScreen?: boolean
}

export function DeliveryCheckoutStepModal({
  title,
  onClose,
  children,
  footer,
  showBack = false,
  onBack,
  fullScreen = false,
}: DeliveryCheckoutStepModalProps) {
  return (
    <div
      className={
        fullScreen
          ? 'fixed inset-0 z-[60] flex'
          : 'fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[8vh] sm:items-center sm:pt-0'
      }
    >
      {!fullScreen ? (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: 'var(--delivery-overlay, rgba(0, 0, 0, 0.55))' }}
          onClick={onClose}
          aria-hidden
        />
      ) : null}

      <div
        className={
          fullScreen
            ? 'relative flex h-[100dvh] w-full flex-col overflow-hidden'
            : 'relative flex max-h-[min(92dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-xl'
        }
        style={{ backgroundColor: 'var(--delivery-surface, #ffffff)' }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="flex shrink-0 items-center gap-2 border-b px-4 py-3"
          style={{ borderColor: 'var(--delivery-border)' }}
        >
          {showBack ? (
            <button
              type="button"
              onClick={onBack ?? onClose}
              aria-label="Voltar"
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ color: 'var(--delivery-text-primary)' }}
            >
              <span className="text-lg leading-none">‹</span>
            </button>
          ) : null}
          <h2
            className={`delivery-font-title min-w-0 flex-1 text-base font-semibold delivery-text-primary ${
              showBack ? 'text-center pr-9' : ''
            }`}
          >
            {title}
          </h2>
          {!showBack ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ color: 'var(--delivery-text-primary)' }}
            >
              <MdClose className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full"
              style={{ color: 'var(--delivery-text-primary)' }}
            >
              <MdClose className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer ? (
          <div
            className="shrink-0 border-t px-4 py-3"
            style={{
              borderColor: 'var(--delivery-border)',
              paddingBottom: fullScreen
                ? 'max(0.75rem, env(safe-area-inset-bottom))'
                : undefined,
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}

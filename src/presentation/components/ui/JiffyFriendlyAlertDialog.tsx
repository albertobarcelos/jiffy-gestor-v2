'use client'

import type { ReactNode } from 'react'
import { MdClose } from 'react-icons/md'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { cn } from '@/src/shared/utils/cn'

export type JiffyFriendlyAlertIconVariant = 'warning' | 'info' | 'success'

interface JiffyFriendlyAlertDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  iconVariant?: JiffyFriendlyAlertIconVariant
  busy?: boolean
  zIndex?: number
}

function AlertIcon({ variant }: { variant: JiffyFriendlyAlertIconVariant }) {
  const circleClass =
    variant === 'warning'
      ? 'border-primary/30 text-primary'
      : variant === 'success'
        ? 'border-emerald-500/30 text-emerald-600'
        : 'border-primary/30 text-primary'

  return (
    <div
      className={cn(
        'mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 bg-white',
        circleClass
      )}
      aria-hidden
    >
      {variant === 'warning' ? (
        <span className="text-2xl font-bold leading-none">!</span>
      ) : variant === 'success' ? (
        <span className="text-2xl font-bold leading-none">✓</span>
      ) : (
        <span className="text-xl font-bold leading-none">i</span>
      )}
    </div>
  )
}

/**
 * Modal central compacto: ícone no topo, mensagem amigável e ação principal.
 * Inspirado no aviso do delivery público (não ocupa a altura da tela).
 */
export function JiffyFriendlyAlertDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Ok, entendi!',
  iconVariant = 'warning',
  busy = false,
  zIndex = 2100,
}: JiffyFriendlyAlertDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen, reason) => {
        if (busy || nextOpen) return
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') onClose()
      }}
      maxWidth={false}
      fullWidth={false}
      sx={{
        zIndex,
        '& .MuiDialog-container': {
          alignItems: 'center',
          justifyContent: 'center',
        },
        '& .MuiDialog-paper': {
          margin: 16,
          width: '100%',
          maxWidth: 360,
          borderRadius: '16px',
          overflow: 'visible',
          boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
        },
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="absolute right-3 top-3 rounded-full p-1 text-secondary-text transition-colors hover:bg-black/5 hover:text-primary-text disabled:opacity-50"
          aria-label="Fechar"
        >
          <MdClose className="h-5 w-5" />
        </button>

        <div className="px-5 pb-5 pt-8 text-center">
          <AlertIcon variant={iconVariant} />

          <h2 className="mt-5 text-base font-semibold leading-snug text-primary-text">{title}</h2>

          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-secondary-text">{description}</p>
          ) : null}

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="mt-6 min-h-[48px] w-full rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-alternate disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Aguarde…' : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

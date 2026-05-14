'use client'

import * as React from 'react'
import type { SxProps, Theme } from '@mui/material/styles'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  type DialogProps,
} from '@/src/presentation/components/ui/dialog'
import { cn } from '@/src/shared/utils/cn'

/** Estilos padrão dos botões (podem ser sobrescritos via className). */
const defaultCancelButtonClass =
  'h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'

const defaultConfirmButtonClass =
  'h-10 rounded-lg bg-secondary px-4 text-sm font-semibold text-white transition-colors hover:bg-alternate disabled:cursor-not-allowed disabled:opacity-50'

export interface JiffyConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean, reason?: 'backdropClick' | 'escapeKeyDown') => void
  /** Texto ou conteúdo do título (cor via `titleClassName` / `titleSx`). */
  title: React.ReactNode
  /** Corpo opcional abaixo do título. */
  description?: React.ReactNode
  /** Conteúdo extra entre descrição e rodapé (formulários curtos, avisos). */
  children?: React.ReactNode
  cancelLabel?: string
  confirmLabel?: string
  /** Chamado ao clicar em cancelar (antes de `onOpenChange(false)`). */
  onCancel?: () => void
  /** Chamado ao clicar em confirmar; controle de fechamento fica no pai. */
  onConfirm: () => void
  cancelDisabled?: boolean
  confirmDisabled?: boolean
  /** Desabilita os dois botões (ex.: submit em andamento). */
  busy?: boolean
  maxWidth?: DialogProps['maxWidth']
  fullWidth?: boolean
  /** Repasse ao `Dialog` (ex.: `& .MuiDialog-paper`). */
  dialogSx?: DialogProps['sx']
  contentSx?: SxProps<Theme>
  headerSx?: SxProps<Theme>
  footerSx?: SxProps<Theme>
  titleSx?: SxProps<Theme>
  titleClassName?: string
  descriptionSx?: SxProps<Theme>
  descriptionClassName?: string
  cancelButtonClassName?: string
  confirmButtonClassName?: string
  footerClassName?: string
  /** Conteúdo customizado no lugar dos dois botões padrão. */
  footer?: React.ReactNode
  /** Classe extra no container interno do `DialogContent`. */
  contentClassName?: string
}

/**
 * Modal de confirmação com duas ações (cancelar / confirmar).
 * Totalmente personalizável via props de estilo e labels.
 */
export function JiffyConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  cancelLabel = 'Cancelar',
  confirmLabel = 'Confirmar',
  onCancel,
  onConfirm,
  cancelDisabled,
  confirmDisabled,
  busy = false,
  maxWidth = 'xs',
  fullWidth = true,
  dialogSx,
  contentSx,
  headerSx,
  footerSx,
  titleSx,
  titleClassName,
  descriptionSx,
  descriptionClassName,
  cancelButtonClassName,
  confirmButtonClassName,
  footerClassName,
  footer,
  contentClassName,
}: JiffyConfirmDialogProps) {
  const titleId = React.useId()
  const descriptionId = React.useId()

  const handleCancel = () => {
    if (busy) return
    onCancel?.()
    onOpenChange(false)
  }

  const handleConfirm = () => {
    if (busy || confirmDisabled) return
    onConfirm()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      role="alertdialog"
      sx={
        [
          {
            '& .MuiDialog-paper': {
              borderRadius: 3,
              p: 0,
            },
          },
          ...(dialogSx !== undefined && dialogSx !== null ? [dialogSx] : []),
        ] as SxProps<Theme>
      }
    >
      <DialogContent className={contentClassName} sx={{ p: 2.5, ...contentSx }}>
        <DialogHeader sx={{ p: 0, pb: 1.5, ...headerSx }}>
          <DialogTitle
            id={titleId}
            className={titleClassName}
            sx={{ fontSize: '1.05rem', ...titleSx }}
          >
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription
              id={descriptionId}
              className={descriptionClassName}
              sx={{ mt: 1, ...descriptionSx }}
            >
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {children}

        {footer !== undefined ? (
          footer
        ) : (
          <DialogFooter
            className={footerClassName}
            sx={{
              p: 0,
              pt: 2,
              gap: 1,
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              ...footerSx,
            }}
          >
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy || cancelDisabled}
              className={cn(defaultCancelButtonClass, cancelButtonClassName)}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy || confirmDisabled}
              className={cn(defaultConfirmButtonClass, confirmButtonClassName)}
            >
              {confirmLabel}
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

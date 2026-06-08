'use client'

import type { ReactNode } from 'react'
import { MdClose } from 'react-icons/md'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'

export function MvpChartModal(props: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const { open, onClose, title, children } = props

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) onClose()
      }}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          borderRadius: '16px',
          width: '95%',
          maxWidth: '1100px',
          maxHeight: '90vh',
          margin: 'auto',
        },
      }}
    >
      <DialogContent sx={{ maxHeight: '85vh', overflowY: 'auto', p: { xs: 2, sm: 3 } }}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700 }}>{title}</DialogTitle>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary-text transition-colors hover:bg-black/5"
            >
              <MdClose size={20} aria-hidden />
            </button>
          </div>
        </DialogHeader>
        <div className="mt-3 min-h-[min(20rem,50vh)]">{children}</div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import type { AreaEntregaDTO } from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'

export function CoberturaDialogExclusaoArea({
  area,
  excluindo,
  onCancelar,
  onConfirmar,
}: {
  area: AreaEntregaDTO | null
  excluindo: boolean
  onCancelar: () => void
  onConfirmar: () => void
}) {
  return (
    <Dialog open={area != null} onOpenChange={open => !open && onCancelar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir área de entrega?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-secondary-text">
          A área{' '}
          <span className="font-semibold text-primary-text">
            {area?.nome?.trim() || 'sem nome'}
          </span>{' '}
          será removida. Endereços dentro dela podem deixar de receber cotação.
        </p>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={excluindo}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-secondary-text"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={excluindo}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {excluindo ? 'Excluindo…' : 'Excluir'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

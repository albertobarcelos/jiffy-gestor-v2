'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import type { FiscalLoteFalhaExibida } from '../types'

export interface LoteFiscalFalhasDialogProps {
  falhas: FiscalLoteFalhaExibida[]
  onClose: () => void
}

export function LoteFiscalFalhasDialog({ falhas, onClose }: LoteFiscalFalhasDialogProps) {
  const aberto = falhas.length > 0

  return (
    <Dialog open={aberto} onOpenChange={open => !open && onClose()} maxWidth="sm" fullWidth>
      <DialogContent className="flex max-h-[min(80vh,560px)] flex-col gap-0 overflow-hidden">
        <DialogHeader sx={{ pb: 1 }}>
          <DialogTitle className="text-primary-text">
            {falhas.length === 1
              ? '1 produto não foi atualizado'
              : `${falhas.length} produtos não foram atualizados`}
          </DialogTitle>
          <DialogDescription>
            Os produtos abaixo permaneceram selecionados para você corrigir e tentar novamente.
          </DialogDescription>
        </DialogHeader>

        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {falhas.map(falha => (
            <li
              key={`${falha.produtoId}-${falha.campo ?? 'geral'}-${falha.mensagem}`}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2"
            >
              <p className="text-sm font-semibold text-primary-text">{falha.nomeProduto}</p>
              {falha.labelCampo ? (
                <p className="mt-0.5 text-xs font-medium text-secondary-text">
                  Campo: {falha.labelCampo}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-red-700">{falha.mensagem}</p>
            </li>
          ))}
        </ul>

        <DialogFooter sx={{ pt: 2 }}>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg bg-secondary px-4 text-sm font-semibold text-white transition-colors hover:bg-alternate"
          >
            Entendi
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

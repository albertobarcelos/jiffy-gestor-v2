'use client'

import { useEffect, useState } from 'react'
import { JiffyConfirmDialog } from '@/src/presentation/components/ui/jiffy-confirm-dialog'

const FRASE_CONFIRMACAO_EXCLUSAO = 'EXCLUIR'

interface ProdutoExcluirConfirmDialogProps {
  open: boolean
  nomeProduto: string
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ProdutoExcluirConfirmDialog({
  open,
  nomeProduto,
  busy = false,
  onClose,
  onConfirm,
}: ProdutoExcluirConfirmDialogProps) {
  const [frase, setFrase] = useState('')

  useEffect(() => {
    if (!open) setFrase('')
  }, [open])

  const confirmado = frase.trim() === FRASE_CONFIRMACAO_EXCLUSAO

  return (
    <JiffyConfirmDialog
      open={open}
      onOpenChange={next => {
        if (!next && !busy) onClose()
      }}
      title="Excluir produto"
      description={`O produto "${nomeProduto}" será removido do cadastro. Esta ação não pode ser desfeita.`}
      cancelLabel="Cancelar"
      confirmLabel="Excluir"
      confirmDisabled={!confirmado}
      busy={busy}
      confirmButtonClassName="h-10 rounded-lg bg-error px-4 text-sm font-semibold text-white transition-colors hover:bg-error/90 disabled:cursor-not-allowed disabled:opacity-50"
      onConfirm={onConfirm}
    >
      <label className="mt-1 block text-sm text-primary-text">
        Digite <span className="font-semibold">{FRASE_CONFIRMACAO_EXCLUSAO}</span> para confirmar
        <input
          type="text"
          value={frase}
          autoComplete="off"
          disabled={busy}
          onChange={e => setFrase(e.target.value)}
          placeholder={FRASE_CONFIRMACAO_EXCLUSAO}
          className="mt-1.5 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-secondary disabled:opacity-60"
        />
      </label>
    </JiffyConfirmDialog>
  )
}

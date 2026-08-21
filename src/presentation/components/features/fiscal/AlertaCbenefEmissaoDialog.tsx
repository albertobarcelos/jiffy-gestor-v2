'use client'

import { JiffyConfirmDialog } from '@/src/presentation/components/ui/jiffy-confirm-dialog'
import type { ItemVendaCbenef } from '@/src/domain/entities/painel-contador/cbenefRegras'

interface AlertaCbenefEmissaoDialogProps {
  open: boolean
  itens: ItemVendaCbenef[]
  busy?: boolean
  onContinuar: () => void
  onConfigurar: () => void
  onCancelar: () => void
}

export function AlertaCbenefEmissaoDialog({
  open,
  itens,
  busy = false,
  onContinuar,
  onConfigurar,
  onCancelar,
}: AlertaCbenefEmissaoDialogProps) {
  const primeiro = itens[0]
  const demais = itens.slice(1)

  return (
    <JiffyConfirmDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancelar()
      }}
      maxWidth="sm"
      title="⚠️ Atenção — cBenef não configurado"
      titleClassName="text-amber-800"
      description={
        primeiro ? (
          <span className="block space-y-2 text-sm text-secondary-text">
            <span className="block">
              O produto {primeiro.nome} (NCM {primeiro.ncm}) não possui Código de Benefício Fiscal
              (cBenef) configurado. Para SP em Regime Normal, este campo é obrigatório — a emissão
              pode ser rejeitada (erro 930).
            </span>
            {demais.length > 0 ? (
              <span className="block">
                Outros produtos sem cBenef:{' '}
                {demais.map((item) => `${item.nome} (NCM ${item.ncm})`).join('; ')}.
              </span>
            ) : null}
            <span className="block font-medium">
              Deseja continuar mesmo assim ou configurar agora?
            </span>
          </span>
        ) : null
      }
      cancelLabel="Configurar agora"
      confirmLabel="Continuar mesmo assim"
      busy={busy}
      onConfirm={onContinuar}
      footer={
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancelar}
            className="h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-primary-text hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfigurar}
            className="h-10 rounded-lg border border-amber-300 px-4 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
          >
            Configurar agora
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onContinuar}
            className="h-10 rounded-lg bg-alternate px-4 text-sm font-semibold text-white hover:bg-alternate/90 disabled:opacity-50"
          >
            Continuar mesmo assim
          </button>
        </div>
      }
    />
  )
}

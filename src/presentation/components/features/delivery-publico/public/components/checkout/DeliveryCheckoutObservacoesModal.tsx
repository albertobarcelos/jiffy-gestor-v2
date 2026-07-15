'use client'

import { DeliveryCheckoutStepModal } from './DeliveryCheckoutStepModal'

type DeliveryCheckoutObservacoesModalProps = {
  observacaoPedido: string
  onChangeObservacao: (value: string) => void
  onClose: () => void
  onVoltar: () => void
  onContinuar: () => void
}

export function DeliveryCheckoutObservacoesModal({
  observacaoPedido,
  onChangeObservacao,
  onClose,
  onVoltar,
  onContinuar,
}: DeliveryCheckoutObservacoesModalProps) {
  return (
    <DeliveryCheckoutStepModal
      title="Informações adicionais"
      onClose={onClose}
      showBack
      onBack={onVoltar}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onVoltar}
            className="min-h-[48px] flex-1 rounded-xl border px-3 text-sm font-semibold uppercase tracking-wide delivery-text-primary"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={onContinuar}
            className="min-h-[48px] flex-1 rounded-xl px-3 text-sm font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: 'var(--delivery-primary-dark)',
              color: 'var(--delivery-btn-text, #ffffff)',
            }}
          >
            Continuar
          </button>
        </div>
      }
    >
      <div className="space-y-2">
        <label className="block text-sm font-medium delivery-text-primary">
          Observações sobre o pedido
        </label>
        <p className="text-xs delivery-text-secondary">
          Opcional. Ex.: sem cebola, tocar a campainha, etc.
        </p>
        <textarea
          className="min-h-[140px] w-full resize-y rounded-xl border bg-transparent px-3 py-3 text-sm outline-none delivery-text-primary"
          style={{ borderColor: 'var(--delivery-border)' }}
          placeholder="Escreva aqui..."
          value={observacaoPedido}
          onChange={e => onChangeObservacao(e.target.value)}
          maxLength={500}
          rows={5}
        />
        <p className="text-right text-[11px] delivery-text-secondary">
          {observacaoPedido.length}/500
        </p>
      </div>
    </DeliveryCheckoutStepModal>
  )
}

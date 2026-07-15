'use client'

import { useState } from 'react'
import { formatarTelefoneBr, extrairDigitosTelefone } from '@/src/shared/utils/telefoneBr'
import { showToast } from '@/src/shared/utils/toast'
import { DeliveryCheckoutStepModal } from './DeliveryCheckoutStepModal'

type DeliveryCheckoutIdentifiqueSeModalProps = {
  telefone: string
  onChangeTelefone: (value: string) => void
  onClose: () => void
  onContinuar: (telefoneDigits: string) => Promise<void>
}

export function DeliveryCheckoutIdentifiqueSeModal({
  telefone,
  onChangeTelefone,
  onClose,
  onContinuar,
}: DeliveryCheckoutIdentifiqueSeModalProps) {
  const [enviando, setEnviando] = useState(false)

  const handleContinuar = async () => {
    const digits = extrairDigitosTelefone(telefone)
    if (digits.length < 10) {
      showToast.error('Informe um celular válido')
      return
    }
    setEnviando(true)
    try {
      await onContinuar(digits)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <DeliveryCheckoutStepModal
      title="Identifique-se"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] flex-1 rounded-xl border px-3 text-sm font-semibold uppercase tracking-wide delivery-text-primary"
              style={{ borderColor: 'var(--delivery-border)' }}
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={() => void handleContinuar()}
              className="min-h-[44px] flex-1 rounded-xl px-3 text-sm font-semibold uppercase tracking-wide disabled:opacity-60"
              style={{
                backgroundColor: 'var(--delivery-primary-dark)',
                color: 'var(--delivery-btn-text, #ffffff)',
              }}
            >
              {enviando ? '...' : 'Continuar'}
            </button>
          </div>
          <p className="text-center text-[11px] leading-relaxed delivery-text-secondary">
            Ao prosseguir, confirmo que li e aceito os{' '}
            <span className="underline">Termos de uso</span> e{' '}
            <span className="underline">Política de privacidade</span>.
          </p>
        </div>
      }
    >
      <label className="relative block">
        <span
          className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary"
        >
          Celular
        </span>
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-3"
          style={{ borderColor: 'var(--delivery-border)' }}
        >
          <span className="shrink-0 text-sm font-medium delivery-text-primary" title="Brasil">
            🇧🇷 ▾
          </span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={15}
            placeholder="(99) 99999-9999"
            value={telefone}
            onChange={e => onChangeTelefone(formatarTelefoneBr(e.target.value))}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none delivery-text-primary"
          />
        </div>
      </label>
    </DeliveryCheckoutStepModal>
  )
}

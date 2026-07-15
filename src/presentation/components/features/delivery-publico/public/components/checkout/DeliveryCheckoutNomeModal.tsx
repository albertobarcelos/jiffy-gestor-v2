'use client'

import { useState } from 'react'
import { showToast } from '@/src/shared/utils/toast'
import { DeliveryCheckoutStepModal } from './DeliveryCheckoutStepModal'

type DeliveryCheckoutNomeModalProps = {
  nome: string
  onChangeNome: (value: string) => void
  onClose: () => void
  onVoltar: () => void
  onContinuar: () => void
}

export function DeliveryCheckoutNomeModal({
  nome,
  onChangeNome,
  onClose,
  onVoltar,
  onContinuar,
}: DeliveryCheckoutNomeModalProps) {
  const [tentou, setTentou] = useState(false)

  const handleContinuar = () => {
    const trimmed = nome.trim()
    if (trimmed.length < 3 || !trimmed.includes(' ')) {
      setTentou(true)
      showToast.error('Informe nome e sobrenome')
      return
    }
    onContinuar()
  }

  return (
    <DeliveryCheckoutStepModal
      title="Novo cadastro"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onVoltar}
              className="min-h-[44px] rounded-full border px-5 text-sm font-semibold uppercase tracking-wide delivery-text-primary"
              style={{ borderColor: 'var(--delivery-border)' }}
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleContinuar}
              className="min-h-[44px] rounded-full px-5 text-sm font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: 'var(--delivery-primary-dark)',
                color: 'var(--delivery-btn-text, #ffffff)',
              }}
            >
              Continuar
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
      <input
        type="text"
        autoComplete="name"
        placeholder="Nome + Sobrenome"
        value={nome}
        onChange={e => onChangeNome(e.target.value)}
        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none delivery-text-primary ${
          tentou && nome.trim().length < 3 ? 'border-red-400' : ''
        }`}
        style={{ borderColor: 'var(--delivery-border)' }}
      />
    </DeliveryCheckoutStepModal>
  )
}

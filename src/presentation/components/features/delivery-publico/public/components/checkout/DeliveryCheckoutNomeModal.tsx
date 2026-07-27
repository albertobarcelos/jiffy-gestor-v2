'use client'

import { useState } from 'react'
import { showToast } from '@/src/shared/utils/toast'
import { DeliveryCheckoutFooterActions } from './DeliveryCheckoutFooterActions'
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
        <DeliveryCheckoutFooterActions
          onVoltar={onVoltar}
          onContinuar={handleContinuar}
          top={
            <p className="text-center text-[11px] leading-relaxed delivery-text-secondary">
              Ao prosseguir, confirmo que li e aceito os{' '}
              <span className="underline">Termos de uso</span> e{' '}
              <span className="underline">Política de privacidade</span>.
            </p>
          }
        />
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

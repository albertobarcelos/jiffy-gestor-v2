'use client'

import { useEffect, useState } from 'react'
import { showToast } from '@/src/shared/utils/toast'
import { DeliveryPaisTelefoneSelect } from '../../../shared/components/DeliveryPaisTelefoneSelect'
import { DELIVERY_PAIS_TELEFONE_PADRAO } from '../../../shared/constants/deliveryPaisesTelefone'
import {
  comporTelefoneApi,
  formatarTelefonePorPais,
  telefoneNacionalValido,
} from '../../../shared/utils/deliveryTelefonePais'
import { DeliveryCheckoutStepModal } from './DeliveryCheckoutStepModal'

type DeliveryCheckoutIdentifiqueSeModalProps = {
  telefone: string
  telefonePaisIso2?: string
  onChangeTelefone: (value: string) => void
  onChangeTelefonePais?: (iso2: string) => void
  onClose: () => void
  onContinuar: (telefoneDigits: string) => Promise<void>
}

export function DeliveryCheckoutIdentifiqueSeModal({
  telefone,
  telefonePaisIso2 = DELIVERY_PAIS_TELEFONE_PADRAO,
  onChangeTelefone,
  onChangeTelefonePais,
  onClose,
  onContinuar,
}: DeliveryCheckoutIdentifiqueSeModalProps) {
  const [enviando, setEnviando] = useState(false)
  const [paisIso2, setPaisIso2] = useState(telefonePaisIso2)

  useEffect(() => {
    setPaisIso2(telefonePaisIso2)
  }, [telefonePaisIso2])

  const handleChangePais = (iso2: string) => {
    setPaisIso2(iso2)
    onChangeTelefone('')
    onChangeTelefonePais?.(iso2)
  }

  const handleContinuar = async () => {
    if (!telefoneNacionalValido(telefone, paisIso2)) {
      showToast.error('Informe um celular válido')
      return
    }
    const digits = comporTelefoneApi(telefone, paisIso2)
    setEnviando(true)
    try {
      await onContinuar(digits)
    } finally {
      setEnviando(false)
    }
  }

  const placeholder = paisIso2 === 'BR' ? '(99) 99999-9999' : '999 999 999'

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
          <DeliveryPaisTelefoneSelect
            value={paisIso2}
            onChange={handleChangePais}
            disabled={enviando}
          />
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={placeholder}
            value={telefone}
            onChange={e => onChangeTelefone(formatarTelefonePorPais(e.target.value, paisIso2))}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none delivery-text-primary"
          />
        </div>
      </label>
    </DeliveryCheckoutStepModal>
  )
}

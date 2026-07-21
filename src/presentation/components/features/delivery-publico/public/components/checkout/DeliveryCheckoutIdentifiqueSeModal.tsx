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
import type { ClienteLookupStatus } from '../../../shared/hooks/useDeliveryCheckout'
import { DeliveryCheckoutStepModal } from './DeliveryCheckoutStepModal'

type DeliveryCheckoutIdentifiqueSeModalProps = {
  telefone: string
  telefonePaisIso2?: string
  nome: string
  /** Nome já salvo no cadastro (API). Vazio = cliente sem nome. */
  nomeCadastro: string | null
  lookupStatus: ClienteLookupStatus
  onChangeTelefone: (value: string) => void
  onChangeTelefonePais?: (iso2: string) => void
  onChangeNome: (value: string) => void
  onClose: () => void
  onContinuar: (telefoneDigits: string) => Promise<void>
}

function nomeCompletoValido(nome: string): boolean {
  const trimmed = nome.trim()
  return trimmed.length >= 3 && trimmed.includes(' ')
}

export function DeliveryCheckoutIdentifiqueSeModal({
  telefone,
  telefonePaisIso2 = DELIVERY_PAIS_TELEFONE_PADRAO,
  nome,
  nomeCadastro,
  lookupStatus,
  onChangeTelefone,
  onChangeTelefonePais,
  onChangeNome,
  onClose,
  onContinuar,
}: DeliveryCheckoutIdentifiqueSeModalProps) {
  const [enviando, setEnviando] = useState(false)
  const [paisIso2, setPaisIso2] = useState(telefonePaisIso2)
  const [tentouNome, setTentouNome] = useState(false)

  useEffect(() => {
    setPaisIso2(telefonePaisIso2)
  }, [telefonePaisIso2])

  const telefoneOk = telefoneNacionalValido(telefone, paisIso2)
  const consultaPronta =
    telefoneOk &&
    (lookupStatus === 'encontrado' ||
      lookupStatus === 'nao_encontrado' ||
      lookupStatus === 'erro')

  const temNomeNoCadastro = Boolean(nomeCadastro?.trim())
  const precisaNome =
    lookupStatus === 'nao_encontrado' ||
    (lookupStatus === 'encontrado' && !temNomeNoCadastro)

  const mostrarCampoNome =
    consultaPronta && (precisaNome || lookupStatus === 'encontrado')

  const nomeSomenteLeitura = lookupStatus === 'encontrado' && temNomeNoCadastro

  const handleChangePais = (iso2: string) => {
    setPaisIso2(iso2)
    onChangeTelefone('')
    onChangeTelefonePais?.(iso2)
    setTentouNome(false)
  }

  const handleContinuar = async () => {
    if (!telefoneNacionalValido(telefone, paisIso2)) {
      showToast.error('Informe um celular válido')
      return
    }
    if (lookupStatus === 'loading' || lookupStatus === 'idle') {
      showToast.error('Aguarde a consulta do telefone')
      return
    }
    if (lookupStatus === 'erro') {
      showToast.error('Erro ao consultar cadastro. Tente novamente.')
      return
    }
    if (precisaNome && !nomeCompletoValido(nome)) {
      setTentouNome(true)
      showToast.error('Informe nome e sobrenome')
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
              disabled={enviando || lookupStatus === 'loading'}
              onClick={() => void handleContinuar()}
              className="min-h-[44px] flex-1 rounded-xl px-3 text-sm font-semibold uppercase tracking-wide disabled:opacity-60"
              style={{
                backgroundColor: 'var(--delivery-primary-dark)',
                color: 'var(--delivery-btn-text, #ffffff)',
              }}
            >
              {enviando || lookupStatus === 'loading' ? '...' : 'Continuar'}
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
      <div className="space-y-4">
        <label className="relative block">
          <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
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

        {lookupStatus === 'loading' && telefoneOk ? (
          <p className="text-xs delivery-text-secondary">Consultando cadastro...</p>
        ) : null}

        {mostrarCampoNome ? (
          <label className="relative block">
            <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
              Nome
            </span>
            <input
              type="text"
              autoComplete="name"
              placeholder="Nome + Sobrenome"
              value={nome}
              onChange={e => onChangeNome(e.target.value)}
              readOnly={nomeSomenteLeitura}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none delivery-text-primary ${
                tentouNome && precisaNome && !nomeCompletoValido(nome) ? 'border-red-400' : ''
              }`}
              style={{
                borderColor: 'var(--delivery-border)',
                backgroundColor: nomeSomenteLeitura
                  ? 'var(--delivery-surface-muted)'
                  : undefined,
              }}
            />
            {precisaNome ? (
              <p className="mt-1.5 text-xs delivery-text-secondary">
                Informe seu nome completo para continuar.
              </p>
            ) : null}
          </label>
        ) : null}
      </div>
    </DeliveryCheckoutStepModal>
  )
}

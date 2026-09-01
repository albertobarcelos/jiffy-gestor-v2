'use client'

import { MapPin } from 'lucide-react'
import type { EtapaDialogPinCheckout } from '../../../shared/hooks/useDeliveryCheckoutPinAjuste'

type DeliveryCheckoutPinAjusteDialogProps = {
  etapa: EtapaDialogPinCheckout | null
  /** Resumo do endereço digitado/cadastrado (confirmação). */
  resumoEndereco?: string
  onEscolherPreferencia: () => void
  onEscolherAtualizarEndereco: () => void
  onConfirmaEnderecoSim: () => void
  onConfirmaEnderecoNao: () => void
  onPontoDiferenteSim: () => void
  onPontoDiferenteNao: () => void
  onFechar?: () => void
}

export function DeliveryCheckoutPinAjusteDialog({
  etapa,
  resumoEndereco,
  onEscolherPreferencia,
  onEscolherAtualizarEndereco,
  onConfirmaEnderecoSim,
  onConfirmaEnderecoNao,
  onPontoDiferenteSim,
  onPontoDiferenteNao,
  onFechar,
}: DeliveryCheckoutPinAjusteDialogProps) {
  if (!etapa) return null

  const tituloId = 'delivery-pin-ajuste-titulo'

  return (
    <div className="fixed inset-0 z-[80] flex overscroll-none items-end justify-center px-4 pb-6 sm:items-center">
      <button
        type="button"
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--delivery-overlay, rgba(0, 0, 0, 0.55))' }}
        aria-label="Fechar"
        onClick={onFechar}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl px-5 pb-5 pt-6 shadow-xl"
        style={{ backgroundColor: 'var(--delivery-surface, #ffffff)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
      >
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-sky-100">
          <MapPin className="h-6 w-6 text-sky-700" strokeWidth={2.25} aria-hidden />
        </div>

        {etapa === 'ajuste_classico' ? (
          <>
            <h2 id={tituloId} className="mt-4 text-center text-base font-semibold delivery-text-primary">
              Você moveu o pin no mapa
            </h2>
            <p className="mt-2 text-center text-sm leading-snug delivery-text-secondary">
              Como deseja usar este ponto?
            </p>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={onEscolherAtualizarEndereco}
                className="min-h-[48px] w-full rounded-xl border px-4 py-3 text-left text-sm"
                style={{ borderColor: 'var(--delivery-border)' }}
              >
                <span className="block font-semibold delivery-text-primary">Atualizar meu endereço</span>
                <span className="mt-0.5 block text-xs delivery-text-secondary">
                  O endereço cadastrado passará a corresponder ao pin no mapa.
                </span>
              </button>
              <button
                type="button"
                onClick={onEscolherPreferencia}
                className="min-h-[48px] w-full rounded-xl border px-4 py-3 text-left text-sm"
                style={{ borderColor: 'var(--delivery-border)' }}
              >
                <span className="block font-semibold delivery-text-primary">
                  Apenas ponto de entrega
                </span>
                <span className="mt-0.5 block text-xs delivery-text-secondary">
                  Mantém o endereço escrito e salva o pin como preferência de entrega.
                </span>
              </button>
            </div>
          </>
        ) : null}

        {etapa === 'confirma_endereco' ? (
          <>
            <h2 id={tituloId} className="mt-4 text-center text-base font-semibold delivery-text-primary">
              Confirme o endereço
            </h2>
            <p className="mt-2 text-center text-sm leading-snug delivery-text-secondary">
              Não encontramos um logradouro confiável neste ponto. O endereço abaixo é onde você
              apontou no mapa?
            </p>
            {resumoEndereco ? (
              <p
                className="mt-3 rounded-xl border px-3 py-2 text-center text-sm delivery-text-primary"
                style={{
                  borderColor: 'var(--delivery-border)',
                  backgroundColor: 'var(--delivery-surface-muted)',
                }}
              >
                {resumoEndereco}
              </p>
            ) : null}
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={onConfirmaEnderecoSim}
                className="min-h-[48px] w-full rounded-xl border px-4 py-3 text-sm font-semibold delivery-text-primary"
                style={{ borderColor: 'var(--delivery-border)' }}
              >
                Sim, é este endereço
              </button>
              <button
                type="button"
                onClick={onConfirmaEnderecoNao}
                className="min-h-[48px] w-full rounded-xl border px-4 py-3 text-sm font-semibold delivery-text-primary"
                style={{ borderColor: 'var(--delivery-border)' }}
              >
              <span className="block font-semibold delivery-text-primary">
              Não, quero editar o endereço
            </span>
              </button>
            </div>
          </>
        ) : null}

        {etapa === 'ponto_diferente' ? (
          <>
            <h2 id={tituloId} className="mt-4 text-center text-base font-semibold delivery-text-primary">
              Ponto de entrega
            </h2>
            <p className="mt-2 text-center text-sm leading-snug delivery-text-secondary">
              Deseja definir um ponto de entrega diferente?
            </p>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={onPontoDiferenteNao}
                className="min-h-[48px] w-full rounded-xl border px-4 py-3 text-left text-sm"
                style={{ borderColor: 'var(--delivery-border)' }}
              >
                <span className="block font-semibold delivery-text-primary">Não</span>
                <span className="mt-0.5 block text-xs delivery-text-secondary">
                  Salva o pin como localização deste endereço.
                </span>
              </button>
              <button
                type="button"
                onClick={onPontoDiferenteSim}
                className="min-h-[48px] w-full rounded-xl border px-4 py-3 text-left text-sm"
                style={{ borderColor: 'var(--delivery-border)' }}
              >
                <span className="block font-semibold delivery-text-primary">Sim</span>
                <span className="mt-0.5 block text-xs delivery-text-secondary">
                  Mantém o endereço escrito e salva o pin só como preferência de entrega.
                </span>
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

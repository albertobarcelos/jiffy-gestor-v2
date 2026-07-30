'use client'

import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'

type DeliveryCheckoutFooterActionsProps = {
  onVoltar: () => void
  onContinuar: () => void
  continuarLabel?: string
  voltarLabel?: string
  continuarDisabled?: boolean
  voltarDisabled?: boolean
  /** Conteúdo acima da barra (ex.: total). */
  top?: ReactNode
  /** Conteúdo abaixo da barra (ex.: termos). */
  bottom?: ReactNode
}

/**
 * Barra de ações alinhada ao footer do carrinho: Voltar (branco) + Continuar (preto).
 */
export function DeliveryCheckoutFooterActions({
  onVoltar,
  onContinuar,
  continuarLabel = 'Continuar',
  voltarLabel = 'Voltar',
  continuarDisabled = false,
  voltarDisabled = false,
  top,
  bottom,
}: DeliveryCheckoutFooterActionsProps) {
  return (
    <div
      style={{
        paddingBottom: bottom ? undefined : 'max(0px, env(safe-area-inset-bottom))',
      }}
    >
      {top ? <div className="px-5 pt-3 pb-2">{top}</div> : null}
      <div className="flex min-h-[3.5rem] w-full items-stretch">
        <button
          type="button"
          disabled={voltarDisabled}
          onClick={onVoltar}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 border border-neutral-300 bg-white px-5 text-base font-semibold text-black disabled:opacity-60"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
          {voltarLabel}
        </button>
        <button
          type="button"
          disabled={continuarDisabled}
          onClick={onContinuar}
          className="flex min-w-0 flex-1 items-center justify-center border-0 bg-black px-5 text-base font-semibold text-white disabled:opacity-60"
        >
          {continuarLabel}
        </button>
      </div>
      {bottom ? (
        <div
          className="px-5 pt-2 pb-3"
          style={{
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          {bottom}
        </div>
      ) : null}
    </div>
  )
}

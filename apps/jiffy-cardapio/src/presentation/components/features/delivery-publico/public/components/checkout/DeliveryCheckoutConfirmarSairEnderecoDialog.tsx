'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LogOut } from 'lucide-react'
import { useDeliveryBodyScrollLock } from '../../../shared/hooks/useDeliveryBodyScrollLock'

type DeliveryCheckoutConfirmarSairEnderecoDialogProps = {
  open: boolean
  onConfirmarSair: () => void
  onContinuar: () => void
}

export function DeliveryCheckoutConfirmarSairEnderecoDialog({
  open,
  onConfirmarSair,
  onContinuar,
}: DeliveryCheckoutConfirmarSairEnderecoDialogProps) {
  const [portalReady, setPortalReady] = useState(false)
  useDeliveryBodyScrollLock(open)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  if (!open || !portalReady) return null

  return createPortal(
    <div
      className="delivery-vv-panel z-[110] flex items-center justify-center overscroll-none p-4"
      style={{
        // Mesmo recorte do formulário (direita / 95% altura).
        height: 'calc(var(--delivery-vv-height, 100dvh) * 0.95)',
        top: 'calc(var(--delivery-vv-offset-top, 0px) + var(--delivery-vv-height, 100dvh) * 0.05)',
        backgroundColor: 'transparent',
        pointerEvents: 'none',
        zIndex: 110,
      }}
    >
      <button
        type="button"
        className="absolute inset-0"
        style={{
          backgroundColor: 'var(--delivery-overlay, rgba(0, 0, 0, 0.55))',
          pointerEvents: 'auto',
        }}
        aria-label="Continuar editando"
        data-checkout-leave-without-numero=""
        onMouseDown={e => e.preventDefault()}
        onClick={onContinuar}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl px-5 pb-5 pt-6 shadow-xl"
        style={{
          backgroundColor: 'var(--delivery-surface, #ffffff)',
          pointerEvents: 'auto',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-sair-endereco-titulo"
      >
        <div
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--delivery-primary, #2563eb) 15%, transparent)',
          }}
        >
          <LogOut
            className="h-6 w-6"
            style={{ color: 'var(--delivery-primary, #2563eb)' }}
            strokeWidth={2.25}
            aria-hidden
          />
        </div>

        <h2
          id="delivery-sair-endereco-titulo"
          className="mt-4 text-center text-base font-semibold delivery-text-primary"
        >
          Sair sem salvar o endereço?
        </h2>

        <p className="mt-2 text-center text-sm leading-snug delivery-text-secondary">
          As informações preenchidas neste endereço não serão salvas. Deseja voltar mesmo assim?
        </p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            data-checkout-leave-without-numero=""
            onMouseDown={e => e.preventDefault()}
            onClick={onConfirmarSair}
            className="min-h-[48px] w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
          >
            Sim, sair
          </button>
          <button
            type="button"
            data-checkout-leave-without-numero=""
            onMouseDown={e => e.preventDefault()}
            onClick={onContinuar}
            className="min-h-[48px] w-full rounded-xl border px-4 py-3 text-sm font-semibold delivery-text-primary"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            Continuar editando
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

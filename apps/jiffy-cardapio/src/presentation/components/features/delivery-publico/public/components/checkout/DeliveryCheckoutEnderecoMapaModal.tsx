'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, X } from 'lucide-react'
import { EnderecoGeolocalizacaoMap } from '@/src/presentation/components/shared/geolocalizacao/EnderecoGeolocalizacaoMap'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { useDeliveryBodyScrollLock } from '../../../shared/hooks/useDeliveryBodyScrollLock'
import { DeliveryCheckoutPinAjustadoDialog } from './DeliveryCheckoutPinAjustadoDialog'

type DeliveryCheckoutEnderecoMapaModalProps = {
  open: boolean
  localizacao: GeoJsonPoint | null
  /** Geocode original do endereço — centro do limite de arraste do pin. */
  localizacaoAncora?: GeoJsonPoint | null
  /** Raio máximo (m) a partir da âncora. Padrão: 500. */
  limiteArrasteMetros?: number
  pinMovido: boolean
  salvando?: boolean
  dialogPinAberto: boolean
  onChangePin: (point: GeoJsonPoint) => void
  onVoltar: () => void
  onConfirmar: () => void
  onConfirmarAjustePin: () => void
  onCancelarAjustePin: () => void
  resumoEndereco?: string
}

const LIMITE_ARRASTE_PIN_METROS_PADRAO = 500

/**
 * Modal do mapa sobre o formulário (portal no body): pin no endereço digitado;
 * arrastar só altera coordenadas (limitado ao raio da âncora do geocode).
 */
export function DeliveryCheckoutEnderecoMapaModal({
  open,
  localizacao,
  localizacaoAncora = null,
  limiteArrasteMetros = LIMITE_ARRASTE_PIN_METROS_PADRAO,
  pinMovido,
  salvando = false,
  dialogPinAberto,
  onChangePin,
  onVoltar,
  onConfirmar,
  onConfirmarAjustePin,
  onCancelarAjustePin,
  resumoEndereco,
}: DeliveryCheckoutEnderecoMapaModalProps) {
  useDeliveryBodyScrollLock(open)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  if (!open || !portalReady) return null

  return createPortal(
    <>
      <div
        className="delivery-vv-panel z-[120] flex flex-col rounded-t-2xl shadow-2xl"
        style={{
          backgroundColor: 'var(--delivery-surface, #ffffff)',
          height: 'calc(var(--delivery-vv-height, 100dvh) * 0.95)',
          top: 'calc(var(--delivery-vv-offset-top, 0px) + var(--delivery-vv-height, 100dvh) * 0.05)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-mapa-endereco-titulo"
      >
        <div
          className="flex shrink-0 items-center gap-2 border-b px-4 py-3"
          style={{
            borderColor: 'var(--delivery-primary-dark, #171717)',
            backgroundColor: 'var(--delivery-primary-dark, #171717)',
            color: '#ffffff',
          }}
        >
          <button
            type="button"
            data-checkout-leave-without-numero=""
            onMouseDown={e => e.preventDefault()}
            onClick={onVoltar}
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white"
          >
            <span className="text-lg leading-none">‹</span>
          </button>
          <div className="min-w-0 flex-1">
            <h2
              id="delivery-mapa-endereco-titulo"
              className="truncate text-center text-base font-semibold text-white"
            >
              Confirme a localização
            </h2>
            {resumoEndereco ? (
              <p className="mt-0.5 truncate text-center text-xs text-white/80">
                {resumoEndereco}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            data-checkout-leave-without-numero=""
            onMouseDown={e => e.preventDefault()}
            onClick={onVoltar}
            aria-label="Fechar mapa"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <EnderecoGeolocalizacaoMap
            value={localizacao}
            onChange={onChangePin}
            disabled={salvando}
            pinModo="endereco"
            hintBusca="arrastar o pin"
            containerClassName="absolute inset-0 overflow-hidden"
            overlayHintClassName="rounded-lg bg-white/95 px-3 py-2 text-center text-xs delivery-text-secondary shadow-sm"
            mapContainerStyle={{ width: '100%', height: '100%' }}
            balaoArrastarTexto="Você está aqui?"
            ancoraLimiteArraste={localizacaoAncora}
            limiteArrasteMetros={limiteArrasteMetros}
          />
          <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-4">
            <p
              className="rounded-full px-3 py-1.5 text-center text-xs font-medium shadow-sm"
              style={{
                backgroundColor: 'var(--delivery-surface, #ffffff)',
                color: 'var(--delivery-text-secondary)',
              }}
            >
              {pinMovido
                ? 'Pin movido — o endereço digitado não será alterado'
                : `Arraste o pin até ${limiteArrasteMetros} m do endereço`}
            </p>
          </div>
        </div>

        <div
          className="shrink-0"
          style={{
            paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="button"
            disabled={salvando || !localizacao || dialogPinAberto}
            onClick={onConfirmar}
            className="flex min-h-[3.5rem] w-full items-center justify-center gap-2 border-0 px-5 text-base font-semibold disabled:opacity-60"
            style={{
              backgroundColor: 'var(--delivery-primary-dark, #171717)',
              color: 'var(--delivery-btn-text, #ffffff)',
            }}
          >
            <MapPin className="h-4 w-4" aria-hidden />
            {salvando ? 'Salvando...' : 'Confirmar localização'}
          </button>
        </div>
      </div>

      <DeliveryCheckoutPinAjustadoDialog
        open={dialogPinAberto}
        variante="endereco"
        onConfirmar={onConfirmarAjustePin}
        onCancelar={onCancelarAjustePin}
      />
    </>,
    document.body
  )
}

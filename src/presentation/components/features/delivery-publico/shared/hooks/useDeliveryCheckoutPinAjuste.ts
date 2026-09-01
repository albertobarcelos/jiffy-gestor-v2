'use client'

import { useCallback, useRef, useState } from 'react'
import type { ModoAjustePinCheckout } from '@/src/application/dto/delivery-publico/EnderecoGeoCheckoutDTO'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { coordsPointsDiferem } from '@/src/shared/utils/geolocalizacaoEnderecoShared'

/** Etapas do diálogo após mover o pin (endereço novo / sem coordenadas). */
export type EtapaDialogPinCheckout =
  | 'ajuste_classico'
  | 'confirma_endereco'
  | 'ponto_diferente'

export function useDeliveryCheckoutPinAjuste() {
  const referenciaGeocodeRef = useRef<GeoJsonPoint | null>(null)
  const [modoAjustePin, setModoAjustePin] = useState<ModoAjustePinCheckout | null>(null)
  const [dialogEtapa, setDialogEtapa] = useState<EtapaDialogPinCheckout | null>(null)

  const registrarReferenciaGeocode = useCallback((point: GeoJsonPoint | null) => {
    referenciaGeocodeRef.current = point
    setModoAjustePin(null)
    setDialogEtapa(null)
  }, [])

  const pinDivergeDaReferencia = useCallback((point: GeoJsonPoint | null | undefined): boolean => {
    const referencia = referenciaGeocodeRef.current
    if (!referencia || !point) return false
    return coordsPointsDiferem(point, referencia)
  }, [])

  /** Reseta escolha ao mover o pin; o modal abre a etapa certa após o reverse. */
  const notificarPinMovido = useCallback(
    (point: GeoJsonPoint) => {
      if (!pinDivergeDaReferencia(point)) {
        setModoAjustePin(null)
        setDialogEtapa(null)
        return
      }
      setModoAjustePin(null)
      setDialogEtapa(null)
    },
    [pinDivergeDaReferencia]
  )

  const abrirDialogEtapa = useCallback((etapa: EtapaDialogPinCheckout) => {
    setModoAjustePin(null)
    setDialogEtapa(etapa)
  }, [])

  const escolherModoPin = useCallback((modo: ModoAjustePinCheckout) => {
    setModoAjustePin(modo)
    setDialogEtapa(null)
  }, [])

  const fecharDialogPin = useCallback(() => {
    setDialogEtapa(null)
  }, [])

  const exigeEscolhaModoPin = useCallback(
    (pinPosition: GeoJsonPoint | null): boolean => {
      return pinDivergeDaReferencia(pinPosition) && !modoAjustePin
    },
    [modoAjustePin, pinDivergeDaReferencia]
  )

  return {
    referenciaGeocodeRef,
    modoAjustePin,
    dialogEtapa,
    dialogAberto: dialogEtapa !== null,
    registrarReferenciaGeocode,
    notificarPinMovido,
    abrirDialogEtapa,
    escolherModoPin,
    fecharDialogPin,
    exigeEscolhaModoPin,
    pinDivergeDaReferencia,
  }
}

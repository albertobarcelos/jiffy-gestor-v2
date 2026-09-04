'use client'

import { useCallback, useRef, useState } from 'react'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'

type VariantePinAjustado = 'endereco' | 'preferencia'

type UseDeliveryCheckoutPinAjustadoParams = {
  usarPontoPreferencia: boolean
  enderecoLocalizacao: GeoJsonPoint | null
  preferenciaEntrega: GeoJsonPoint | null
  providerEnderecoId: string | null
  setEnderecoLocalizacao: (point: GeoJsonPoint | null) => void
  setPreferenciaEntrega: (point: GeoJsonPoint | null) => void
  setProviderEnderecoId: (id: string | null) => void
  marcarGeoSincronizada?: () => void
}

export function useDeliveryCheckoutPinAjustado({
  usarPontoPreferencia,
  enderecoLocalizacao,
  preferenciaEntrega,
  providerEnderecoId,
  setEnderecoLocalizacao,
  setPreferenciaEntrega,
  setProviderEnderecoId,
  marcarGeoSincronizada,
}: UseDeliveryCheckoutPinAjustadoParams) {
  const [dialogPinAberto, setDialogPinAberto] = useState(false)
  const [variantePin, setVariantePin] = useState<VariantePinAjustado>('endereco')
  const pinAnteriorRef = useRef<GeoJsonPoint | null>(null)
  const providerAnteriorRef = useRef<string | null>(null)

  const fecharDialogPin = useCallback(() => {
    setDialogPinAberto(false)
  }, [])

  const handleMapChange = useCallback(
    (point: GeoJsonPoint) => {
      if (usarPontoPreferencia) {
        pinAnteriorRef.current = preferenciaEntrega ?? enderecoLocalizacao
        setVariantePin('preferencia')
        setPreferenciaEntrega(point)
      } else {
        pinAnteriorRef.current = enderecoLocalizacao
        providerAnteriorRef.current = providerEnderecoId
        setVariantePin('endereco')
        setEnderecoLocalizacao(point)
        setProviderEnderecoId(null)
        marcarGeoSincronizada?.()
      }
      setDialogPinAberto(true)
    },
    [
      usarPontoPreferencia,
      preferenciaEntrega,
      enderecoLocalizacao,
      providerEnderecoId,
      setPreferenciaEntrega,
      setEnderecoLocalizacao,
      setProviderEnderecoId,
      marcarGeoSincronizada,
    ]
  )

  const confirmarAjustePin = useCallback(() => {
    setDialogPinAberto(false)
  }, [])

  const cancelarAjustePin = useCallback(() => {
    const anterior = pinAnteriorRef.current
    if (variantePin === 'preferencia') {
      setPreferenciaEntrega(anterior)
    } else {
      setEnderecoLocalizacao(anterior)
      setProviderEnderecoId(providerAnteriorRef.current)
    }
    setDialogPinAberto(false)
  }, [variantePin, setPreferenciaEntrega, setEnderecoLocalizacao, setProviderEnderecoId])

  return {
    dialogPinAberto,
    variantePin,
    handleMapChange,
    confirmarAjustePin,
    cancelarAjustePin,
    fecharDialogPin,
  }
}

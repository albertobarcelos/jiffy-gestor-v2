'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { GoogleMap, Marker, useGoogleMap, useJsApiLoader } from '@react-google-maps/api'
import {
  geoJsonPointFromLatLng,
  latLngFromGeoJsonPoint,
  type GeoJsonPoint,
} from '@/src/shared/types/geoJsonPoint'
import { getGoogleMapsApiKeyClient } from '@/src/shared/utils/googleMapsClient'
import { criarOpcoesIconePinPreferencia, labelPinPreferenciaMapa } from './geolocalizacaoMapPinIcons'

const MAP_CONTAINER_STYLE = { width: '100%', height: '320px' }

/** Visão inicial do MT — evita sugerir Cuiabá antes da busca. */
const FALLBACK_CENTER = { lat: -12.6819, lng: -56.9211 }
const FALLBACK_ZOOM = 6
const LOCALIZADO_ZOOM = 17

type LatLng = { lat: number; lng: number }

function MapRecenter({ position, zoom }: { position: LatLng; zoom: number }) {
  const map = useGoogleMap()

  useEffect(() => {
    if (!map) return
    map.panTo(position)
    map.setZoom(zoom)
  }, [map, position.lat, position.lng, zoom])

  return null
}

export type EnderecoGeolocalizacaoMapProps = {
  value: GeoJsonPoint | null
  onChange: (point: GeoJsonPoint) => void
  disabled?: boolean
  estado?: string
  /** Texto do hint quando o mapa ainda não foi posicionado. */
  hintBusca?: string
  /** Classes do container externo (borda/fundo). */
  containerClassName?: string
  /** Classes do aviso quando a chave não está configurada. */
  missingKeyClassName?: string
  /** Classes do aviso de erro de carregamento. */
  loadErrorClassName?: string
  /** Classes do hint sobreposto ao mapa. */
  overlayHintClassName?: string
  /** Pin arrastável: endereço (vermelho padrão) ou ponto de entrega (azul). */
  pinModo?: 'endereco' | 'preferencia'
  /** Endereço fixo no mapa (vermelho padrão) quando `pinModo` é preferencia. */
  localizacaoReferencia?: GeoJsonPoint | null
}

export function EnderecoGeolocalizacaoMap({
  value,
  onChange,
  disabled = false,
  estado,
  hintBusca = 'Buscar pelo endereço (Google)',
  containerClassName = 'relative overflow-hidden rounded-lg border border-gray-200',
  missingKeyClassName = 'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900',
  loadErrorClassName = 'rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700',
  overlayHintClassName = 'rounded-lg bg-white/95 px-3 py-2 text-center text-xs text-secondary-text shadow-sm',
  pinModo = 'endereco',
  localizacaoReferencia = null,
}: EnderecoGeolocalizacaoMapProps) {
  const apiKey = getGoogleMapsApiKeyClient()
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    language: 'pt-BR',
    region: 'BR',
  })

  const posicaoMarcador = useMemo(() => latLngFromGeoJsonPoint(value), [value])
  const posicaoReferencia = useMemo(
    () => latLngFromGeoJsonPoint(localizacaoReferencia),
    [localizacaoReferencia]
  )

  const modoPreferencia = pinModo === 'preferencia'
  const exibirReferenciaFixa = modoPreferencia && Boolean(posicaoReferencia)

  const iconePinPreferencia = useMemo(
    () => (modoPreferencia ? criarOpcoesIconePinPreferencia() : undefined),
    [modoPreferencia, isLoaded]
  )

  const centroInicial = posicaoMarcador ?? posicaoReferencia ?? FALLBACK_CENTER
  const zoomInicial = posicaoMarcador || posicaoReferencia ? LOCALIZADO_ZOOM : FALLBACK_ZOOM

  const handlePositionChange = useCallback(
    (lat: number, lng: number) => {
      if (disabled) return
      onChange(geoJsonPointFromLatLng(lat, lng))
    },
    [disabled, onChange]
  )

  if (!apiKey) {
    return (
      <div className={missingKeyClassName}>
        Defina <code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> no{' '}
        <code className="text-xs">.env.local</code> (mesma chave do Geocoding) para exibir o mapa.
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={loadErrorClassName}>
        Não foi possível carregar o Google Maps. Verifique a chave e as APIs habilitadas no Google Cloud.
      </div>
    )
  }

  if (!isLoaded) {
    return <div className="h-[320px] animate-pulse rounded-lg bg-gray-100" aria-hidden />
  }

  return (
    <div className={containerClassName}>
      {!posicaoMarcador && !posicaoReferencia ? (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center px-3">
          <p className={overlayHintClassName}>
            O mapa ainda não foi posicionado. Clique em{' '}
            <span className="font-semibold">{hintBusca}</span> ou toque no mapa para posicionar o
            pin.
            {estado ? ` (${estado})` : ''}
          </p>
        </div>
      ) : null}

      {modoPreferencia && (posicaoMarcador || posicaoReferencia) ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center px-3">
          <p className={overlayHintClassName}>
            <span className="font-semibold text-red-600">Vermelho</span> = endereço ·{' '}
            <span className="font-semibold" style={{ color: '#2563eb' }}>
              Azul
            </span>{' '}
            = ponto de entrega
          </p>
        </div>
      ) : null}

      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={centroInicial}
        zoom={zoomInicial}
        onClick={event => {
          if (!event.latLng) return
          handlePositionChange(event.latLng.lat(), event.latLng.lng())
        }}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {posicaoMarcador || posicaoReferencia ? (
          <MapRecenter
            position={posicaoMarcador ?? posicaoReferencia!}
            zoom={LOCALIZADO_ZOOM}
          />
        ) : null}
        {exibirReferenciaFixa && posicaoReferencia ? (
          <Marker
            position={posicaoReferencia}
            draggable={false}
            title="Endereço"
            zIndex={1}
          />
        ) : null}
        {posicaoMarcador ? (
          <Marker
            position={posicaoMarcador}
            draggable={!disabled}
            icon={modoPreferencia ? iconePinPreferencia : undefined}
            title={modoPreferencia ? labelPinPreferenciaMapa() : 'Localização do endereço'}
            zIndex={2}
            onDragEnd={event => {
              if (!event.latLng) return
              handlePositionChange(event.latLng.lat(), event.latLng.lng())
            }}
          />
        ) : null}
      </GoogleMap>
    </div>
  )
}

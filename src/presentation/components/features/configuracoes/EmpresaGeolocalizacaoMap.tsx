'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { GoogleMap, Marker, useGoogleMap, useJsApiLoader } from '@react-google-maps/api'
import {
  geoJsonPointFromLatLng,
  latLngFromGeoJsonPoint,
  type GeoJsonPoint,
} from '@/src/shared/types/geoJsonPoint'
import { getGoogleMapsApiKeyClient } from '@/src/shared/utils/googleMapsClient'

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

type EmpresaGeolocalizacaoMapProps = {
  value: GeoJsonPoint | null
  onChange: (point: GeoJsonPoint) => void
  disabled?: boolean
  estado?: string
}

export function EmpresaGeolocalizacaoMap({
  value,
  onChange,
  disabled = false,
  estado,
}: EmpresaGeolocalizacaoMapProps) {
  const apiKey = getGoogleMapsApiKeyClient()
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    language: 'pt-BR',
    region: 'BR',
  })

  const posicaoMarcador = useMemo(() => latLngFromGeoJsonPoint(value), [value])

  const centroInicial = posicaoMarcador ?? FALLBACK_CENTER
  const zoomInicial = posicaoMarcador ? LOCALIZADO_ZOOM : FALLBACK_ZOOM

  const handlePositionChange = useCallback(
    (lat: number, lng: number) => {
      if (disabled) return
      onChange(geoJsonPointFromLatLng(lat, lng))
    },
    [disabled, onChange]
  )

  if (!apiKey) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Defina <code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> no{' '}
        <code className="text-xs">.env.local</code> (mesma chave do Geocoding) para exibir o mapa.
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        Não foi possível carregar o Google Maps. Verifique a chave e as APIs habilitadas no Google Cloud.
      </div>
    )
  }

  if (!isLoaded) {
    return <div className="h-[320px] animate-pulse rounded-lg bg-gray-100" aria-hidden />
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-200">
      {!posicaoMarcador ? (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center px-3">
          <p className="rounded-lg bg-white/95 px-3 py-2 text-center text-xs text-secondary-text shadow-sm">
            O mapa ainda não foi posicionado. Clique em{' '}
            <span className="font-semibold text-primary-text">Buscar pelo endereço (Google)</span>.
            {estado ? ` (${estado})` : ''}
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
        {posicaoMarcador ? (
          <>
            <MapRecenter position={posicaoMarcador} zoom={LOCALIZADO_ZOOM} />
            <Marker
              position={posicaoMarcador}
              draggable={!disabled}
              onDragEnd={event => {
                if (!event.latLng) return
                handlePositionChange(event.latLng.lat(), event.latLng.lng())
              }}
            />
          </>
        ) : null}
      </GoogleMap>
    </div>
  )
}

'use client'

import { useEffect, useMemo } from 'react'
import { Circle, GoogleMap, Marker, useGoogleMap, useJsApiLoader } from '@react-google-maps/api'
import type { RaioEntregaDTO } from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import {
  latLngFromGeoJsonPoint,
  type GeoJsonPoint,
} from '@/src/shared/types/geoJsonPoint'
import { getGoogleMapsApiKeyClient } from '@/src/shared/utils/googleMapsClient'

const MAP_CONTAINER_STYLE = { width: '100%', height: '480px' }
const FALLBACK_CENTER = { lat: -12.6819, lng: -56.9211 }
const FALLBACK_ZOOM = 6
/** Zoom inicial com origem definida — ruas visíveis para desenhar raios. */
const LOCALIZADO_ZOOM = 15

const CORES_RAIOS = [
  { stroke: '#2563eb', fill: '#3b82f6' },
  { stroke: '#059669', fill: '#10b981' },
  { stroke: '#d97706', fill: '#f59e0b' },
  { stroke: '#7c3aed', fill: '#8b5cf6' },
] as const

type LatLng = { lat: number; lng: number }

function MapFitRaios({
  centro,
  raios,
}: {
  centro: LatLng
  raios: RaioEntregaDTO[]
}) {
  const map = useGoogleMap()

  useEffect(() => {
    if (!map || typeof google === 'undefined') return

    if (!raios.length) {
      map.panTo(centro)
      map.setZoom(LOCALIZADO_ZOOM)
      return
    }

    const bounds = new google.maps.LatLngBounds()
    bounds.extend(centro)

    for (const raio of raios) {
      const raioMetros = raio.distanciaMaximaEmMetros
      const latDelta = raioMetros / 111_320
      const lngDelta = raioMetros / (111_320 * Math.cos((centro.lat * Math.PI) / 180))
      bounds.extend({ lat: centro.lat + latDelta, lng: centro.lng + lngDelta })
      bounds.extend({ lat: centro.lat - latDelta, lng: centro.lng - lngDelta })
    }

    map.fitBounds(bounds, 48)
  }, [map, centro.lat, centro.lng, raios])

  return null
}

type CoberturaDeliveryMapProps = {
  origem: GeoJsonPoint | null
  raios: RaioEntregaDTO[]
}

export function CoberturaDeliveryMap({ origem, raios }: CoberturaDeliveryMapProps) {
  const apiKey = getGoogleMapsApiKeyClient()
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    language: 'pt-BR',
    region: 'BR',
  })

  const centro = useMemo(() => latLngFromGeoJsonPoint(origem), [origem])
  const centroMapa = centro ?? FALLBACK_CENTER
  const zoomInicial = centro ? LOCALIZADO_ZOOM : FALLBACK_ZOOM

  if (!apiKey) {
    return (
      <div className="rounded-lg border border-alternate/30 bg-alternate/10 px-3 py-2 text-sm text-alternate">
        Defina <code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> no{' '}
        <code className="text-xs">.env.local</code> para visualizar a cobertura no mapa.
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        Não foi possível carregar o Google Maps.
      </div>
    )
  }

  if (!isLoaded) {
    return <div className="h-[480px] animate-pulse rounded-lg bg-gray-100" aria-hidden />
  }

  if (!centro) {
    return (
      <div className="rounded-lg border border-alternate/30 bg-alternate/10 px-4 py-6 text-center text-sm text-alternate">
        <p className="font-semibold">Geolocalização da loja não configurada</p>
        <p className="mt-1 text-xs text-alternate/80">
          Os raios de entrega usam o endereço da empresa como origem. Configure a localização na
          aba Empresa antes de cadastrar raios.
        </p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-200">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={centroMapa}
        zoom={zoomInicial}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        <MapFitRaios centro={centro} raios={raios} />
        <Marker position={centro} title="Origem da loja" />
        {raios.map((raio, index) => {
          const cores = CORES_RAIOS[index % CORES_RAIOS.length]
          const opacidade = raio.ativo ? 0.22 : 0.08
          const strokeOpacidade = raio.ativo ? 0.85 : 0.35
          return (
            <Circle
              key={raio.id}
              center={centro}
              radius={raio.distanciaMaximaEmMetros}
              options={{
                strokeColor: cores.stroke,
                strokeOpacity: strokeOpacidade,
                strokeWeight: 2,
                fillColor: cores.fill,
                fillOpacity: opacidade,
                clickable: false,
              }}
            />
          )
        })}
      </GoogleMap>
    </div>
  )
}

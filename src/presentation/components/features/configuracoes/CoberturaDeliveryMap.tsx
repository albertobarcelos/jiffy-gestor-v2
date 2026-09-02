'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Circle,
  GoogleMap,
  Marker,
  Polygon,
  useGoogleMap,
  useJsApiLoader,
} from '@react-google-maps/api'
import type { AreaEntregaDTO, RaioEntregaDTO } from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import {
  latLngFromGeoJsonPoint,
  type GeoJsonPoint,
} from '@/src/shared/types/geoJsonPoint'
import {
  geoJsonToLatLngRings,
  type LatLngLiteral,
} from '@/src/shared/types/geoJsonPolygon'
import { getGoogleMapsApiKeyClient } from '@/src/shared/utils/googleMapsClient'
import { googleMapsLoaderConfig } from '@/src/shared/utils/googleMapsLoader'

const MAP_CONTAINER_STYLE = { width: '100%', height: '480px' }
const FALLBACK_CENTER = { lat: -12.6819, lng: -56.9211 }
const FALLBACK_ZOOM = 6
const LOCALIZADO_ZOOM = 15
const MIN_VERTICES_AREA = 3

const CORES_COBERTURA = [
  { stroke: '#2563eb', fill: '#3b82f6' },
  { stroke: '#059669', fill: '#10b981' },
  { stroke: '#d97706', fill: '#f59e0b' },
  { stroke: '#7c3aed', fill: '#8b5cf6' },
  { stroke: '#db2777', fill: '#ec4899' },
  { stroke: '#0891b2', fill: '#06b6d4' },
] as const

type LatLng = { lat: number; lng: number }

function MapFitCobertura({
  centro,
  raios,
  areas,
  rascunhoPaths,
  congelarVisao,
}: {
  centro: LatLng
  raios: RaioEntregaDTO[]
  areas: AreaEntregaDTO[]
  rascunhoPaths: LatLngLiteral[] | null
  congelarVisao: boolean
}) {
  const map = useGoogleMap()

  useEffect(() => {
    if (!map || typeof google === 'undefined' || congelarVisao) return

    const bounds = new google.maps.LatLngBounds()
    bounds.extend(centro)

    for (const raio of raios) {
      const raioMetros = raio.distanciaMaximaEmMetros
      const latDelta = raioMetros / 111_320
      const lngDelta = raioMetros / (111_320 * Math.cos((centro.lat * Math.PI) / 180))
      bounds.extend({ lat: centro.lat + latDelta, lng: centro.lng + lngDelta })
      bounds.extend({ lat: centro.lat - latDelta, lng: centro.lng - lngDelta })
    }

    for (const area of areas) {
      for (const ring of geoJsonToLatLngRings(area.area)) {
        for (const p of ring) bounds.extend(p)
      }
    }

    if (rascunhoPaths?.length) {
      for (const p of rascunhoPaths) bounds.extend(p)
    }

    const temExtensao =
      raios.length > 0 || areas.length > 0 || (rascunhoPaths?.length ?? 0) > 0

    if (!temExtensao) {
      map.panTo(centro)
      map.setZoom(LOCALIZADO_ZOOM)
      return
    }

    map.fitBounds(bounds, 48)
  }, [map, centro.lat, centro.lng, raios, areas, rascunhoPaths, congelarVisao])

  return null
}

/** Desenho manual por cliques — vértices arrastáveis para ajuste fino. */
function MapDesenhoPoligonoManual({
  ativo,
  vertices,
  onAddVertice,
  onMoveVertice,
}: {
  ativo: boolean
  vertices: LatLngLiteral[]
  onAddVertice: (vertice: LatLngLiteral) => void
  onMoveVertice: (index: number, vertice: LatLngLiteral) => void
}) {
  const map = useGoogleMap()
  const interagindoComVerticeRef = useRef(false)

  useEffect(() => {
    if (!ativo || !map) return

    map.setOptions({ draggableCursor: 'crosshair', draggingCursor: 'grab' })

    const listener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng || interagindoComVerticeRef.current) return
      onAddVertice({ lat: event.latLng.lat(), lng: event.latLng.lng() })
    })

    return () => {
      listener.remove()
      map.setOptions({ draggableCursor: undefined, draggingCursor: undefined })
    }
  }, [ativo, map, onAddVertice])

  useEffect(() => {
    if (!map || !ativo) return

    const markers: google.maps.Marker[] = []
    const listeners: google.maps.MapsEventListener[] = []

    const lerPosicoesMarcadores = (): LatLngLiteral[] =>
      markers
        .map(marker => {
          const pos = marker.getPosition()
          return pos ? { lat: pos.lat(), lng: pos.lng() } : null
        })
        .filter((p): p is LatLngLiteral => p != null)

    const linhaAberta = new google.maps.Polyline({
      map,
      strokeColor: '#1d4ed8',
      strokeOpacity: 0.95,
      strokeWeight: 2,
      clickable: false,
      zIndex: 9,
    })

    const poligonoPreview = new google.maps.Polygon({
      map,
      strokeColor: '#1d4ed8',
      strokeOpacity: 0.95,
      strokeWeight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.25,
      clickable: false,
      zIndex: 8,
    })

    const atualizarOverlays = () => {
      const posicoes = lerPosicoesMarcadores()
      if (posicoes.length >= 2) {
        linhaAberta.setPath(posicoes)
        linhaAberta.setMap(map)
      } else {
        linhaAberta.setMap(null)
      }

      if (posicoes.length >= MIN_VERTICES_AREA) {
        poligonoPreview.setPaths(posicoes)
        poligonoPreview.setMap(map)
      } else {
        poligonoPreview.setMap(null)
      }
    }

    for (let index = 0; index < vertices.length; index++) {
      const vertice = vertices[index]
      const marker = new google.maps.Marker({
        map,
        position: vertice,
        draggable: true,
        clickable: true,
        cursor: 'grab',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#1d4ed8',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        zIndex: 10 + index,
      })

      listeners.push(
        marker.addListener('mousedown', () => {
          interagindoComVerticeRef.current = true
        })
      )

      listeners.push(
        marker.addListener('drag', () => {
          atualizarOverlays()
        })
      )

      listeners.push(
        marker.addListener('dragend', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return
          onMoveVertice(index, { lat: event.latLng.lat(), lng: event.latLng.lng() })
          window.setTimeout(() => {
            interagindoComVerticeRef.current = false
          }, 0)
        })
      )

      listeners.push(
        marker.addListener('mouseup', () => {
          window.setTimeout(() => {
            interagindoComVerticeRef.current = false
          }, 0)
        })
      )

      markers.push(marker)
    }

    atualizarOverlays()

    return () => {
      for (const listener of listeners) listener.remove()
      for (const marker of markers) marker.setMap(null)
      linhaAberta.setMap(null)
      poligonoPreview.setMap(null)
    }
  }, [ativo, map, vertices, onMoveVertice])

  return null
}

type CoberturaDeliveryMapProps = {
  origem: GeoJsonPoint | null
  raios: RaioEntregaDTO[]
  areas: AreaEntregaDTO[]
  modoDesenho?: boolean
  rascunhoPaths?: LatLngLiteral[] | null
  areaDestacadaId?: string | null
  onPoligonoDesenhado?: (paths: LatLngLiteral[]) => void
  onDesenhoCancelado?: () => void
}

export function CoberturaDeliveryMap({
  origem,
  raios,
  areas,
  modoDesenho = false,
  rascunhoPaths = null,
  areaDestacadaId = null,
  onPoligonoDesenhado,
  onDesenhoCancelado,
}: CoberturaDeliveryMapProps) {
  const apiKey = getGoogleMapsApiKeyClient()
  const { isLoaded, loadError } = useJsApiLoader(googleMapsLoaderConfig(apiKey))
  const [verticesDesenho, setVerticesDesenho] = useState<LatLngLiteral[]>([])

  const centro = useMemo(() => latLngFromGeoJsonPoint(origem), [origem])
  const centroMapa = centro ?? FALLBACK_CENTER
  const zoomInicial = centro ? LOCALIZADO_ZOOM : FALLBACK_ZOOM

  useEffect(() => {
    if (!modoDesenho) setVerticesDesenho([])
  }, [modoDesenho])

  const handleAddVertice = useCallback((vertice: LatLngLiteral) => {
    setVerticesDesenho(prev => [...prev, vertice])
  }, [])

  const handleMoveVertice = useCallback((index: number, vertice: LatLngLiteral) => {
    setVerticesDesenho(prev => {
      if (index < 0 || index >= prev.length) return prev
      const next = [...prev]
      next[index] = vertice
      return next
    })
  }, [])

  const handleDesfazerVertice = useCallback(() => {
    setVerticesDesenho(prev => prev.slice(0, -1))
  }, [])

  const handleConcluirDesenho = useCallback(() => {
    if (verticesDesenho.length < MIN_VERTICES_AREA) return
    onPoligonoDesenhado?.(verticesDesenho)
    setVerticesDesenho([])
  }, [onPoligonoDesenhado, verticesDesenho])

  const handleCancelarDesenho = useCallback(() => {
    setVerticesDesenho([])
    onDesenhoCancelado?.()
  }, [onDesenhoCancelado])

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
          A cobertura usa o endereço da empresa como referência. Configure a localização na aba
          Empresa antes de cadastrar raios ou áreas.
        </p>
      </div>
    )
  }

  const podeConcluir = verticesDesenho.length >= MIN_VERTICES_AREA

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-200">
      {modoDesenho ? (
        <div className="absolute left-0 right-0 top-0 z-10 space-y-2 bg-primary/95 px-3 py-2 text-xs text-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {verticesDesenho.length === 0
                ? 'Clique no mapa para marcar os vértices da área.'
                : `${verticesDesenho.length} ponto${verticesDesenho.length === 1 ? '' : 's'} marcado${verticesDesenho.length === 1 ? '' : 's'}. Arraste um ponto para ajustar ou continue clicando.`}
            </span>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <button
                type="button"
                onClick={handleDesfazerVertice}
                disabled={verticesDesenho.length === 0}
                className="rounded-md bg-white/20 px-2 py-1 font-semibold hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Desfazer
              </button>
              <button
                type="button"
                onClick={handleConcluirDesenho}
                disabled={!podeConcluir}
                className="rounded-md bg-white px-2 py-1 font-semibold text-primary hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Concluir área
              </button>
              <button
                type="button"
                onClick={handleCancelarDesenho}
                className="rounded-md bg-white/20 px-2 py-1 font-semibold hover:bg-white/30"
              >
                Cancelar
              </button>
            </div>
          </div>
          {!podeConcluir ? (
            <p className="text-[11px] text-white/80">
              Mínimo de {MIN_VERTICES_AREA} pontos. Com {MIN_VERTICES_AREA} ou mais, a área fecha
              automaticamente — arraste os pontos azuis para refinar.
            </p>
          ) : (
            <p className="text-[11px] text-white/80">
              Área fechada. Arraste os pontos para ajustar antes de concluir.
            </p>
          )}
        </div>
      ) : null}

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
        <MapFitCobertura
          centro={centro}
          raios={raios}
          areas={areas}
          rascunhoPaths={rascunhoPaths}
          congelarVisao={modoDesenho}
        />
        <Marker position={centro} title="Origem da loja" />

        {raios.map((raio, index) => {
          const cores = CORES_COBERTURA[index % CORES_COBERTURA.length]
          const opacidade = raio.ativo ? 0.18 : 0.06
          const strokeOpacidade = raio.ativo ? 0.7 : 0.3
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
                zIndex: 1,
              }}
            />
          )
        })}

        {areas.map((area, index) => {
          const cores = CORES_COBERTURA[(index + raios.length) % CORES_COBERTURA.length]
          const destacada = areaDestacadaId === area.id
          const opacidade = area.ativo ? (destacada ? 0.38 : 0.28) : 0.08
          const strokeOpacidade = area.ativo ? (destacada ? 1 : 0.85) : 0.35
          const rings = geoJsonToLatLngRings(area.area)

          return rings.map((paths, ringIndex) => (
            <Polygon
              key={`${area.id}-${ringIndex}`}
              paths={paths}
              options={{
                strokeColor: cores.stroke,
                strokeOpacity: strokeOpacidade,
                strokeWeight: destacada ? 3 : 2,
                fillColor: cores.fill,
                fillOpacity: opacidade,
                clickable: false,
                zIndex: destacada ? 3 : 2,
              }}
            />
          ))
        })}

        {rascunhoPaths && rascunhoPaths.length >= MIN_VERTICES_AREA ? (
          <Polygon
            paths={rascunhoPaths}
            options={{
              strokeColor: '#1d4ed8',
              strokeOpacity: 0.95,
              strokeWeight: 2,
              fillColor: '#3b82f6',
              fillOpacity: 0.35,
              clickable: false,
              zIndex: 4,
            }}
          />
        ) : null}

        {modoDesenho ? (
          <MapDesenhoPoligonoManual
            ativo={modoDesenho}
            vertices={verticesDesenho}
            onAddVertice={handleAddVertice}
            onMoveVertice={handleMoveVertice}
          />
        ) : null}
      </GoogleMap>
    </div>
  )
}

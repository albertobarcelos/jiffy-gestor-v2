'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  GoogleMap,
  InfoWindow,
  Marker,
  Polygon,
  useGoogleMap,
  useJsApiLoader,
} from '@react-google-maps/api'
import {
  MdDeleteOutline,
  MdDraw,
  MdOpenWith,
  MdRadioButtonUnchecked,
  MdSatelliteAlt,
  MdZoomIn,
  MdZoomOut,
} from 'react-icons/md'
import type { AreaEntregaDTO, RaioEntregaDTO } from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import {
  geoJsonPointFromLatLng,
  latLngFromGeoJsonPoint,
  pontosGeoIguais,
  type GeoJsonPoint,
} from '@/src/shared/types/geoJsonPoint'
import {
  geoJsonToLatLngRings,
  type LatLngLiteral,
} from '@/src/shared/types/geoJsonPolygon'
import { distanciaMetrosEntrePontos } from '@/src/shared/utils/calcularTaxaCoberturaPonto'
import { getGoogleMapsApiKeyClient } from '@/src/shared/utils/googleMapsClient'
import { googleMapsLoaderConfig } from '@/src/shared/utils/googleMapsLoader'
import {
  MENSAGEM_MAPA_INDISPONIVEL_SUPORTE,
} from '@/src/shared/utils/googleMapsFalha'
import {
  mapaGoogleAuthFalhou,
  onMapaGoogleAuthFailure,
} from '@/src/shared/utils/googleMapsFalhaCliente'
import { pathsDeAnelFaixa } from '@/src/shared/utils/geoJsonCircle'
import { RAIO_AJUSTE_PIN_METROS } from '@/src/shared/utils/ajustePinEmpresa'
import {
  anelDaFaixaKm,
  assinaturaEnquadramentoCobertura,
  estiloOverlayCobertura,
  raioAlcanceMaximo,
  raioIdNoPonto,
} from '@/src/shared/utils/coberturaMapaDestaque'
import { criarOpcoesIconePinLoja } from '@/src/presentation/components/shared/geolocalizacao/geolocalizacaoMapPinIcons'

export type FerramentaCobertura = 'navegar' | 'poligono' | 'circulo' | 'mover' | 'apagar'

export type AcoesDesenhoCobertura = {
  desfazer: () => void
  concluir: () => void
  cancelar: () => void
}

export type EstadoDesenhoCobertura = {
  pontos: number
  podeConcluir: boolean
}

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }
const FALLBACK_CENTER = { lat: -12.6819, lng: -56.9211 }
const FALLBACK_ZOOM = 6
const LOCALIZADO_ZOOM = 15
const NENHUM_RAIO_ENQUADRAMENTO: Array<{ distanciaMaximaEmMetros: number }> = []
const MIN_VERTICES_AREA = 3

const CORES_COBERTURA = [
  { stroke: '#3b82f6', fill: '#3b82f6' },
  { stroke: '#2563eb', fill: '#60a5fa' },
  { stroke: '#7c3aed', fill: '#a78bfa' },
  { stroke: '#530CA3', fill: '#7c3aed' },
  { stroke: '#0891b2', fill: '#06b6d4' },
  { stroke: '#059669', fill: '#10b981' },
] as const
const COR_RAIO_IDLE = { stroke: '#3b82f6', fill: '#3b82f6' }
const COR_RAIO_DESTAQUE = { stroke: '#530CA3', fill: '#7c3aed' }
const Z_INDEX_PIN_LOJA = 10_000

type LatLng = { lat: number; lng: number }

function MapFitCobertura({
  centro,
  raios,
  areas,
  rascunhoPaths,
  congelarVisao,
}: {
  centro: LatLng | null
  raios: Array<{ distanciaMaximaEmMetros: number }>
  areas: AreaEntregaDTO[]
  rascunhoPaths: LatLngLiteral[] | null
  congelarVisao: boolean
}) {
  const map = useGoogleMap()
  const assinatura = assinaturaEnquadramentoCobertura({
    centro,
    raiosMetros: raios.map(raio => raio.distanciaMaximaEmMetros),
    areaIds: areas.map(area => area.id),
    rascunhoPontos: rascunhoPaths?.length ?? 0,
  })

  useEffect(() => {
    if (!map || typeof google === 'undefined' || congelarVisao || !centro) return

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
    // Enquadra só quando pin, alcance ou áreas mudam — zoom e pan do operador ficam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, assinatura, congelarVisao])

  return null
}

/** Limite de ajuste do pin: 1 km a partir do endereço geocodificado da empresa. */
function MapRaioAjustePin({ centro }: { centro: LatLng }) {
  const map = useGoogleMap()

  useEffect(() => {
    if (!map || typeof google === 'undefined') return
    const circle = new google.maps.Circle({
      map,
      center: centro,
      radius: RAIO_AJUSTE_PIN_METROS,
      strokeColor: '#EA4335',
      strokeOpacity: 0.85,
      strokeWeight: 1,
      fillColor: '#EA4335',
      fillOpacity: 0,
      clickable: false,
      zIndex: 2,
    })
    return () => circle.setMap(null)
  }, [map, centro.lat, centro.lng])

  return null
}

/** Círculos imperativos — evita “fantasma” do Circle do @react-google-maps/api ao mudar o raio. */
function MapRaiosCirculos({
  centro,
  raios,
  haDestaqueAtivo,
}: {
  centro: LatLng
  raios: Array<Pick<RaioEntregaDTO, 'id' | 'distanciaMaximaEmMetros' | 'ativo'>>
  haDestaqueAtivo: boolean
}) {
  const map = useGoogleMap()

  const raiosSignature = useMemo(
    () =>
      raios
        .map(r => `${r.id}:${r.distanciaMaximaEmMetros}:${r.ativo ? 1 : 0}`)
        .join('|'),
    [raios]
  )

  useEffect(() => {
    if (!map || typeof google === 'undefined') return

    const ordenados = [...raios].sort(
      (a, b) => b.distanciaMaximaEmMetros - a.distanciaMaximaEmMetros
    )
    const polygons: google.maps.Polygon[] = []
    for (let index = 0; index < ordenados.length; index++) {
      const raio = ordenados[index]
      if (!raio.ativo) continue
      const anel = anelDaFaixaKm(raios, raio.id)
      if (!anel) continue
      const estilo = estiloOverlayCobertura({
        ativo: true,
        destacado: false,
        haDestaqueAtivo,
        variante: 'raio',
      })
      polygons.push(
        new google.maps.Polygon({
          map,
          paths: pathsDeAnelFaixa(centro, anel.innerMetros, anel.outerMetros),
          strokeColor: COR_RAIO_IDLE.stroke,
          strokeOpacity: estilo.strokeOpacity,
          strokeWeight: estilo.strokeWeight,
          fillColor: COR_RAIO_IDLE.fill,
          fillOpacity: estilo.fillOpacity,
          clickable: false,
          zIndex: index,
        })
      )
    }

    return () => {
      for (const polygon of polygons) polygon.setMap(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, centro.lat, centro.lng, raiosSignature, haDestaqueAtivo])

  return null
}

function MapRaioHoverPorDistancia({
  centro,
  raios,
  habilitado,
  onHoverRaio,
  onHoverFim,
}: {
  centro: LatLng
  raios: Array<Pick<RaioEntregaDTO, 'id' | 'distanciaMaximaEmMetros' | 'ativo'>>
  habilitado: boolean
  onHoverRaio?: (raioId: string) => void
  onHoverFim?: () => void
}) {
  const map = useGoogleMap()
  const onHoverRaioRef = useRef(onHoverRaio)
  const onHoverFimRef = useRef(onHoverFim)
  const raiosRef = useRef(raios)
  onHoverRaioRef.current = onHoverRaio
  onHoverFimRef.current = onHoverFim
  raiosRef.current = raios

  useEffect(() => {
    if (!map || !habilitado) return
    let ultimoId: string | null | undefined
    const origem = geoJsonPointFromLatLng(centro.lat, centro.lng)
    const move = map.addListener('mousemove', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return
      const destino = geoJsonPointFromLatLng(event.latLng.lat(), event.latLng.lng())
      const id = raioIdNoPonto(raiosRef.current, distanciaMetrosEntrePontos(origem, destino))
      if (id === ultimoId) return
      ultimoId = id
      if (id) onHoverRaioRef.current?.(id)
      else onHoverFimRef.current?.()
    })
    const sair = map.addListener('mouseout', () => {
      if (ultimoId == null) return
      ultimoId = null
      onHoverFimRef.current?.()
    })
    return () => {
      move.remove()
      sair.remove()
    }
  }, [map, habilitado, centro.lat, centro.lng])

  return null
}

function MapRaioFaixaDestaque({
  centro,
  raios,
  raioDestacadoId,
}: {
  centro: LatLng
  raios: Array<Pick<RaioEntregaDTO, 'id' | 'distanciaMaximaEmMetros'>>
  raioDestacadoId: string | null
}) {
  const map = useGoogleMap()
  const anel = raioDestacadoId ? anelDaFaixaKm(raios, raioDestacadoId) : null
  const innerMetros = anel?.innerMetros
  const outerMetros = anel?.outerMetros

  useEffect(() => {
    if (!map || typeof google === 'undefined' || innerMetros == null || outerMetros == null) return
    const paths = pathsDeAnelFaixa(centro, innerMetros, outerMetros)
    const polygon = new google.maps.Polygon({
      map,
      paths,
      strokeColor: COR_RAIO_DESTAQUE.stroke,
      strokeOpacity: 1,
      strokeWeight: 2,
      fillColor: COR_RAIO_DESTAQUE.fill,
      fillOpacity: 0.32,
      clickable: false,
      zIndex: 8,
    })
    return () => {
      polygon.setMap(null)
    }
  }, [map, centro.lat, centro.lng, innerMetros, outerMetros])

  return null
}

function lerPathsDoPoligono(polygon: google.maps.Polygon): LatLngLiteral[] {
  const path = polygon.getPath()
  const coords: LatLngLiteral[] = []
  for (let i = 0; i < path.getLength(); i++) {
    const p = path.getAt(i)
    coords.push({ lat: p.lat(), lng: p.lng() })
  }
  return coords
}

/** Polígonos imperativos — clique seleciona; área em edição fica com vértices arrastáveis. */
function MapAreasPoligonos({
  areas,
  raiosCount,
  areaDestacadaId,
  areaFormaEditandoId,
  destacarTodasAreas,
  haDestaqueAtivo,
  selecaoHabilitada,
  hoverHabilitado,
  arrasteHabilitado,
  apagarHabilitado,
  onSelecionarArea,
  onFormaAlterada,
  onAreaArrastada,
  onApagarArea,
  onHoverArea,
  onHoverFim,
}: {
  areas: AreaEntregaDTO[]
  raiosCount: number
  areaDestacadaId: string | null
  areaFormaEditandoId: string | null
  destacarTodasAreas: boolean
  haDestaqueAtivo: boolean
  selecaoHabilitada: boolean
  hoverHabilitado: boolean
  arrasteHabilitado: boolean
  apagarHabilitado: boolean
  onSelecionarArea?: (areaId: string) => void
  onFormaAlterada?: (areaId: string, paths: LatLngLiteral[]) => void
  onAreaArrastada?: (areaId: string, paths: LatLngLiteral[]) => void
  onApagarArea?: (areaId: string) => void
  onHoverArea?: (areaId: string) => void
  onHoverFim?: () => void
}) {
  const map = useGoogleMap()
  const onSelecionarRef = useRef(onSelecionarArea)
  const onFormaAlteradaRef = useRef(onFormaAlterada)
  const onAreaArrastadaRef = useRef(onAreaArrastada)
  const onApagarAreaRef = useRef(onApagarArea)
  const onHoverAreaRef = useRef(onHoverArea)
  const onHoverFimRef = useRef(onHoverFim)
  onSelecionarRef.current = onSelecionarArea
  onFormaAlteradaRef.current = onFormaAlterada
  onAreaArrastadaRef.current = onAreaArrastada
  onApagarAreaRef.current = onApagarArea
  onHoverAreaRef.current = onHoverArea
  onHoverFimRef.current = onHoverFim

  const areasSignature = useMemo(
    () =>
      areas
        .map(a => `${a.id}:${a.ativo ? 1 : 0}:${JSON.stringify(a.area.coordinates)}`)
        .join('|'),
    [areas]
  )

  useEffect(() => {
    if (!map || typeof google === 'undefined') return

    const polygons: google.maps.Polygon[] = []
    const listeners: google.maps.MapsEventListener[] = []

    for (let index = 0; index < areas.length; index++) {
      const area = areas[index]
      if (!area.ativo && areaFormaEditandoId !== area.id) continue
      const cores = CORES_COBERTURA[(index + raiosCount) % CORES_COBERTURA.length]
      const editando = areaFormaEditandoId === area.id
      const destacada = editando || destacarTodasAreas || areaDestacadaId === area.id
      const estilo = estiloOverlayCobertura({
        ativo: area.ativo,
        destacado: destacada,
        haDestaqueAtivo,
        variante: 'area',
        editando,
      })
      const rings = geoJsonToLatLngRings(area.area)

      for (const paths of rings) {
        const polygon = new google.maps.Polygon({
          map,
          paths,
          strokeColor: cores.stroke,
          strokeOpacity: estilo.strokeOpacity,
          strokeWeight: estilo.strokeWeight,
          fillColor: cores.fill,
          fillOpacity: estilo.fillOpacity,
          clickable:
            ((selecaoHabilitada || apagarHabilitado) && !editando) ||
            (hoverHabilitado && !editando) ||
            (arrasteHabilitado && !editando),
          editable: editando,
          draggable: arrasteHabilitado && !editando,
          zIndex: estilo.zIndex,
        })
        polygons.push(polygon)

        if (apagarHabilitado && !editando) {
          listeners.push(
            polygon.addListener('click', (event: google.maps.MapMouseEvent) => {
              event.stop?.()
              onApagarAreaRef.current?.(area.id)
            })
          )
        } else if (selecaoHabilitada && !editando) {
          listeners.push(
            polygon.addListener('click', (event: google.maps.MapMouseEvent) => {
              event.stop?.()
              onSelecionarRef.current?.(area.id)
            })
          )
        } else {
          listeners.push(
            polygon.addListener('click', (event: google.maps.MapMouseEvent) => {
              event.stop?.()
            })
          )
        }

        if (arrasteHabilitado && !editando) {
          listeners.push(
            polygon.addListener('dragend', () => {
              onAreaArrastadaRef.current?.(area.id, lerPathsDoPoligono(polygon))
            })
          )
        }

        if (hoverHabilitado && !editando) {
          listeners.push(
            polygon.addListener('mouseover', () => {
              onHoverAreaRef.current?.(area.id)
            })
          )
          listeners.push(
            polygon.addListener('mouseout', () => {
              onHoverFimRef.current?.()
            })
          )
        }

        if (editando) {
          const path = polygon.getPath()
          const emitir = () => onFormaAlteradaRef.current?.(area.id, lerPathsDoPoligono(polygon))
          listeners.push(path.addListener('set_at', emitir))
          listeners.push(path.addListener('insert_at', emitir))
          listeners.push(path.addListener('remove_at', emitir))
        }
      }
    }

    return () => {
      for (const listener of listeners) listener.remove()
      for (const polygon of polygons) polygon.setMap(null)
    }
    // areas: recria só quando a assinatura de geometria/ativo muda (não a cada re-render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, areasSignature, raiosCount, areaDestacadaId, areaFormaEditandoId, destacarTodasAreas, haDestaqueAtivo, selecaoHabilitada, hoverHabilitado, arrasteHabilitado, apagarHabilitado])

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

function MapDesenhoCirculo({
  ativo,
  onCirculoDesenhado,
}: {
  ativo: boolean
  onCirculoDesenhado: (centro: LatLngLiteral, raioMetros: number) => void
}) {
  const map = useGoogleMap()
  const onCirculoRef = useRef(onCirculoDesenhado)
  onCirculoRef.current = onCirculoDesenhado

  useEffect(() => {
    if (!ativo || !map || typeof google === 'undefined') return

    map.setOptions({ draggableCursor: 'crosshair' })

    let centro: LatLngLiteral | null = null
    let marker: google.maps.Marker | null = null
    let circle: google.maps.Circle | null = null
    let linha: google.maps.Polyline | null = null

    const limparOverlays = () => {
      marker?.setMap(null)
      circle?.setMap(null)
      linha?.setMap(null)
      marker = null
      circle = null
      linha = null
    }

    const click = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return
      const ponto = { lat: event.latLng.lat(), lng: event.latLng.lng() }
      if (!centro) {
        centro = ponto
        marker = new google.maps.Marker({
          map,
          position: ponto,
          clickable: false,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: '#1d4ed8',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          zIndex: 12,
        })
        circle = new google.maps.Circle({
          map,
          center: ponto,
          radius: 1,
          strokeColor: '#1d4ed8',
          strokeOpacity: 0.95,
          strokeWeight: 2,
          fillColor: '#3b82f6',
          fillOpacity: 0.22,
          clickable: false,
          zIndex: 8,
        })
        linha = new google.maps.Polyline({
          map,
          path: [ponto, ponto],
          strokeColor: '#1d4ed8',
          strokeOpacity: 0.85,
          strokeWeight: 2,
          clickable: false,
          zIndex: 9,
        })
        return
      }

      const metros = distanciaMetrosEntrePontos(
        geoJsonPointFromLatLng(centro.lat, centro.lng),
        geoJsonPointFromLatLng(ponto.lat, ponto.lng)
      )
      if (metros < 15) return
      onCirculoRef.current(centro, metros)
    })

    const move = map.addListener('mousemove', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng || !centro || !circle || !linha) return
      const borda = { lat: event.latLng.lat(), lng: event.latLng.lng() }
      const metros = distanciaMetrosEntrePontos(
        geoJsonPointFromLatLng(centro.lat, centro.lng),
        geoJsonPointFromLatLng(borda.lat, borda.lng)
      )
      circle.setRadius(Math.max(metros, 1))
      linha.setPath([centro, borda])
    })

    return () => {
      click.remove()
      move.remove()
      limparOverlays()
      map.setOptions({ draggableCursor: undefined })
    }
  }, [ativo, map])

  return null
}

type CoberturaDeliveryMapProps = {
  origem: GeoJsonPoint | null
  raios: RaioEntregaDTO[]
  areas: AreaEntregaDTO[]
  ferramenta?: FerramentaCobertura
  rascunhoPaths?: LatLngLiteral[] | null
  areaDestacadaId?: string | null
  raioDestacadoId?: string | null
  destacarTodasAreas?: boolean
  areaFormaEditandoId?: string | null
  ferramentasHabilitadas?: boolean
  desenhoHabilitado?: boolean
  onFerramentaChange?: (ferramenta: FerramentaCobertura) => void
  onPoligonoDesenhado?: (paths: LatLngLiteral[]) => void
  onCirculoDesenhado?: (centro: LatLngLiteral, raioMetros: number) => void
  onDesenhoCancelado?: () => void
  onSelecionarAreaParaEditar?: (areaId: string) => void
  onFormaAreaAlterada?: (areaId: string, paths: LatLngLiteral[]) => void
  onAreaArrastada?: (areaId: string, paths: LatLngLiteral[]) => void
  onApagarArea?: (areaId: string) => void
  pinRascunho?: GeoJsonPoint | null
  pinSnapEpoch?: number
  centroAjustePin?: GeoJsonPoint | null
  onPinMovido?: (point: GeoJsonPoint) => void
  onDesenhoEstadoChange?: (estado: EstadoDesenhoCobertura) => void
  onAcoesDesenhoProntas?: (acoes: AcoesDesenhoCobertura | null) => void
  onHoverArea?: (areaId: string) => void
  onHoverRaio?: (raioId: string) => void
  onHoverFim?: () => void
}

function classeBotaoFerramenta(ativa: boolean, perigo = false): string {
  if (ativa && perigo) return 'bg-red-600 text-white'
  if (ativa) return 'bg-primary text-white'
  return 'bg-white text-primary-text hover:bg-gray-50'
}

export function CoberturaDeliveryMap({
  origem,
  raios,
  areas,
  ferramenta = 'navegar',
  rascunhoPaths = null,
  areaDestacadaId = null,
  raioDestacadoId = null,
  destacarTodasAreas = false,
  areaFormaEditandoId = null,
  ferramentasHabilitadas = true,
  desenhoHabilitado = true,
  onFerramentaChange,
  onPoligonoDesenhado,
  onCirculoDesenhado,
  onDesenhoCancelado,
  onSelecionarAreaParaEditar,
  onFormaAreaAlterada,
  onAreaArrastada,
  onApagarArea,
  pinRascunho = null,
  pinSnapEpoch = 0,
  centroAjustePin = null,
  onPinMovido,
  onDesenhoEstadoChange,
  onAcoesDesenhoProntas,
  onHoverArea,
  onHoverRaio,
  onHoverFim,
}: CoberturaDeliveryMapProps) {
  const apiKey = getGoogleMapsApiKeyClient()
  const loaderConfig = useMemo(() => googleMapsLoaderConfig(apiKey), [apiKey])
  const { isLoaded, loadError } = useJsApiLoader(loaderConfig)
  const [authFalhou, setAuthFalhou] = useState(mapaGoogleAuthFalhou)
  const [verticesDesenho, setVerticesDesenho] = useState<LatLngLiteral[]>([])
  const [satelite, setSatelite] = useState(false)
  const [balaoPinAberto, setBalaoPinAberto] = useState(true)
  const mapRef = useRef<google.maps.Map | null>(null)

  const modoDesenho = ferramenta === 'poligono'
  const modoCirculo = ferramenta === 'circulo'
  const arrasteHabilitado = ferramenta === 'mover' && !areaFormaEditandoId
  const apagarHabilitado = ferramenta === 'apagar' && !areaFormaEditandoId
  const pinArrastavel = Boolean(onPinMovido) && ferramenta !== 'poligono' && ferramenta !== 'circulo'

  const centroRaios = useMemo(() => latLngFromGeoJsonPoint(origem), [origem])
  const centroPin = useMemo(
    () => latLngFromGeoJsonPoint(pinRascunho ?? origem),
    [pinRascunho, origem]
  )
  const centroAjuste = useMemo(() => latLngFromGeoJsonPoint(centroAjustePin), [centroAjustePin])
  const pinPendente = Boolean(pinRascunho && !pontosGeoIguais(pinRascunho, origem))
  const centroMapa = centroRaios ?? centroPin ?? FALLBACK_CENTER
  const zoomInicial = centroRaios || centroPin ? LOCALIZADO_ZOOM : FALLBACK_ZOOM
  const centroMapaRef = useRef(centroMapa)
  const zoomInicialRef = useRef(zoomInicial)
  centroMapaRef.current = centroMapa
  zoomInicialRef.current = zoomInicial
  const hoverHabilitado = ferramenta === 'navegar' && !areaFormaEditandoId
  const haDestaqueAtivo = Boolean(
    areaDestacadaId || raioDestacadoId || destacarTodasAreas || areaFormaEditandoId
  )
  const raiosEnquadramento = useMemo(() => {
    const alcance = raioAlcanceMaximo(raios.filter(raio => raio.ativo))
    return alcance
      ? [{ distanciaMaximaEmMetros: alcance.distanciaMaximaEmMetros }]
      : NENHUM_RAIO_ENQUADRAMENTO
  }, [raios])

  useEffect(() => {
    if (!modoDesenho) setVerticesDesenho([])
  }, [modoDesenho])

  useEffect(() => onMapaGoogleAuthFailure(() => setAuthFalhou(true)), [])

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

  useEffect(() => {
    onDesenhoEstadoChange?.({
      pontos: verticesDesenho.length,
      podeConcluir: verticesDesenho.length >= MIN_VERTICES_AREA,
    })
  }, [onDesenhoEstadoChange, verticesDesenho.length])

  useEffect(() => {
    if (!modoDesenho) {
      onAcoesDesenhoProntas?.(null)
      return
    }
    onAcoesDesenhoProntas?.({
      desfazer: handleDesfazerVertice,
      concluir: handleConcluirDesenho,
      cancelar: handleCancelarDesenho,
    })
    return () => onAcoesDesenhoProntas?.(null)
  }, [
    modoDesenho,
    handleDesfazerVertice,
    handleConcluirDesenho,
    handleCancelarDesenho,
    onAcoesDesenhoProntas,
  ])

  const handleLoadMapa = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    map.setCenter(centroMapaRef.current)
    map.setZoom(zoomInicialRef.current)
  }, [])

  useEffect(() => {
    mapRef.current?.setMapTypeId(satelite ? 'hybrid' : 'roadmap')
  }, [satelite])

  const handleZoom = useCallback((delta: number) => {
    const map = mapRef.current
    if (!map) return
    const atual = map.getZoom() ?? LOCALIZADO_ZOOM
    map.setZoom(Math.min(21, Math.max(3, atual + delta)))
  }, [])

  const handlePinDragEnd = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return
      onPinMovido?.(geoJsonPointFromLatLng(event.latLng.lat(), event.latLng.lng()))
    },
    [onPinMovido]
  )

  const handleMapClickParaPinar = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (ferramenta !== 'navegar' || !event.latLng || areaFormaEditandoId) return
      onPinMovido?.(geoJsonPointFromLatLng(event.latLng.lat(), event.latLng.lng()))
    },
    [areaFormaEditandoId, ferramenta, onPinMovido]
  )

  if (!apiKey || loadError || authFalhou) {
    if (loadError) {
      console.error('[jiffy:mapa] cobertura useJsApiLoader', loadError)
    }
    if (!apiKey) {
      console.error('[jiffy:mapa] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ausente no cliente')
    }
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 rounded-lg bg-white px-6 text-center">
        <p className="max-w-sm text-sm font-medium text-primary-text">
          {MENSAGEM_MAPA_INDISPONIVEL_SUPORTE}
        </p>
      </div>
    )
  }

  if (!isLoaded) {
    return <div className="h-full min-h-[280px] animate-pulse rounded-lg bg-gray-100" aria-hidden />
  }

  const dicaInferior =
    ferramenta === 'poligono'
      ? verticesDesenho.length === 0
        ? 'Clique no mapa para marcar os vértices. Use o card à esquerda para concluir.'
        : `${verticesDesenho.length} ponto${verticesDesenho.length === 1 ? '' : 's'}. Mínimo de ${MIN_VERTICES_AREA} para fechar a área.`
      : ferramenta === 'circulo'
        ? 'Clique no centro e de novo na borda. Isso cria uma área com nome e taxa, mesmo fora do raio.'
        : ferramenta === 'mover'
          ? 'Arraste uma área no mapa para reposicionar.'
          : ferramenta === 'apagar'
            ? 'Clique em uma área para excluir.'
            : !centroPin
              ? 'Clique no mapa para marcar a loja, até 1 km do endereço. Depois confirme no card à esquerda.'
              : areaFormaEditandoId
              ? 'Arraste os vértices. Use Salvar forma no card à esquerda.'
              : pinPendente
                ? 'Pin movido (máx. 1 km do endereço). Confirme no card à esquerda para atualizar os raios.'
                : pinArrastavel
                ? 'Clique no mapa ou arraste o pin até 1 km do endereço. Confirme no card para gravar.'
                : null

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      {ferramentasHabilitadas ? (
        <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            title="Aproximar"
            aria-label="Aproximar"
            onClick={() => handleZoom(1)}
            className="p-2.5 text-primary-text hover:bg-gray-50"
          >
            <MdZoomIn className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            title="Afastar"
            aria-label="Afastar"
            onClick={() => handleZoom(-1)}
            className="p-2.5 text-primary-text hover:bg-gray-50"
          >
            <MdZoomOut className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            title={satelite ? 'Mapa' : 'Satélite'}
            aria-label={satelite ? 'Ver mapa' : 'Ver satélite'}
            onClick={() => setSatelite(v => !v)}
            className={`p-2.5 ${satelite ? 'bg-primary text-white' : 'text-primary-text hover:bg-gray-50'}`}
          >
            <MdSatelliteAlt className="h-5 w-5" aria-hidden />
          </button>
          {desenhoHabilitado ? (
            <>
          <span className="mx-2 border-t border-gray-100" />
          <button
            type="button"
            title="Desenhar polígono"
            aria-label="Desenhar polígono"
            onClick={() => onFerramentaChange?.(ferramenta === 'poligono' ? 'navegar' : 'poligono')}
            className={`p-2.5 ${classeBotaoFerramenta(ferramenta === 'poligono')}`}
          >
            <MdDraw className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            title="Desenhar círculo"
            aria-label="Desenhar círculo"
            onClick={() => onFerramentaChange?.(ferramenta === 'circulo' ? 'navegar' : 'circulo')}
            className={`p-2.5 ${classeBotaoFerramenta(ferramenta === 'circulo')}`}
          >
            <MdRadioButtonUnchecked className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            title="Mover área"
            aria-label="Mover área"
            onClick={() => onFerramentaChange?.(ferramenta === 'mover' ? 'navegar' : 'mover')}
            className={`p-2.5 ${classeBotaoFerramenta(ferramenta === 'mover')}`}
          >
            <MdOpenWith className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            title="Apagar área"
            aria-label="Apagar área"
            onClick={() => onFerramentaChange?.(ferramenta === 'apagar' ? 'navegar' : 'apagar')}
            className={`p-2.5 ${classeBotaoFerramenta(ferramenta === 'apagar', true)}`}
          >
            <MdDeleteOutline className="h-5 w-5" aria-hidden />
          </button>
            </>
          ) : null}
        </div>
      ) : null}

      {dicaInferior ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 max-w-sm -translate-x-1/2 rounded-lg bg-black/65 px-3 py-1.5 text-center text-[11px] text-white shadow-sm">
          {dicaInferior}
        </div>
      ) : null}

      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        onLoad={handleLoadMapa}
        onClick={handleMapClickParaPinar}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: false,
          mapTypeId: satelite ? 'hybrid' : 'roadmap',
          gestureHandling: arrasteHabilitado ? 'cooperative' : 'greedy',
          clickableIcons: false,
        }}
      >
        <MapFitCobertura
          centro={centroRaios}
          raios={raiosEnquadramento}
          areas={areas}
          rascunhoPaths={rascunhoPaths}
          congelarVisao={modoDesenho || modoCirculo || Boolean(areaFormaEditandoId) || pinPendente}
        />
        {centroAjuste ? <MapRaioAjustePin centro={centroAjuste} /> : null}
        {centroPin ? (
          <>
            <Marker
              key={`${centroPin.lat.toFixed(6)}-${centroPin.lng.toFixed(6)}-${pinSnapEpoch}`}
              position={centroPin}
              draggable={pinArrastavel}
              zIndex={Z_INDEX_PIN_LOJA}
              icon={criarOpcoesIconePinLoja()}
              onClick={() => setBalaoPinAberto(true)}
              onDragStart={() => setBalaoPinAberto(false)}
              onDragEnd={event => {
                handlePinDragEnd(event)
                setBalaoPinAberto(true)
              }}
            />
            {balaoPinAberto ? (
              <InfoWindow
                position={centroPin}
                onCloseClick={() => setBalaoPinAberto(false)}
                options={{
                  pixelOffset: new google.maps.Size(0, -42),
                  maxWidth: 260,
                  zIndex: Z_INDEX_PIN_LOJA + 1,
                }}
              >
                <p className="m-0 max-w-[14rem] pr-1 text-[13px] font-medium leading-snug text-gray-800">
                  {pinPendente
                    ? 'Confirme a localização no card à esquerda para atualizar os raios.'
                    : 'Você está aqui? Clique no mapa ou arraste até 1 km do endereço.'}
                </p>
              </InfoWindow>
            ) : null}
          </>
        ) : null}
        {centroRaios ? (
          <>
            <MapRaiosCirculos
              centro={centroRaios}
              raios={raios}
              haDestaqueAtivo={Boolean(areaDestacadaId || destacarTodasAreas)}
            />
            <MapRaioHoverPorDistancia
              centro={centroRaios}
              raios={raios}
              habilitado={hoverHabilitado}
              onHoverRaio={onHoverRaio}
              onHoverFim={onHoverFim}
            />
            <MapRaioFaixaDestaque
              centro={centroRaios}
              raios={raios}
              raioDestacadoId={
                raioDestacadoId && raios.some(raio => raio.id === raioDestacadoId && raio.ativo)
                  ? raioDestacadoId
                  : null
              }
            />
          </>
        ) : null}

        <MapAreasPoligonos
          areas={areas}
          raiosCount={raios.length}
          areaDestacadaId={areaDestacadaId}
          areaFormaEditandoId={areaFormaEditandoId}
          destacarTodasAreas={destacarTodasAreas}
          haDestaqueAtivo={haDestaqueAtivo}
          selecaoHabilitada={ferramenta === 'navegar' && !areaFormaEditandoId}
          hoverHabilitado={hoverHabilitado}
          arrasteHabilitado={arrasteHabilitado}
          apagarHabilitado={apagarHabilitado}
          onSelecionarArea={onSelecionarAreaParaEditar}
          onFormaAlterada={onFormaAreaAlterada}
          onAreaArrastada={onAreaArrastada}
          onApagarArea={onApagarArea}
          onHoverArea={onHoverArea}
          onHoverFim={onHoverFim}
        />

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

        {modoCirculo ? (
          <MapDesenhoCirculo ativo={modoCirculo} onCirculoDesenhado={onCirculoDesenhado ?? (() => {})} />
        ) : null}
      </GoogleMap>
    </div>
  )
}

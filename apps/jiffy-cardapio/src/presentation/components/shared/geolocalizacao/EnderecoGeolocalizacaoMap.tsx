'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  GoogleMap,
  Marker,
  OverlayView,
  useGoogleMap,
  useJsApiLoader,
} from '@react-google-maps/api'
import {
  geoJsonPointFromLatLng,
  latLngFromGeoJsonPoint,
  type GeoJsonPoint,
} from '@/src/shared/types/geoJsonPoint'
import { getGoogleMapsApiKeyClient } from '@/src/shared/utils/googleMapsClient'
import { googleMapsLoaderConfig } from '@/src/shared/utils/googleMapsLoader'
import {
  criarOpcoesIconePinEndereco,
  criarOpcoesIconePinPreferencia,
  labelPinPreferenciaMapa,
} from './geolocalizacaoMapPinIcons'

const MAP_CONTAINER_STYLE_DEFAULT = { width: '100%', height: '320px' }

/** Visão inicial do MT — evita sugerir Cuiabá antes da busca. */
const FALLBACK_CENTER = { lat: -12.6819, lng: -56.9211 }
const FALLBACK_ZOOM = 6
const LOCALIZADO_ZOOM = 17

type LatLng = { lat: number; lng: number }

/** Centraliza só na abertura — não reposiciona o mapa ao soltar/mover o pin. */
function MapRecenterInicial({ position, zoom }: { position: LatLng; zoom: number }) {
  const map = useGoogleMap()
  const jaCentralizou = useRef(false)

  useEffect(() => {
    if (!map || jaCentralizou.current) return
    map.panTo(position)
    map.setZoom(zoom)
    jaCentralizou.current = true
  }, [map, position.lat, position.lng, zoom])

  return null
}

function BalaoPinArrastar({ texto }: { texto: string }) {
  return (
    <div
      className="pointer-events-none"
      style={{
        // OverlayView ancora no canto superior esquerdo do lat/lng —
        // translate(-50%) centra no pin sem depender da medição do Maps.
        transform: 'translate(-50%, calc(-100% - 40px))',
        width: 'max-content',
        maxWidth: 'none',
        overflow: 'visible',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 'max-content',
          whiteSpace: 'nowrap',
          backgroundColor: 'var(--delivery-surface, #ffffff)',
          color: 'var(--delivery-text, #171717)',
          border: '1px solid var(--delivery-border, #e5e5e5)',
          borderRadius: 14,
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: 400,
          lineHeight: 1.3,
          boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
        }}
      >
        {texto}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: '100%',
            width: 0,
            height: 0,
            marginLeft: -7,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '7px solid var(--delivery-surface, #ffffff)',
            filter: 'drop-shadow(0 1px 0 var(--delivery-border, #e5e5e5))',
          }}
        />
      </div>
    </div>
  )
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
  /** Estilo do container interno do Google Map (ex.: altura fullscreen). */
  mapContainerStyle?: CSSProperties
  /** Texto do balão exibido após soltar o pin (fica até confirmar ou arrastar de novo). */
  balaoArrastarTexto?: string
}

export function EnderecoGeolocalizacaoMap({
  value,
  onChange,
  disabled = false,
  estado,
  hintBusca = 'Buscar pelo endereço (Google)',
  containerClassName = 'relative overflow-hidden rounded-lg border border-gray-200',
  missingKeyClassName = 'rounded-lg border border-alternate/30 bg-alternate/10 px-3 py-2 text-sm text-alternate',
  loadErrorClassName = 'rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700',
  overlayHintClassName = 'rounded-lg bg-white/95 px-3 py-2 text-center text-xs text-secondary-text shadow-sm',
  pinModo = 'endereco',
  localizacaoReferencia = null,
  mapContainerStyle,
  balaoArrastarTexto,
}: EnderecoGeolocalizacaoMapProps) {
  const apiKey = getGoogleMapsApiKeyClient()
  const { isLoaded, loadError } = useJsApiLoader(googleMapsLoaderConfig(apiKey))
  const mapStyle = mapContainerStyle ?? MAP_CONTAINER_STYLE_DEFAULT
  const mapHeight =
    typeof mapStyle.height === 'number'
      ? `${mapStyle.height}px`
      : (mapStyle.height ?? '320px')

  const [mostrarBalaoAposSoltar, setMostrarBalaoAposSoltar] = useState(false)

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
  const iconePinEndereco = useMemo(
    () => (!modoPreferencia ? criarOpcoesIconePinEndereco() : undefined),
    [modoPreferencia, isLoaded]
  )

  // Congela o centro inicial: o `center` controlado do GoogleMap recentralizaria a cada move do pin.
  const centroInicialRef = useRef(posicaoMarcador ?? posicaoReferencia ?? FALLBACK_CENTER)
  const zoomInicialRef = useRef(posicaoMarcador || posicaoReferencia ? LOCALIZADO_ZOOM : FALLBACK_ZOOM)

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
    return (
      <div
        className="animate-pulse rounded-lg bg-gray-100"
        style={{ height: mapHeight }}
        aria-hidden
      />
    )
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
        mapContainerStyle={mapStyle}
        center={centroInicialRef.current}
        zoom={zoomInicialRef.current}
        onClick={event => {
          if (!event.latLng) return
          handlePositionChange(event.latLng.lat(), event.latLng.lng())
        }}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
        }}
      >
        {posicaoMarcador || posicaoReferencia ? (
          <MapRecenterInicial
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
            icon={modoPreferencia ? iconePinPreferencia : iconePinEndereco}
            title={modoPreferencia ? labelPinPreferenciaMapa() : 'Localização do endereço'}
            zIndex={2}
            onDragStart={() => {
              setMostrarBalaoAposSoltar(false)
            }}
            onDragEnd={event => {
              if (!event.latLng) return
              handlePositionChange(event.latLng.lat(), event.latLng.lng())
              setMostrarBalaoAposSoltar(true)
            }}
          />
        ) : null}
        {balaoArrastarTexto && mostrarBalaoAposSoltar && posicaoMarcador ? (
          <OverlayView
            position={posicaoMarcador}
            mapPaneName={OverlayView.FLOAT_PANE}
            getPixelPositionOffset={() => ({ x: 0, y: 0 })}
          >
            <BalaoPinArrastar texto={balaoArrastarTexto} />
          </OverlayView>
        ) : null}
      </GoogleMap>
    </div>
  )
}

'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MdLocationOn, MdMyLocation } from 'react-icons/md'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import {
  enderecoGeocodeAtendeMinimo,
  enriquecerEnderecoParaGeocode,
  descreverCamposGeocodeFaltantes,
  geocodificarEnderecoViaGoogle,
  montarEnderecoParaGeocode,
  serializarEnderecoParaGeocode,
  type EnderecoGeocodeInput,
  type GeocodeMinimoModo,
} from '@/src/shared/utils/geolocalizacaoEnderecoShared'
import type { EnderecoGeolocalizacaoMapProps } from './EnderecoGeolocalizacaoMap'
import { showToast } from '@/src/shared/utils/toast'

const EnderecoGeolocalizacaoMap = dynamic(
  () =>
    import('./EnderecoGeolocalizacaoMap').then(module => ({
      default: module.EnderecoGeolocalizacaoMap,
    })),
  {
    ssr: false,
    loading: () => <div className="h-[320px] animate-pulse rounded-lg bg-gray-100" aria-hidden />,
  }
)

export type EnderecoGeolocalizacaoSectionVariant = 'empresa' | 'delivery'

const VARIANT_STYLES: Record<
  EnderecoGeolocalizacaoSectionVariant,
  {
    titleClass: string
    subtitleClass: string
    badgeOk: string
    badgePending: string
    panelClass: string
    infoClass: string
    warningClass: string
    addressPreviewClass: string
    buttonClass: string
    hintClass: string
    mapProps: Partial<EnderecoGeolocalizacaoMapProps>
  }
> = {
  empresa: {
    titleClass: 'text-lg font-semibold text-primary',
    subtitleClass: 'text-xs text-secondary-text md:text-sm',
    badgeOk: 'bg-emerald-100 text-emerald-800',
    badgePending: 'bg-amber-100 text-amber-900',
    panelClass: 'space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm',
    infoClass: 'rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-secondary-text',
    warningClass: 'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900',
    addressPreviewClass: 'rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-secondary-text',
    buttonClass:
      'inline-flex h-9 items-center gap-2 rounded-lg border border-secondary px-3 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-50',
    hintClass: 'text-xs text-secondary-text',
    mapProps: {},
  },
  delivery: {
    titleClass: 'text-sm font-semibold delivery-text-primary',
    subtitleClass: 'text-xs delivery-text-secondary',
    badgeOk: 'bg-emerald-100 text-emerald-800',
    badgePending: 'bg-amber-100 text-amber-900',
    panelClass: 'space-y-2 rounded-xl border p-2.5',
    infoClass:
      'rounded-lg border px-3 py-1.5 text-sm delivery-text-secondary',
    warningClass:
      'rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-900',
    addressPreviewClass:
      'rounded-lg border px-3 py-1.5 text-xs delivery-text-secondary',
    buttonClass:
      'flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold delivery-text-primary disabled:opacity-50',
    hintClass: 'text-xs delivery-text-secondary',
    mapProps: {
      containerClassName:
        'relative overflow-hidden rounded-lg border',
      overlayHintClassName:
        'rounded-lg bg-[var(--delivery-surface,#fff)]/95 px-3 py-2 text-center text-xs delivery-text-secondary shadow-sm',
    },
  },
}

export type EnderecoGeolocalizacaoSectionProps = {
  endereco: EnderecoGeocodeInput
  localizacao: GeoJsonPoint | null
  onLocalizacaoChange: (
    point: GeoJsonPoint | null,
    meta?: { providerEnderecoId?: string | null; enderecoFormatado?: string | null }
  ) => void
  /** Posição exibida no mapa (pin). Se omitido, usa `localizacao`. */
  mapValue?: GeoJsonPoint | null
  /** Callback ao arrastar/clicar no mapa. Se omitido, usa `onLocalizacaoChange`. */
  onMapChange?: (point: GeoJsonPoint) => void
  disabled?: boolean
  enderecoAlterado?: boolean
  variant?: EnderecoGeolocalizacaoSectionVariant
  title?: string
  subtitle?: string
  obrigatorio?: boolean
  sectionId?: string
  buscarLabel?: string
  successToast?: string
  disabledMessage?: string
  /** `flexivel` libera busca para endereços legados sem UF (ex.: checkout delivery). */
  geocodeMinimo?: GeocodeMinimoModo
  /** Atualiza o pin automaticamente quando os campos do endereço mudam. */
  autoGeocode?: boolean
  autoGeocodeDebounceMs?: number
  onGeocodeBuscandoChange?: (buscando: boolean) => void
}

export function EnderecoGeolocalizacaoSection({
  endereco,
  localizacao,
  onLocalizacaoChange,
  mapValue,
  onMapChange,
  disabled = false,
  enderecoAlterado = false,
  variant = 'empresa',
  title = 'Localização no mapa',
  subtitle = 'Confirme o ponto de entrega arrastando o pin, se necessário.',
  obrigatorio = false,
  sectionId,
  buscarLabel = 'Buscar pelo endereço (Google)',
  successToast = 'Localização encontrada. Confira o pin no mapa.',
  disabledMessage,
  geocodeMinimo,
  autoGeocode = false,
  autoGeocodeDebounceMs = 700,
  onGeocodeBuscandoChange,
}: EnderecoGeolocalizacaoSectionProps) {
  const [buscandoGeocode, setBuscandoGeocode] = useState(false)
  const [buscandoGeocodeAuto, setBuscandoGeocodeAuto] = useState(false)
  const [erroGeocodeAuto, setErroGeocodeAuto] = useState<string | null>(null)
  const [ultimoEnderecoFormatado, setUltimoEnderecoFormatado] = useState<string | null>(null)
  const mapAnchorRef = useRef<HTMLDivElement>(null)
  const geocodeAutoSeqRef = useRef(0)
  const enderecoGeoKey = useMemo(() => serializarEnderecoParaGeocode(endereco), [endereco])
  const minimoGeocode: GeocodeMinimoModo =
    geocodeMinimo ?? (variant === 'delivery' ? 'flexivel' : 'strict')
  const configurada = Boolean(mapValue ?? localizacao)
  const enderecoConsulta = useMemo(() => montarEnderecoParaGeocode(endereco), [endereco])
  const camposMinimosOk = enderecoGeocodeAtendeMinimo(endereco, minimoGeocode)
  const camposFaltantesMsg = useMemo(
    () => descreverCamposGeocodeFaltantes(endereco, minimoGeocode),
    [endereco, minimoGeocode]
  )
  const podeBuscar = camposMinimosOk && !disabled
  const styles = VARIANT_STYLES[variant]
  const panelStyle =
    variant === 'delivery'
      ? ({ borderColor: 'var(--delivery-border)', backgroundColor: 'var(--delivery-surface)' } as const)
      : undefined
  const infoStyle =
    variant === 'delivery'
      ? ({ borderColor: 'var(--delivery-border)', backgroundColor: 'var(--delivery-surface-muted)' } as const)
      : undefined
  const buttonStyle =
    variant === 'delivery' ? ({ borderColor: 'var(--delivery-border)' } as const) : undefined

  const rolarMapaParaVisivel = () => {
    const el = mapAnchorRef.current
    if (!el) return
    // Duplo rAF: espera o pin/layout atualizar após a busca.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' })
      })
    })
  }

  const buscarGeocode = async (
    opts: { silencioso: boolean; rolarMapa: boolean },
    seqEsperada?: number
  ) => {
    if (disabled || !camposMinimosOk) return false

    if (opts.rolarMapa) rolarMapaParaVisivel()
    try {
      const resultado = await geocodificarEnderecoViaGoogle(endereco, { minimo: minimoGeocode })
      if (seqEsperada !== undefined && seqEsperada !== geocodeAutoSeqRef.current) {
        return false
      }
      onLocalizacaoChange(resultado.enderecoLocalizacao, {
        providerEnderecoId: resultado.providerEnderecoId,
        enderecoFormatado: resultado.enderecoFormatado,
      })
      setUltimoEnderecoFormatado(resultado.enderecoFormatado)
      setErroGeocodeAuto(null)
      if (!opts.silencioso) {
        showToast.success(successToast)
        rolarMapaParaVisivel()
      }
      return true
    } catch (error) {
      if (seqEsperada !== undefined && seqEsperada !== geocodeAutoSeqRef.current) {
        return false
      }
      const msg = error instanceof Error ? error.message : 'Erro ao buscar localização'
      setErroGeocodeAuto(msg)
      if (!opts.silencioso) {
        showToast.error(msg)
      }
      return false
    }
  }

  const buscarLocalizacaoPeloEndereco = async () => {
    if (disabled) {
      showToast.error(
        disabledMessage ?? 'Complete os campos do endereço antes de buscar a localização.'
      )
      return
    }

    if (!camposMinimosOk) {
      showToast.error(
        camposFaltantesMsg ??
          'Preencha rua, número, cidade e estado antes de buscar no Google.'
      )
      return
    }

    setBuscandoGeocode(true)
    await buscarGeocode({ silencioso: false, rolarMapa: true })
    setBuscandoGeocode(false)
  }

  useEffect(() => {
    onGeocodeBuscandoChange?.(buscandoGeocode || buscandoGeocodeAuto)
  }, [buscandoGeocode, buscandoGeocodeAuto, onGeocodeBuscandoChange])

  useEffect(() => {
    if (!autoGeocode || disabled) return
    if (!camposMinimosOk) {
      setErroGeocodeAuto(null)
      return
    }

    const seq = ++geocodeAutoSeqRef.current
    setErroGeocodeAuto(null)

    const timer = setTimeout(() => {
      void (async () => {
        setBuscandoGeocodeAuto(true)
        await buscarGeocode({ silencioso: true, rolarMapa: false }, seq)
        if (seq === geocodeAutoSeqRef.current) {
          setBuscandoGeocodeAuto(false)
        }
      })()
    }, autoGeocodeDebounceMs)

    return () => {
      clearTimeout(timer)
    }
    // enderecoGeoKey agrega os campos relevantes; endereco é lido no closure do timeout via ref implícito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGeocode, disabled, camposMinimosOk, enderecoGeoKey, minimoGeocode])

  return (
    <section id={sectionId} className={sectionId ? 'scroll-mt-24' : undefined}>
      <div
        className={`mb-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between ${
          variant === 'delivery' ? 'gap-1' : 'gap-2'
        }`}
      >
        <div>
          <h4 className={styles.titleClass}>
            {title}
            {obrigatorio ? <span className="text-red-500"> *</span> : null}
          </h4>
          {subtitle ? <p className={styles.subtitleClass}>{subtitle}</p> : null}
        </div>
        <span
          className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
            configurada ? styles.badgeOk : styles.badgePending
          }`}
        >
          <MdLocationOn className="h-4 w-4" aria-hidden />
          {configurada ? 'Localização definida' : 'Localização pendente'}
        </span>
      </div>

      <div className={styles.panelClass} style={panelStyle}>
        {disabled && disabledMessage ? (
          <p className={styles.infoClass} style={infoStyle}>
            {disabledMessage}
          </p>
        ) : null}

        {enderecoAlterado && !autoGeocode ? (
          <p className={styles.warningClass}>
            O endereço textual foi alterado. Busque novamente no Google ou ajuste o pin.
          </p>
        ) : null}

        {autoGeocode && (buscandoGeocodeAuto || buscandoGeocode) ? (
          <p className={styles.infoClass} style={infoStyle}>
            Atualizando localização no mapa…
          </p>
        ) : null}

        {autoGeocode && erroGeocodeAuto && camposMinimosOk ? (
          <p className={styles.warningClass}>
            {erroGeocodeAuto} Você pode ajustar o pin manualmente ou tentar novamente.
          </p>
        ) : null}

        {!camposMinimosOk && camposFaltantesMsg ? (
          <p className={styles.warningClass}>{camposFaltantesMsg}</p>
        ) : null}

        {variant !== 'delivery' ? (
          <div className={styles.addressPreviewClass} style={infoStyle}>
            <p className="font-semibold text-primary-text">
              Endereço enviado ao Google:
            </p>
            <p className="mt-1 break-words">
              {enderecoConsulta || 'Preencha rua, número, cidade e estado.'}
            </p>
          </div>
        ) : null}

        <div className={variant === 'delivery' ? undefined : 'flex flex-wrap gap-2'}>
          <button
            type="button"
            onClick={() => void buscarLocalizacaoPeloEndereco()}
            disabled={!podeBuscar || buscandoGeocode}
            className={styles.buttonClass}
            style={buttonStyle}
          >
            <MdMyLocation className="h-4 w-4" aria-hidden />
            {buscandoGeocode ? 'Buscando…' : buscarLabel}
          </button>
        </div>

        {variant !== 'delivery' && ultimoEnderecoFormatado ? (
          <p className={styles.hintClass}>
            Google retornou:{' '}
            <span className="font-medium text-primary-text">
              {ultimoEnderecoFormatado}
            </span>
          </p>
        ) : null}

        <p className={styles.hintClass}>
          {autoGeocode
            ? 'O mapa atualiza ao alterar o endereço. Arraste o pin se precisar ajustar o ponto exato.'
            : 'Depois da busca, clique no mapa ou arraste o pin para marcar o ponto exato da entrega.'}
        </p>

        <div
          ref={mapAnchorRef}
          className={variant === 'delivery' ? 'scroll-mb-28' : undefined}
        >
          <EnderecoGeolocalizacaoMap
            value={mapValue ?? localizacao}
            onChange={point => (onMapChange ? onMapChange(point) : onLocalizacaoChange(point))}
            disabled={disabled}
            estado={endereco.estado}
            hintBusca={buscarLabel}
            {...styles.mapProps}
          />
        </div>
      </div>
    </section>
  )
}

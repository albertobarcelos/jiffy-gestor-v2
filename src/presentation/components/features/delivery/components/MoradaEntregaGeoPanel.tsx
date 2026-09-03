'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MdMyLocation, MdMap, MdCheckCircle } from 'react-icons/md'
import {
  geoCheckoutProntaParaConfirmar,
  montarGeoCheckoutInputFromState,
  type EnderecoGeoCheckoutInput,
} from '@/src/application/dto/delivery-publico/EnderecoGeoCheckoutDTO'
import { EnderecoGeolocalizacaoSection } from '@/src/presentation/components/shared/geolocalizacao/EnderecoGeolocalizacaoSection'
import { EnderecoPlacesAutocomplete } from '@/src/presentation/components/shared/geolocalizacao/EnderecoPlacesAutocomplete'
import { DeliveryCheckoutPinAjustadoDialog } from '@/src/presentation/components/features/delivery-publico/public/components/checkout/DeliveryCheckoutPinAjustadoDialog'
import { useDeliveryCheckoutPinAjustado } from '@/src/presentation/components/features/delivery-publico/shared/hooks/useDeliveryCheckoutPinAjustado'
import { Button } from '@/src/presentation/components/ui/button'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { geoJsonPointFromLatLng, parseGeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { formatarCepMascara } from '@/src/shared/utils/consultaCep'
import { obterEnderecoPorGps } from '@/src/shared/utils/geolocalizacaoEndereco'
import { serializarEnderecoParaGeocode } from '@/src/shared/utils/geolocalizacaoEnderecoShared'
import {
  placeDetailsParaEnderecoGeocode,
  type PlaceDetailsResult,
} from '@/src/shared/utils/geolocalizacaoPlaces'
import { showToast } from '@/src/shared/utils/toast'

export type MoradaEntregaGeoFormPatch = {
  rua?: string
  numero?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
}

type OrigemGeoEndereco = 'places' | 'gps' | 'manual' | 'salvo'

export type MoradaEntregaGeoInitial = {
  enderecoLocalizacao?: GeoJsonPoint | null
  preferenciaEntrega?: GeoJsonPoint | null
  providerEnderecoId?: string | null
}

type MoradaEntregaGeoPanelProps = {
  /** Incrementa ao abrir o painel para resetar estado. */
  sessionKey: string
  form: {
    rua: string
    numero: string
    bairro: string
    cidade: string
    estado: string
    cep: string
    complemento: string
  }
  onFormPatch: (patch: MoradaEntregaGeoFormPatch) => void
  /** Geo já persistida ao editar / backfill. */
  initialGeo?: MoradaEntregaGeoInitial | null
  /** Quando true, força mapa + confirmação de pin (endereço legado sem geo). */
  forcarModoManual?: boolean
  disabled?: boolean
  /** Notifica o pai se a geo está pronta para salvar e o payload atual. */
  onGeoStateChange?: (state: {
    podeSalvar: boolean
    geo: EnderecoGeoCheckoutInput | null
  }) => void
}

function upper(value: string): string {
  return value.toLocaleUpperCase('pt-BR')
}

/**
 * Captura de geolocalização no cadastro de morada do pedido delivery (gestor).
 * Regras alinhadas ao checkout público: Places/GPS ok; manual exige confirmar pin.
 */
export function MoradaEntregaGeoPanel({
  sessionKey,
  form,
  onFormPatch,
  initialGeo = null,
  forcarModoManual = false,
  disabled = false,
  onGeoStateChange,
}: MoradaEntregaGeoPanelProps) {
  const geoInicial = useMemo(() => {
    const enderecoLocalizacao = parseGeoJsonPoint(initialGeo?.enderecoLocalizacao)
    const preferenciaEntrega = parseGeoJsonPoint(initialGeo?.preferenciaEntrega)
    return {
      enderecoLocalizacao,
      preferenciaEntrega,
      providerEnderecoId: initialGeo?.providerEnderecoId?.trim() || null,
      usarPontoPreferencia: Boolean(preferenciaEntrega),
    }
  }, [initialGeo])

  const [buscaPlaces, setBuscaPlaces] = useState('')
  const [buscandoGps, setBuscandoGps] = useState(false)
  const [buscandoGeocodeMapa, setBuscandoGeocodeMapa] = useState(false)
  const [enderecoLocalizacao, setEnderecoLocalizacao] = useState<GeoJsonPoint | null>(
    geoInicial.enderecoLocalizacao
  )
  const [providerEnderecoId, setProviderEnderecoId] = useState<string | null>(
    geoInicial.providerEnderecoId
  )
  const [usarPontoPreferencia, setUsarPontoPreferencia] = useState(
    geoInicial.usarPontoPreferencia
  )
  const [preferenciaEntrega, setPreferenciaEntrega] = useState<GeoJsonPoint | null>(
    geoInicial.preferenciaEntrega
  )
  const [origemGeo, setOrigemGeo] = useState<OrigemGeoEndereco | null>(
    geoInicial.enderecoLocalizacao ? 'salvo' : forcarModoManual ? 'manual' : null
  )
  const [pinMapaConfirmado, setPinMapaConfirmado] = useState(
    Boolean(geoInicial.enderecoLocalizacao) && !forcarModoManual
  )
  const [mapaAjusteAberto, setMapaAjusteAberto] = useState(forcarModoManual)
  const [ultimoGeoKeySincronizado, setUltimoGeoKeySincronizado] = useState<string | null>(() =>
    geoInicial.enderecoLocalizacao
      ? serializarEnderecoParaGeocode({
          rua: form.rua,
          numero: form.numero,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
          cep: form.cep,
          complemento: form.complemento,
        })
      : null
  )

  // Reset ao reabrir o painel (sessionKey).
  useEffect(() => {
    const enderecoLocalizacaoInit = parseGeoJsonPoint(initialGeo?.enderecoLocalizacao)
    const preferenciaInit = parseGeoJsonPoint(initialGeo?.preferenciaEntrega)
    setBuscaPlaces([form.rua, form.numero].filter(Boolean).join(', '))
    setEnderecoLocalizacao(enderecoLocalizacaoInit)
    setProviderEnderecoId(initialGeo?.providerEnderecoId?.trim() || null)
    setPreferenciaEntrega(preferenciaInit)
    setUsarPontoPreferencia(Boolean(preferenciaInit))
    setOrigemGeo(
      enderecoLocalizacaoInit ? 'salvo' : forcarModoManual ? 'manual' : null
    )
    setPinMapaConfirmado(Boolean(enderecoLocalizacaoInit) && !forcarModoManual)
    setMapaAjusteAberto(forcarModoManual || (!enderecoLocalizacaoInit && forcarModoManual))
    setUltimoGeoKeySincronizado(
      enderecoLocalizacaoInit
        ? serializarEnderecoParaGeocode({
            rua: form.rua,
            numero: form.numero,
            bairro: form.bairro,
            cidade: form.cidade,
            estado: form.estado,
            cep: form.cep,
            complemento: form.complemento,
          })
        : null
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao mudar sessão
  }, [sessionKey, forcarModoManual])

  const enderecoGeocode = useMemo(
    () => ({
      rua: form.rua,
      numero: form.numero,
      bairro: form.bairro,
      cidade: form.cidade,
      estado: form.estado,
      cep: form.cep,
      complemento: form.complemento,
    }),
    [form.rua, form.numero, form.bairro, form.cidade, form.estado, form.cep, form.complemento]
  )
  const enderecoGeoKey = useMemo(
    () => serializarEnderecoParaGeocode(enderecoGeocode),
    [enderecoGeocode]
  )
  const geoSincronizadaComEndereco =
    Boolean(ultimoGeoKeySincronizado) && ultimoGeoKeySincronizado === enderecoGeoKey

  const exigeConfirmacaoMapa = origemGeo === 'manual' || forcarModoManual
  const mostrarMapa = exigeConfirmacaoMapa || mapaAjusteAberto

  const pinMapa = usarPontoPreferencia
    ? (preferenciaEntrega ?? enderecoLocalizacao)
    : enderecoLocalizacao

  const geoPronta = geoCheckoutProntaParaConfirmar({
    enderecoLocalizacao,
    usarPontoPreferencia,
    preferenciaEntrega,
  })

  const marcarGeoSincronizada = useCallback(
    (endereco?: typeof enderecoGeocode) => {
      setUltimoGeoKeySincronizado(serializarEnderecoParaGeocode(endereco ?? enderecoGeocode))
    },
    [enderecoGeocode]
  )

  const {
    dialogPinAberto,
    variantePin,
    handleMapChange,
    confirmarAjustePin,
    cancelarAjustePin,
    fecharDialogPin,
  } = useDeliveryCheckoutPinAjustado({
    usarPontoPreferencia,
    enderecoLocalizacao,
    preferenciaEntrega,
    providerEnderecoId,
    setEnderecoLocalizacao,
    setPreferenciaEntrega,
    setProviderEnderecoId,
    marcarGeoSincronizada,
  })

  useEffect(() => {
    fecharDialogPin()
  }, [enderecoGeoKey, fecharDialogPin])

  useEffect(() => {
    if (origemGeo === 'manual') {
      setPinMapaConfirmado(false)
    }
  }, [enderecoGeoKey, origemGeo])

  const handleConfirmarAjustePin = useCallback(() => {
    confirmarAjustePin()
    setPinMapaConfirmado(true)
  }, [confirmarAjustePin])

  const confirmarPinNoMapa = useCallback(() => {
    if (!enderecoLocalizacao) {
      showToast.error('Aguarde o mapa marcar o endereço antes de confirmar o pin.')
      return
    }
    setPinMapaConfirmado(true)
    showToast.success('Localização confirmada no mapa.')
  }, [enderecoLocalizacao])

  const aplicarPlaceDetails = useCallback(
    (place: PlaceDetailsResult) => {
      const fields = placeDetailsParaEnderecoGeocode(place)
      onFormPatch({
        ...(fields.rua ? { rua: upper(fields.rua) } : {}),
        ...(fields.numero ? { numero: fields.numero } : {}),
        ...(fields.bairro ? { bairro: upper(fields.bairro) } : {}),
        ...(fields.cidade ? { cidade: upper(fields.cidade) } : {}),
        ...(fields.estado ? { estado: fields.estado.toUpperCase().slice(0, 2) } : {}),
        ...(fields.cep ? { cep: formatarCepMascara(fields.cep) } : {}),
      })
      setEnderecoLocalizacao(place.enderecoLocalizacao)
      setProviderEnderecoId(place.providerEnderecoId)
      fecharDialogPin()
      setPreferenciaEntrega(prev =>
        usarPontoPreferencia ? (prev ?? place.enderecoLocalizacao) : null
      )
      marcarGeoSincronizada({
        rua: fields.rua ? upper(fields.rua) : form.rua,
        numero: fields.numero ?? form.numero,
        bairro: fields.bairro ? upper(fields.bairro) : form.bairro,
        cidade: fields.cidade ? upper(fields.cidade) : form.cidade,
        estado: fields.estado
          ? fields.estado.toUpperCase().slice(0, 2)
          : form.estado,
        cep: fields.cep ? formatarCepMascara(fields.cep) : form.cep,
        complemento: form.complemento,
      })
      setBuscaPlaces(
        [fields.rua, fields.numero].filter(Boolean).join(', ') ||
          place.enderecoFormatado ||
          ''
      )
      setOrigemGeo('places')
      setPinMapaConfirmado(true)
      setMapaAjusteAberto(false)
      showToast.success('Endereço aplicado a partir da sugestão do Google.')
    },
    [
      onFormPatch,
      fecharDialogPin,
      usarPontoPreferencia,
      marcarGeoSincronizada,
      form.rua,
      form.numero,
      form.bairro,
      form.cidade,
      form.estado,
      form.cep,
      form.complemento,
    ]
  )

  const usarLocalizacaoAtual = useCallback(async () => {
    setBuscandoGps(true)
    try {
      const dados = await obterEnderecoPorGps()
      const point = geoJsonPointFromLatLng(dados.latitude, dados.longitude)
      onFormPatch({
        ...(dados.rua ? { rua: upper(dados.rua) } : {}),
        ...(dados.numero ? { numero: dados.numero } : {}),
        ...(dados.bairro ? { bairro: upper(dados.bairro) } : {}),
        ...(dados.cidade ? { cidade: upper(dados.cidade) } : {}),
        ...(dados.estado ? { estado: dados.estado.toUpperCase().slice(0, 2) } : {}),
        ...(dados.cep ? { cep: formatarCepMascara(dados.cep) } : {}),
      })
      setEnderecoLocalizacao(point)
      setProviderEnderecoId(dados.providerEnderecoId ?? null)
      fecharDialogPin()
      setPreferenciaEntrega(prev => (usarPontoPreferencia ? (prev ?? point) : null))
      marcarGeoSincronizada({
        rua: dados.rua ? upper(dados.rua) : form.rua,
        numero: dados.numero ?? form.numero,
        bairro: dados.bairro ? upper(dados.bairro) : form.bairro,
        cidade: dados.cidade ? upper(dados.cidade) : form.cidade,
        estado: dados.estado ? dados.estado.toUpperCase().slice(0, 2) : form.estado,
        cep: dados.cep ? formatarCepMascara(dados.cep) : form.cep,
        complemento: form.complemento,
      })
      setBuscaPlaces([dados.rua, dados.numero].filter(Boolean).join(', ') || '')
      setOrigemGeo('gps')
      setPinMapaConfirmado(true)
      setMapaAjusteAberto(false)
      showToast.success('Localização atual aplicada. Confira o endereço.')
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Não foi possível obter a localização atual'
      )
    } finally {
      setBuscandoGps(false)
    }
  }, [
    onFormPatch,
    fecharDialogPin,
    usarPontoPreferencia,
    marcarGeoSincronizada,
    form.rua,
    form.numero,
    form.bairro,
    form.cidade,
    form.estado,
    form.cep,
    form.complemento,
  ])

  const iniciarPreenchimentoManual = useCallback(() => {
    setOrigemGeo('manual')
    setPinMapaConfirmado(false)
    setMapaAjusteAberto(true)
    setEnderecoLocalizacao(null)
    setProviderEnderecoId(null)
    setPreferenciaEntrega(null)
    setUsarPontoPreferencia(false)
    setUltimoGeoKeySincronizado(null)
    showToast.info('Preencha o endereço e confirme o pin no mapa.')
  }, [])

  const handleTogglePreferencia = useCallback(
    (checked: boolean) => {
      setUsarPontoPreferencia(checked)
      if (checked) {
        setPreferenciaEntrega(prev => prev ?? enderecoLocalizacao)
        setMapaAjusteAberto(true)
      } else {
        setPreferenciaEntrega(null)
      }
    },
    [enderecoLocalizacao]
  )

  const podeSalvar =
    geoPronta &&
    geoSincronizadaComEndereco &&
    !buscandoGeocodeMapa &&
    !dialogPinAberto &&
    (!exigeConfirmacaoMapa || pinMapaConfirmado)

  const geoPayload = useMemo(
    () =>
      montarGeoCheckoutInputFromState({
        enderecoLocalizacao,
        providerEnderecoId,
        usarPontoPreferencia,
        preferenciaEntrega,
      }),
    [enderecoLocalizacao, providerEnderecoId, usarPontoPreferencia, preferenciaEntrega]
  )

  useEffect(() => {
    onGeoStateChange?.({
      podeSalvar,
      geo: podeSalvar ? geoPayload : null,
    })
  }, [onGeoStateChange, podeSalvar, geoPayload])

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outlined"
          disabled={disabled || buscandoGps}
          onClick={() => void usarLocalizacaoAtual()}
          className="flex-1 border-primary/30 hover:bg-primary/10"
        >
          <MdMyLocation className="mr-1.5 h-4 w-4" />
          {buscandoGps ? 'Obtendo localização…' : 'Usar localização atual'}
        </Button>
        <Button
          type="button"
          variant="outlined"
          disabled={disabled}
          onClick={iniciarPreenchimentoManual}
          className="flex-1 border-gray-200 hover:bg-gray-50"
        >
          Preencher manualmente
        </Button>
      </div>

      <EnderecoPlacesAutocomplete
        variant="gestor"
        floatingLabel={false}
        label="Buscar endereço no Google"
        placeholder="Digite rua, bairro ou cidade…"
        value={buscaPlaces}
        onChange={setBuscaPlaces}
        onSelect={aplicarPlaceDetails}
        disabled={disabled}
      />

      {enderecoLocalizacao && !mostrarMapa ? (
        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
            <input
              type="checkbox"
              checked={usarPontoPreferencia}
              disabled={disabled || !enderecoLocalizacao}
              onChange={e => handleTogglePreferencia(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-primary"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-800">
                Entrega em outro ponto neste endereço
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-gray-500">
                Ex.: portaria, bloco, estacionamento. O endereço escrito permanece igual.
              </span>
            </span>
          </label>
          <Button
            type="button"
            variant="outlined"
            disabled={disabled || !enderecoLocalizacao}
            onClick={() => setMapaAjusteAberto(true)}
            className="w-full border-primary/30 hover:bg-primary/10"
          >
            <MdMap className="mr-1.5 h-4 w-4" />
            Ajustar no mapa (opcional)
          </Button>
          <p className="flex items-center gap-1.5 text-xs text-emerald-700">
            <MdCheckCircle className="h-3.5 w-3.5" />
            Localização definida
            {origemGeo === 'places'
              ? ' pelo Google'
              : origemGeo === 'gps'
                ? ' pelo GPS'
                : origemGeo === 'salvo'
                  ? ' (salva)'
                  : ''}
          </p>
        </div>
      ) : null}

      {mostrarMapa ? (
        <div className="space-y-2">
          {exigeConfirmacaoMapa ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-semibold">Confirme a localização</p>
              <p className="mt-0.5 text-xs">
                Como o endereço foi digitado manualmente (ou ainda não tem pin), confira o mapa,
                ajuste se precisar e confirme abaixo.
              </p>
            </div>
          ) : null}

          <EnderecoGeolocalizacaoSection
            variant="empresa"
            hideHeader
            hideMap={false}
            autoGeocode={!geoSincronizadaComEndereco}
            endereco={enderecoGeocode}
            localizacao={enderecoLocalizacao}
            mapValue={pinMapa}
            pinModo={usarPontoPreferencia ? 'preferencia' : 'endereco'}
            localizacaoReferencia={usarPontoPreferencia ? enderecoLocalizacao : null}
            beforeMap={
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={usarPontoPreferencia}
                  disabled={disabled || !enderecoLocalizacao}
                  onChange={e => handleTogglePreferencia(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-800">
                    Entrega em outro ponto neste endereço
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Arraste o pin azul para marcar onde o pedido será entregue.
                  </span>
                </span>
              </label>
            }
            onLocalizacaoChange={(point, meta) => {
              setEnderecoLocalizacao(point)
              setProviderEnderecoId(meta?.providerEnderecoId ?? null)
              fecharDialogPin()
              marcarGeoSincronizada()
              if (origemGeo === 'manual' || forcarModoManual) {
                setPinMapaConfirmado(false)
              }
            }}
            onMapChange={handleMapChange}
            onGeocodeBuscandoChange={setBuscandoGeocodeMapa}
            buscarLabel="Atualizar endereço no mapa"
            successToast={
              exigeConfirmacaoMapa
                ? 'Pin atualizado. Confirme se está no local correto.'
                : 'Localização atualizada. Ajuste o pin se necessário.'
            }
            disabled={disabled}
          />

          {exigeConfirmacaoMapa ? (
            <Button
              type="button"
              disabled={
                disabled ||
                !geoPronta ||
                !geoSincronizadaComEndereco ||
                buscandoGeocodeMapa ||
                dialogPinAberto ||
                pinMapaConfirmado
              }
              onClick={confirmarPinNoMapa}
              className="w-full bg-primary text-white hover:bg-primary/90"
            >
              <MdCheckCircle className="mr-1.5 h-4 w-4" />
              {pinMapaConfirmado
                ? 'Pin confirmado'
                : 'Confirmar que o pin está correto'}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outlined"
              disabled={disabled}
              onClick={() => setMapaAjusteAberto(false)}
              className="w-full border-gray-200"
            >
              Ocultar mapa
            </Button>
          )}
        </div>
      ) : null}

      {!enderecoLocalizacao && !mostrarMapa ? (
        <p className="text-xs text-amber-700">
          Busque no Google, use o GPS ou preencha manualmente e confirme o pin no mapa.
        </p>
      ) : null}

      <DeliveryCheckoutPinAjustadoDialog
        open={dialogPinAberto}
        variante={variantePin}
        onConfirmar={handleConfirmarAjustePin}
        onCancelar={cancelarAjustePin}
      />
    </div>
  )
}

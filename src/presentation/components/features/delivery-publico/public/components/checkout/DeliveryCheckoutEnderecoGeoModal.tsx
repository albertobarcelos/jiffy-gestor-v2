'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { EnderecoClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  geoCheckoutProntaParaConfirmar,
  montarGeoCheckoutInputFromState,
  type EnderecoGeoCheckoutInput,
} from '@/src/application/dto/delivery-publico/EnderecoGeoCheckoutDTO'
import { EnderecoGeolocalizacaoSection } from '@/src/presentation/components/shared/geolocalizacao/EnderecoGeolocalizacaoSection'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { parseGeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import {
  prepararEnderecoGeocodeCheckout,
  serializarEnderecoParaGeocode,
  type EnderecoGeocodeFallback,
  type EnderecoGeocodeInput,
} from '@/src/shared/utils/geolocalizacaoEnderecoShared'
import { showToast } from '@/src/shared/utils/toast'
import { formatarResumoEnderecoPublico } from '../../../shared/utils/garantirEnderecoClientePublico'
import { useDeliveryCheckoutPinAjustado } from '../../../shared/hooks/useDeliveryCheckoutPinAjustado'
import { DeliveryCheckoutFooterActions } from './DeliveryCheckoutFooterActions'
import { DeliveryCheckoutPinAjustadoDialog } from './DeliveryCheckoutPinAjustadoDialog'
import { PreferenciaEntregaToggle } from './PreferenciaEntregaToggle'
import {
  DeliveryCheckoutShellFooter,
  DeliveryCheckoutShellHeader,
} from './DeliveryCheckoutShell'

type DeliveryCheckoutEnderecoGeoModalProps = {
  endereco: EnderecoClienteDeliveryPublicoDTO
  enderecoFallback?: EnderecoGeocodeFallback
  onCancelar: () => void
  onEditar: () => void
  onConfirmar: (geo: EnderecoGeoCheckoutInput) => Promise<boolean | 'fora_cobertura' | void>
}

function montarInputGeocode(endereco: EnderecoClienteDeliveryPublicoDTO): EnderecoGeocodeInput {
  return {
    rua: endereco.rua,
    numero: endereco.numero,
    bairro: endereco.bairro,
    cidade: endereco.cidade ?? '',
    estado: endereco.estado ?? '',
    cep: endereco.cep ?? '',
    complemento: endereco.complemento ?? '',
  }
}

export function DeliveryCheckoutEnderecoGeoModal({
  endereco,
  enderecoFallback,
  onCancelar,
  onEditar,
  onConfirmar,
}: DeliveryCheckoutEnderecoGeoModalProps) {
  const [salvando, setSalvando] = useState(false)
  const [preparandoEndereco, setPreparandoEndereco] = useState(true)
  const [buscandoGeocodeMapa, setBuscandoGeocodeMapa] = useState(false)
  const [erroPosConfirmacao, setErroPosConfirmacao] = useState<string | null>(null)
  const [enderecoLocalizacao, setEnderecoLocalizacao] = useState<GeoJsonPoint | null>(() =>
    parseGeoJsonPoint(endereco.enderecoLocalizacao)
  )
  const [providerEnderecoId, setProviderEnderecoId] = useState<string | null>(
    endereco.providerEnderecoId ?? null
  )
  const [usarPontoPreferencia, setUsarPontoPreferencia] = useState(() =>
    Boolean(parseGeoJsonPoint(endereco.preferenciaEntrega))
  )
  const [preferenciaEntrega, setPreferenciaEntrega] = useState<GeoJsonPoint | null>(() =>
    parseGeoJsonPoint(endereco.preferenciaEntrega)
  )
  const [enderecoGeocode, setEnderecoGeocode] = useState<EnderecoGeocodeInput>(() =>
    montarInputGeocode(endereco)
  )
  const [resolveuViaCep, setResolveuViaCep] = useState(false)
  const [usouUfLoja, setUsouUfLoja] = useState(false)
  const [ultimoGeoKeySincronizado, setUltimoGeoKeySincronizado] = useState<string | null>(null)

  const enderecoBruto = useMemo(() => montarInputGeocode(endereco), [endereco])
  const enderecoGeoKey = useMemo(
    () => serializarEnderecoParaGeocode(enderecoGeocode),
    [enderecoGeocode]
  )
  const geoSincronizadaComEndereco =
    Boolean(ultimoGeoKeySincronizado) && ultimoGeoKeySincronizado === enderecoGeoKey

  const resumoEndereco = useMemo(
    () => formatarResumoEnderecoPublico(endereco),
    [endereco]
  )

  const pinMapa = usarPontoPreferencia
    ? (preferenciaEntrega ?? enderecoLocalizacao)
    : enderecoLocalizacao

  const geoPronta = geoCheckoutProntaParaConfirmar({
    enderecoLocalizacao,
    usarPontoPreferencia,
    preferenciaEntrega,
  })

  const marcarGeoSincronizada = useCallback(() => {
    setUltimoGeoKeySincronizado(serializarEnderecoParaGeocode(enderecoGeocode))
  }, [enderecoGeocode])

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
    setEnderecoLocalizacao(parseGeoJsonPoint(endereco.enderecoLocalizacao))
    setProviderEnderecoId(endereco.providerEnderecoId ?? null)
    setPreferenciaEntrega(parseGeoJsonPoint(endereco.preferenciaEntrega))
    setUsarPontoPreferencia(Boolean(parseGeoJsonPoint(endereco.preferenciaEntrega)))
    setUltimoGeoKeySincronizado(null)
    fecharDialogPin()
  }, [endereco.id, enderecoBruto, fecharDialogPin])

  useEffect(() => {
    fecharDialogPin()
  }, [enderecoGeoKey, fecharDialogPin])

  useEffect(() => {
    let cancelled = false
    setPreparandoEndereco(true)

    void (async () => {
      const preparado = await prepararEnderecoGeocodeCheckout(enderecoBruto, enderecoFallback)
      if (cancelled) return
      setEnderecoGeocode(preparado.endereco)
      setResolveuViaCep(preparado.resolveuViaCep)
      setUsouUfLoja(preparado.usouUfLoja)
      setPreparandoEndereco(false)
    })()

    return () => {
      cancelled = true
    }
  }, [enderecoBruto, enderecoFallback])

  const handleMapChangeComErro = (point: GeoJsonPoint) => {
    setErroPosConfirmacao(null)
    handleMapChange(point)
  }

  const handleTogglePreferencia = (checked: boolean) => {
    setUsarPontoPreferencia(checked)
    if (checked) {
      setPreferenciaEntrega(prev => prev ?? enderecoLocalizacao)
    } else {
      setPreferenciaEntrega(null)
    }
  }

  const handleConfirmar = async () => {
    if (dialogPinAberto) {
      showToast.error('Confirme ou cancele o ajuste do pin no mapa.')
      return
    }
    if (!geoPronta || !geoSincronizadaComEndereco || buscandoGeocodeMapa) {
      if (buscandoGeocodeMapa) {
        showToast.error('Aguarde a atualização do mapa.')
      } else if (!geoSincronizadaComEndereco) {
        showToast.error('Aguarde o mapa atualizar com o endereço informado.')
      } else if (usarPontoPreferencia && enderecoLocalizacao && !preferenciaEntrega) {
        showToast.error('Marque o ponto de entrega no mapa.')
      } else {
        showToast.error('Busque o endereço no mapa ou posicione o pin antes de continuar.')
      }
      return
    }

    const geo = montarGeoCheckoutInputFromState({
      enderecoLocalizacao,
      providerEnderecoId,
      usarPontoPreferencia,
      preferenciaEntrega,
    })
    if (!geo) {
      showToast.error('Busque o endereço no mapa ou posicione o pin antes de continuar.')
      return
    }

    setSalvando(true)
    setErroPosConfirmacao(null)
    try {
      const resultado = await onConfirmar(geo)
      if (resultado === 'fora_cobertura') return
      if (resultado === false) {
        setErroPosConfirmacao(
          'Não foi possível continuar com este endereço. Tente outro ponto no mapa ou edite o endereço.'
        )
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao salvar localização'
      setErroPosConfirmacao(msg)
      showToast.error(msg)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <DeliveryCheckoutShellHeader
        title="Confirme a localização"
        showBack
        onBack={onCancelar}
      />
      <DeliveryCheckoutShellFooter>
        <DeliveryCheckoutFooterActions
          onVoltar={onCancelar}
          onContinuar={() => void handleConfirmar()}
          voltarLabel="Voltar"
          continuarLabel={salvando ? 'Salvando...' : 'Confirmar localização'}
          voltarDisabled={salvando}
          continuarDisabled={
            salvando ||
            !geoPronta ||
            !geoSincronizadaComEndereco ||
            buscandoGeocodeMapa ||
            dialogPinAberto
          }
        />
      </DeliveryCheckoutShellFooter>

      <div className="space-y-2">
        <div
          className="rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: 'var(--delivery-border)',
            backgroundColor: 'var(--delivery-surface-muted)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold delivery-text-primary">Endereço selecionado</p>
              <p className="mt-1 delivery-text-secondary">{resumoEndereco}</p>
            </div>
            <button
              type="button"
              onClick={onEditar}
              disabled={salvando}
              className="shrink-0 text-sm font-semibold underline disabled:opacity-50"
              style={{ color: 'var(--delivery-primary-dark, #111)' }}
            >
              Editar
            </button>
          </div>
        </div>

        <p className="text-sm delivery-text-secondary">
          {preparandoEndereco || buscandoGeocodeMapa
            ? 'Atualizando localização no mapa…'
            : 'Arraste o pin se o local no mapa não estiver correto.'}
        </p>

        {resolveuViaCep ? (
          <p
            className="rounded-lg border px-3 py-1.5 text-xs"
            style={{
              borderColor: 'var(--delivery-border)',
              backgroundColor: 'var(--delivery-surface-muted)',
            }}
          >
            Cidade e UF completadas a partir do CEP cadastrado.
          </p>
        ) : null}

        {usouUfLoja ? (
          <p
            className="rounded-lg border px-3 py-1.5 text-xs"
            style={{
              borderColor: 'var(--delivery-border)',
              backgroundColor: 'var(--delivery-surface-muted)',
            }}
          >
            Usamos o estado da loja ({enderecoFallback?.estado}) porque o endereço não tinha UF e a
            cidade coincide com a da loja.
          </p>
        ) : null}

        {erroPosConfirmacao ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {erroPosConfirmacao}
          </p>
        ) : null}

        {!preparandoEndereco ? (
          <EnderecoGeolocalizacaoSection
            variant="delivery"
            hideHeader
            geocodeMinimo="flexivel"
            autoGeocode={!geoSincronizadaComEndereco}
            endereco={enderecoGeocode}
            localizacao={enderecoLocalizacao}
            mapValue={pinMapa}
            pinModo={usarPontoPreferencia ? 'preferencia' : 'endereco'}
            localizacaoReferencia={usarPontoPreferencia ? enderecoLocalizacao : null}
            beforeMap={
              <PreferenciaEntregaToggle
                checked={usarPontoPreferencia}
                onChange={handleTogglePreferencia}
                disabled={!enderecoLocalizacao || salvando}
              />
            }
            onLocalizacaoChange={(point, meta) => {
              setEnderecoLocalizacao(point)
              setProviderEnderecoId(meta?.providerEnderecoId ?? null)
              setErroPosConfirmacao(null)
              fecharDialogPin()
              marcarGeoSincronizada()
            }}
            onMapChange={handleMapChangeComErro}
            onGeocodeBuscandoChange={setBuscandoGeocodeMapa}
            buscarLabel="Atualizar endereço no mapa"
            successToast="Localização atualizada. Ajuste o pin se necessário."
          />
        ) : null}
      </div>

      <DeliveryCheckoutPinAjustadoDialog
        open={dialogPinAberto}
        variante={variantePin}
        onConfirmar={confirmarAjustePin}
        onCancelar={cancelarAjustePin}
      />
    </>
  )
}

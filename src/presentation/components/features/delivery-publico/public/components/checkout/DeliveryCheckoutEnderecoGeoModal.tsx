'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { EnderecoClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  aplicarPinNoMapaCheckout,
  geoCheckoutProntaParaConfirmar,
  montarGeoCheckoutInputFromState,
  type EnderecoGeoCheckoutInput,
} from '@/src/application/dto/delivery-publico/EnderecoGeoCheckoutDTO'
import { EnderecoGeolocalizacaoSection } from '@/src/presentation/components/shared/geolocalizacao/EnderecoGeolocalizacaoSection'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import {
  aplicarReverseGeocodeNoPreview,
  geocodificarEnderecoViaGoogle,
  prepararEnderecoGeocodeCheckout,
  resolverEnderecoPorCoordenadas,
  type EnderecoGeocodeFallback,
  type EnderecoGeocodeInput,
} from '@/src/shared/utils/geolocalizacaoEnderecoShared'
import { showToast } from '@/src/shared/utils/toast'
import { useDeliveryCheckoutPinAjuste } from '../../../shared/hooks/useDeliveryCheckoutPinAjuste'
import { formatarResumoEnderecoPublico } from '../../../shared/utils/garantirEnderecoClientePublico'
import { DeliveryCheckoutFooterActions } from './DeliveryCheckoutFooterActions'
import { DeliveryCheckoutPinAjusteDialog } from './DeliveryCheckoutPinAjusteDialog'
import {
  DeliveryCheckoutShellFooter,
  DeliveryCheckoutShellHeader,
} from './DeliveryCheckoutShell'

type DeliveryCheckoutEnderecoGeoModalProps = {
  endereco: EnderecoClienteDeliveryPublicoDTO
  enderecoFallback?: EnderecoGeocodeFallback
  onCancelar: () => void
  /** Abre a tela de edição de endereço (Places + formulário). */
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

function formatarResumoGeocode(e: EnderecoGeocodeInput): string {
  return [
    e.rua,
    e.numero ? `nº ${e.numero}` : '',
    e.bairro,
    [e.cidade, e.estado].filter(Boolean).join('/'),
  ]
    .filter(Boolean)
    .join(', ')
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
  const [buscandoGeoInicial, setBuscandoGeoInicial] = useState(false)
  const [buscandoReversePin, setBuscandoReversePin] = useState(false)
  const [erroGeocode, setErroGeocode] = useState<string | null>(null)
  const [erroPosConfirmacao, setErroPosConfirmacao] = useState<string | null>(null)
  const [enderecoLocalizacao, setEnderecoLocalizacao] = useState<GeoJsonPoint | null>(null)
  const [pinPosition, setPinPosition] = useState<GeoJsonPoint | null>(null)
  const [providerEnderecoId, setProviderEnderecoId] = useState<string | null>(null)
  const [enderecoGeocode, setEnderecoGeocode] = useState<EnderecoGeocodeInput>(() =>
    montarInputGeocode(endereco)
  )
  const [resolveuViaCep, setResolveuViaCep] = useState(false)
  const [usouUfLoja, setUsouUfLoja] = useState(false)
  const [textoConfirmadoComPin, setTextoConfirmadoComPin] = useState(false)
  const geocodeInicialDisparadoRef = useRef(false)
  const reverseSeqRef = useRef(0)
  const textoBaseEnderecoRef = useRef<EnderecoGeocodeInput>(montarInputGeocode(endereco))
  const snapshotAjustePinRef = useRef<EnderecoGeocodeInput>(montarInputGeocode(endereco))
  const enderecoGeocodeRef = useRef<EnderecoGeocodeInput>(montarInputGeocode(endereco))

  const {
    modoAjustePin,
    dialogEtapa,
    referenciaGeocodeRef,
    registrarReferenciaGeocode,
    notificarPinMovido,
    abrirDialogEtapa,
    escolherModoPin,
    fecharDialogPin,
    exigeEscolhaModoPin,
    pinDivergeDaReferencia,
  } = useDeliveryCheckoutPinAjuste()

  enderecoGeocodeRef.current = enderecoGeocode

  const enderecoBruto = useMemo(() => montarInputGeocode(endereco), [endereco])
  const pinFoiAjustado = pinDivergeDaReferencia(pinPosition)

  const resumoTextoBase = useMemo(
    () =>
      formatarResumoGeocode(snapshotAjustePinRef.current) ||
      formatarResumoGeocode(textoBaseEnderecoRef.current) ||
      formatarResumoEnderecoPublico(endereco),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endereco, preparandoEndereco, enderecoGeocode, dialogEtapa]
  )

  const resumoEnderecoExibicao = useMemo(() => {
    if (buscandoReversePin) return 'Identificando endereço no ponto do pin…'
    if (textoConfirmadoComPin || modoAjustePin === 'preferencia_entrega') {
      return (
        formatarResumoGeocode(textoBaseEnderecoRef.current) ||
        formatarResumoGeocode(enderecoGeocode) ||
        formatarResumoEnderecoPublico(endereco)
      )
    }
    if (modoAjustePin === 'atualizar_endereco' && !textoConfirmadoComPin) {
      const resumo = formatarResumoGeocode(enderecoGeocode)
      return resumo || formatarResumoEnderecoPublico(endereco)
    }
    return (
      formatarResumoGeocode(textoBaseEnderecoRef.current) || formatarResumoEnderecoPublico(endereco)
    )
  }, [
    buscandoReversePin,
    endereco,
    enderecoGeocode,
    modoAjustePin,
    textoConfirmadoComPin,
  ])

  const comprometerTextoBase = (valor: EnderecoGeocodeInput) => {
    const copia = { ...valor }
    textoBaseEnderecoRef.current = copia
    snapshotAjustePinRef.current = copia
  }

  useEffect(() => {
    let cancelled = false
    setPreparandoEndereco(true)

    void (async () => {
      const preparado = await prepararEnderecoGeocodeCheckout(enderecoBruto, enderecoFallback)
      if (cancelled) return
      setEnderecoGeocode(preparado.endereco)
      comprometerTextoBase(preparado.endereco)
      setResolveuViaCep(preparado.resolveuViaCep)
      setUsouUfLoja(preparado.usouUfLoja)
      setPreparandoEndereco(false)
    })()

    return () => {
      cancelled = true
    }
  }, [enderecoBruto, enderecoFallback])

  useEffect(() => {
    if (preparandoEndereco) return
    if (geocodeInicialDisparadoRef.current) return

    geocodeInicialDisparadoRef.current = true
    let cancelled = false
    setBuscandoGeoInicial(true)
    setErroGeocode(null)

    void (async () => {
      try {
        const resultado = await geocodificarEnderecoViaGoogle(enderecoGeocode, {
          minimo: 'flexivel',
        })
        if (cancelled) return
        setEnderecoLocalizacao(resultado.enderecoLocalizacao)
        setPinPosition(resultado.enderecoLocalizacao)
        setProviderEnderecoId(resultado.providerEnderecoId)
        registrarReferenciaGeocode(resultado.enderecoLocalizacao)
      } catch (error) {
        if (cancelled) return
        setErroGeocode(
          error instanceof Error
            ? error.message
            : 'Não foi possível localizar o endereço. Use "Buscar no mapa" ou posicione o pin.'
        )
      } finally {
        if (!cancelled) setBuscandoGeoInicial(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preparandoEndereco, registrarReferenciaGeocode])

  const resolverEnderecoDoPin = (point: GeoJsonPoint, abrirDialogSeDivergiu: boolean) => {
    const [lng, lat] = point.coordinates
    const seq = ++reverseSeqRef.current
    const textoNoInicio = { ...enderecoGeocodeRef.current }
    snapshotAjustePinRef.current = textoNoInicio
    setBuscandoReversePin(true)
    setTextoConfirmadoComPin(false)
    setProviderEnderecoId(null)

    void resolverEnderecoPorCoordenadas(lat, lng)
      .then(revertido => {
        if (seq !== reverseSeqRef.current) return
        const aplicado = aplicarReverseGeocodeNoPreview(textoNoInicio, revertido)

        if (aplicado.reconheceuLogradouro) {
          setEnderecoGeocode(aplicado.endereco)
          if (abrirDialogSeDivergiu) abrirDialogEtapa('ajuste_classico')
          return
        }

        setEnderecoGeocode(textoNoInicio)
        if (abrirDialogSeDivergiu) abrirDialogEtapa('confirma_endereco')
      })
      .catch(() => {
        if (seq !== reverseSeqRef.current) return
        setEnderecoGeocode(textoNoInicio)
        if (abrirDialogSeDivergiu) abrirDialogEtapa('confirma_endereco')
      })
      .finally(() => {
        if (seq === reverseSeqRef.current) setBuscandoReversePin(false)
      })
  }

  const handleMapChange = (point: GeoJsonPoint) => {
    aplicarPinNoMapaCheckout(point, setPinPosition, setEnderecoLocalizacao)
    setErroPosConfirmacao(null)
    if (!referenciaGeocodeRef.current) {
      registrarReferenciaGeocode(point)
      resolverEnderecoDoPin(point, false)
      return
    }
    notificarPinMovido(point)
    resolverEnderecoDoPin(point, pinDivergeDaReferencia(point))
  }

  const restaurarTextoDoAjuste = () => {
    const texto = { ...snapshotAjustePinRef.current }
    setEnderecoGeocode(texto)
    return texto
  }

  const handleEscolherPreferencia = () => {
    const texto = restaurarTextoDoAjuste()
    comprometerTextoBase(texto)
    setTextoConfirmadoComPin(false)
    escolherModoPin('preferencia_entrega')
  }

  const handleEscolherAtualizarEndereco = () => {
    comprometerTextoBase(enderecoGeocodeRef.current)
    setTextoConfirmadoComPin(false)
    escolherModoPin('atualizar_endereco')
  }

  const handleConfirmaEnderecoSim = () => {
    restaurarTextoDoAjuste()
    setTextoConfirmadoComPin(true)
    abrirDialogEtapa('ponto_diferente')
  }

  const handleConfirmaEnderecoNao = () => {
    fecharDialogPin()
    onEditar()
  }

  const handlePontoDiferenteNao = () => {
    const texto = restaurarTextoDoAjuste()
    comprometerTextoBase(texto)
    setTextoConfirmadoComPin(true)
    escolherModoPin('atualizar_endereco')
  }

  const handlePontoDiferenteSim = () => {
    const texto = restaurarTextoDoAjuste()
    comprometerTextoBase(texto)
    setTextoConfirmadoComPin(true)
    escolherModoPin('preferencia_entrega')
  }

  const geoPronta = geoCheckoutProntaParaConfirmar(pinPosition)

  const handleConfirmar = async () => {
    if (exigeEscolhaModoPin(pinPosition)) {
      showToast.error('Responda às perguntas sobre o ponto no mapa antes de continuar.')
      return
    }

    const geo = montarGeoCheckoutInputFromState({
      enderecoLocalizacao,
      pinPosition,
      providerEnderecoId,
      modoAjustePin,
      ...(modoAjustePin === 'atualizar_endereco'
        ? {
            enderecoRevertido: textoConfirmadoComPin
              ? textoBaseEnderecoRef.current
              : enderecoGeocode,
          }
        : {}),
    })
    if (!geo) {
      showToast.error('Busque o endereço no mapa ou posicione o pin antes de continuar.')
      return
    }

    setSalvando(true)
    setErroPosConfirmacao(null)
    try {
      const resultado = await onConfirmar(geo)
      if (resultado === 'fora_cobertura') {
        // Modal central de cobertura é exibido pelo checkout; não duplicar em vermelho.
        return
      }
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
          voltarDisabled={salvando || buscandoReversePin}
          continuarDisabled={salvando || buscandoReversePin || !geoPronta}
        />
      </DeliveryCheckoutShellFooter>

      <div className="space-y-3">
        <div
          className="rounded-xl border px-3 py-3 text-sm"
          style={{
            borderColor: 'var(--delivery-border)',
            backgroundColor: 'var(--delivery-surface-muted)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold delivery-text-primary">Endereço selecionado</p>
              <p className="mt-1 delivery-text-secondary">{resumoEnderecoExibicao}</p>
            </div>
            <button
              type="button"
              onClick={onEditar}
              disabled={salvando || buscandoReversePin}
              className="shrink-0 text-sm font-semibold underline disabled:opacity-50"
              style={{ color: 'var(--delivery-primary-dark, #111)' }}
            >
              Editar
            </button>
          </div>
          {modoAjustePin === 'preferencia_entrega' ? (
            <p className="mt-2 text-xs delivery-text-secondary">
              O endereço escrito será mantido; o pin será salvo como preferência de entrega.
            </p>
          ) : null}
          {modoAjustePin === 'atualizar_endereco' && textoConfirmadoComPin ? (
            <p className="mt-2 text-xs delivery-text-secondary">
              O texto do endereço será mantido; a localização do pin será salva neste endereço.
            </p>
          ) : null}
          {modoAjustePin === 'atualizar_endereco' && !textoConfirmadoComPin ? (
            <p className="mt-2 text-xs delivery-text-secondary">
              O endereço cadastrado será atualizado com o texto reconhecido e a localização do pin.
            </p>
          ) : null}
          {!pinFoiAjustado && (!endereco.estado?.trim() || !endereco.cep?.trim()) ? (
            <p className="mt-2 text-xs delivery-text-secondary">
              Este endereço está incompleto no cadastro
              {!endereco.cep?.trim() ? ' (sem CEP)' : ''}
              {!endereco.estado?.trim() ? ' (sem UF)' : ''}. Buscamos a localização pela cidade e
              rua — confira o pin no mapa.
            </p>
          ) : null}
        </div>

        <p className="text-sm delivery-text-secondary">
          {preparandoEndereco || buscandoGeoInicial
            ? 'Buscando localização no mapa…'
            : buscandoReversePin
              ? 'Identificando o endereço no ponto do pin…'
              : 'Confira o pin no mapa e ajuste se necessário antes de continuar.'}
        </p>

        {resolveuViaCep && !pinFoiAjustado ? (
          <p
            className="rounded-lg border px-3 py-2 text-xs"
            style={{
              borderColor: 'var(--delivery-border)',
              backgroundColor: 'var(--delivery-surface-muted)',
            }}
          >
            Cidade e UF completadas a partir do CEP cadastrado.
          </p>
        ) : null}

        {usouUfLoja && !pinFoiAjustado ? (
          <p
            className="rounded-lg border px-3 py-2 text-xs"
            style={{
              borderColor: 'var(--delivery-border)',
              backgroundColor: 'var(--delivery-surface-muted)',
            }}
          >
            Usamos o estado da loja ({enderecoFallback?.estado}) porque o endereço não tinha UF e a
            cidade coincide com a da loja.
          </p>
        ) : null}

        {erroGeocode && !geoPronta ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {erroGeocode} Você também pode clicar no mapa para posicionar o pin manualmente.
          </p>
        ) : null}

        {erroPosConfirmacao ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {erroPosConfirmacao}
          </p>
        ) : null}

        <EnderecoGeolocalizacaoSection
          variant="delivery"
          geocodeMinimo="flexivel"
          endereco={enderecoGeocode}
          localizacao={enderecoLocalizacao}
          mapValue={pinPosition}
          onLocalizacaoChange={(point, meta) => {
            setEnderecoLocalizacao(point)
            setPinPosition(point)
            setProviderEnderecoId(meta?.providerEnderecoId ?? null)
            registrarReferenciaGeocode(point)
            comprometerTextoBase(enderecoGeocodeRef.current)
            setTextoConfirmadoComPin(false)
            setErroGeocode(null)
            setErroPosConfirmacao(null)
          }}
          onMapChange={handleMapChange}
          title="Localização para entrega"
          subtitle="Arraste o pin para o ponto exato onde deseja receber o pedido."
          obrigatorio
          buscarLabel="Buscar no mapa"
          successToast="Localização encontrada. Ajuste o pin se necessário."
        />
      </div>

      <DeliveryCheckoutPinAjusteDialog
        etapa={dialogEtapa}
        resumoEndereco={resumoTextoBase}
        onEscolherPreferencia={handleEscolherPreferencia}
        onEscolherAtualizarEndereco={handleEscolherAtualizarEndereco}
        onConfirmaEnderecoSim={handleConfirmaEnderecoSim}
        onConfirmaEnderecoNao={handleConfirmaEnderecoNao}
        onPontoDiferenteSim={handlePontoDiferenteSim}
        onPontoDiferenteNao={handlePontoDiferenteNao}
        onFechar={fecharDialogPin}
      />
    </>
  )
}

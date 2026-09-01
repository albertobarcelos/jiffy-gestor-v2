'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Home, LocateFixed, MapPin, Pencil } from 'lucide-react'
import type { EnderecoGeoCheckoutInput } from '@/src/application/dto/delivery-publico/EnderecoGeoCheckoutDTO'
import {
  aplicarPinNoMapaCheckout,
  geoCheckoutProntaParaConfirmar,
  montarGeoCheckoutInputFromState,
} from '@/src/application/dto/delivery-publico/EnderecoGeoCheckoutDTO'
import { EnderecoGeolocalizacaoSection } from '@/src/presentation/components/shared/geolocalizacao/EnderecoGeolocalizacaoSection'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { geoJsonPointFromLatLng } from '@/src/shared/types/geoJsonPoint'
import {
  consultarCepViaApi,
  formatarCepMascara,
  normalizarDigitosCep,
} from '@/src/shared/utils/consultaCep'
import { obterEnderecoPorGps } from '@/src/shared/utils/geolocalizacaoEndereco'
import {
  aplicarReverseGeocodeNoPreview,
  limparLogradouroEnderecoGeocode,
  resolverEnderecoPorCoordenadas,
  type EnderecoGeocodeInput,
} from '@/src/shared/utils/geolocalizacaoEnderecoShared'
import {
  placeDetailsParaEnderecoGeocode,
  type PlaceDetailsResult,
  type PlacesBias,
} from '@/src/shared/utils/geolocalizacaoPlaces'
import { showToast } from '@/src/shared/utils/toast'
import { EnderecoPlacesAutocomplete } from '@/src/presentation/components/shared/geolocalizacao/EnderecoPlacesAutocomplete'
import { useDeliveryCheckoutPinAjuste } from '../../../shared/hooks/useDeliveryCheckoutPinAjuste'
import type { CheckoutFormData } from '../../../shared/utils/montarPedidoPublico'
import {
  maiusculasEnderecoInput,
  normalizarEnderecoGeocodeInput,
  normalizarEstadoEndereco,
} from '@/src/shared/utils/normalizarTextoEnderecoPublico'
import { DeliveryCheckoutFooterActions } from './DeliveryCheckoutFooterActions'
import { DeliveryCheckoutPinAjusteDialog } from './DeliveryCheckoutPinAjusteDialog'
import { DeliveryCheckoutUppercaseInput } from './DeliveryCheckoutUppercaseInput'
import {
  DeliveryCheckoutShellFooter,
  DeliveryCheckoutShellHeader,
} from './DeliveryCheckoutShell'

type EtapaUiEndereco = 'busca' | 'resumo' | 'edicao'

type CampoEnderecoFoco = 'rua' | 'numero' | 'bairro' | 'cidade'

type DeliveryCheckoutEnderecoFormModalProps = {
  form: CheckoutFormData
  onChange: <K extends keyof CheckoutFormData>(key: K, value: CheckoutFormData[K]) => void
  onClose: () => void
  onCancelar: () => void
  onConfirmar: (geo: EnderecoGeoCheckoutInput) => Promise<void>
  placesBias?: PlacesBias | null
}

const fieldClass =
  'w-full rounded-xl border bg-transparent px-3 py-3 text-base outline-none delivery-text-primary'
const fieldStyle = { borderColor: 'var(--delivery-border)' } as const

export function DeliveryCheckoutEnderecoFormModal({
  form,
  onChange,
  onClose: _onClose,
  onCancelar,
  onConfirmar,
  placesBias = null,
}: DeliveryCheckoutEnderecoFormModalProps) {
  const [etapaUi, setEtapaUi] = useState<EtapaUiEndereco>(() =>
    form.rua.trim() ? 'edicao' : 'busca'
  )
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [buscandoGps, setBuscandoGps] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [enderecoLocalizacao, setEnderecoLocalizacao] = useState<GeoJsonPoint | null>(null)
  const [pinPosition, setPinPosition] = useState<GeoJsonPoint | null>(null)
  const [providerEnderecoId, setProviderEnderecoId] = useState<string | null>(null)
  const [enderecoAlteradoParaGeo, setEnderecoAlteradoParaGeo] = useState(false)
  const [buscaPlaces, setBuscaPlaces] = useState(() =>
    [form.rua, form.numero].filter(Boolean).join(', ')
  )
  const [buscandoReversePin, setBuscandoReversePin] = useState(false)
  const [textoConfirmadoComPin, setTextoConfirmadoComPin] = useState(false)
  const reverseSeqRef = useRef(0)
  const formAntesDoAjustePinRef = useRef<EnderecoGeocodeInput | null>(null)
  const ruaInputRef = useRef<HTMLInputElement>(null)
  const numeroInputRef = useRef<HTMLInputElement>(null)
  const bairroInputRef = useRef<HTMLInputElement>(null)
  const cidadeInputRef = useRef<HTMLInputElement>(null)
  const focoPendenteRef = useRef<CampoEnderecoFoco | null>(null)
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
  const enderecoGeocodeRef = useRef(enderecoGeocode)
  enderecoGeocodeRef.current = enderecoGeocode

  const mostrarDetalhes = etapaUi === 'resumo' || etapaUi === 'edicao'
  const modoEdicaoCompleta = etapaUi === 'edicao'

  const focarCampo = useCallback((campo: CampoEnderecoFoco) => {
    const refMap: Record<CampoEnderecoFoco, React.RefObject<HTMLInputElement | null>> = {
      rua: ruaInputRef,
      numero: numeroInputRef,
      bairro: bairroInputRef,
      cidade: cidadeInputRef,
    }
    requestAnimationFrame(() => {
      const el = refMap[campo].current
      el?.focus()
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [])

  const solicitarFocoCampo = useCallback(
    (campo: CampoEnderecoFoco) => {
      const precisaModoEdicao = campo === 'rua' || campo === 'cidade'
      if (precisaModoEdicao && etapaUi !== 'edicao') {
        focoPendenteRef.current = campo
        setEtapaUi('edicao')
        return
      }
      focarCampo(campo)
    },
    [etapaUi, focarCampo]
  )

  useLayoutEffect(() => {
    if (!focoPendenteRef.current) return
    const campo = focoPendenteRef.current
    focoPendenteRef.current = null
    focarCampo(campo)
  }, [etapaUi, focarCampo])

  const aplicarPreviewNoForm = (preview: EnderecoGeocodeInput) => {
    const normalizado = normalizarEnderecoGeocodeInput(preview)
    onChange('rua', normalizado.rua)
    onChange('numero', normalizado.numero)
    onChange('bairro', normalizado.bairro ?? '')
    onChange('cidade', normalizado.cidade ?? '')
    onChange('estado', normalizado.estado ?? '')
    onChange('cep', normalizado.cep ? formatarCepMascara(normalizado.cep) : '')
  }

  const resolverEnderecoDoPin = (point: GeoJsonPoint, abrirDialogSeDivergiu: boolean) => {
    const [lng, lat] = point.coordinates
    const seq = ++reverseSeqRef.current
    const textoNoInicio = { ...enderecoGeocodeRef.current }
    formAntesDoAjustePinRef.current = textoNoInicio
    setBuscandoReversePin(true)
    setTextoConfirmadoComPin(false)
    setProviderEnderecoId(null)

    void resolverEnderecoPorCoordenadas(lat, lng)
      .then(revertido => {
        if (seq !== reverseSeqRef.current) return
        const aplicado = aplicarReverseGeocodeNoPreview(textoNoInicio, revertido)
        if (aplicado.reconheceuLogradouro) {
          aplicarPreviewNoForm(aplicado.endereco)
          if (abrirDialogSeDivergiu) abrirDialogEtapa('ajuste_classico')
          return
        }
        aplicarPreviewNoForm(textoNoInicio)
        if (abrirDialogSeDivergiu) abrirDialogEtapa('confirma_endereco')
      })
      .catch(() => {
        if (seq !== reverseSeqRef.current) return
        aplicarPreviewNoForm(textoNoInicio)
        if (abrirDialogSeDivergiu) abrirDialogEtapa('confirma_endereco')
      })
      .finally(() => {
        if (seq === reverseSeqRef.current) setBuscandoReversePin(false)
      })
  }

  const aplicarPlaceDetails = (place: PlaceDetailsResult) => {
    const fields = normalizarEnderecoGeocodeInput(placeDetailsParaEnderecoGeocode(place))
    if (fields.rua) onChange('rua', fields.rua)
    if (fields.numero) onChange('numero', fields.numero)
    if (fields.bairro) onChange('bairro', fields.bairro)
    if (fields.cidade) onChange('cidade', fields.cidade)
    if (fields.estado) onChange('estado', fields.estado)
    if (fields.cep) onChange('cep', fields.cep)

    setEnderecoLocalizacao(place.enderecoLocalizacao)
    setPinPosition(place.enderecoLocalizacao)
    setProviderEnderecoId(place.providerEnderecoId)
    registrarReferenciaGeocode(place.enderecoLocalizacao)
    formAntesDoAjustePinRef.current = null
    setTextoConfirmadoComPin(false)
    setEnderecoAlteradoParaGeo(false)
    setBuscaPlaces(
      maiusculasEnderecoInput(
        [fields.rua, fields.numero].filter(Boolean).join(', ') || place.enderecoFormatado || ''
      )
    )
    setEtapaUi('resumo')
    showToast.success('Endereço encontrado. Confira o número e o pin no mapa.')
  }

  const limparCamposAposBuscaPlaces = () => {
    onChange('cep', '')
    onChange('rua', '')
    onChange('numero', '')
    onChange('bairro', '')
    onChange('cidade', '')
    onChange('estado', '')
    onChange('complemento', '')
    onChange('pontoReferencia', '')
    formAntesDoAjustePinRef.current = null
    setTextoConfirmadoComPin(false)
    marcarEnderecoAlterado()
    setEtapaUi('busca')
  }

  const marcarEnderecoAlterado = () => {
    setEnderecoAlteradoParaGeo(true)
    setEnderecoLocalizacao(null)
    setPinPosition(null)
    setProviderEnderecoId(null)
    registrarReferenciaGeocode(null)
  }

  const buscarCep = async () => {
    const digitos = normalizarDigitosCep(form.cep)
    if (digitos.length !== 8) {
      showToast.error('Informe um CEP com 8 dígitos')
      return
    }
    setBuscandoCep(true)
    try {
      const dados = await consultarCepViaApi(digitos)
      onChange('cep', formatarCepMascara(dados.cep))
      if (dados.logradouro) onChange('rua', maiusculasEnderecoInput(dados.logradouro))
      if (dados.bairro) onChange('bairro', maiusculasEnderecoInput(dados.bairro))
      if (dados.localidade) onChange('cidade', maiusculasEnderecoInput(dados.localidade))
      if (dados.uf) onChange('estado', normalizarEstadoEndereco(dados.uf))
      if (dados.complemento && !form.complemento.trim()) {
        onChange('complemento', maiusculasEnderecoInput(dados.complemento))
      }
      marcarEnderecoAlterado()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao consultar CEP')
    } finally {
      setBuscandoCep(false)
    }
  }

  const usarLocalizacaoAtual = async () => {
    setBuscandoGps(true)
    try {
      const dados = await obterEnderecoPorGps()
      const enderecoGps = normalizarEnderecoGeocodeInput({
        rua: dados.rua ?? '',
        numero: dados.numero ?? '',
        bairro: dados.bairro ?? '',
        cidade: dados.cidade ?? '',
        estado: dados.estado ?? '',
        cep: dados.cep ?? '',
        complemento: '',
      })
      if (dados.cep) onChange('cep', dados.cep)
      if (enderecoGps.rua) onChange('rua', enderecoGps.rua)
      if (enderecoGps.numero) onChange('numero', enderecoGps.numero)
      if (enderecoGps.bairro) onChange('bairro', enderecoGps.bairro)
      if (enderecoGps.cidade) onChange('cidade', enderecoGps.cidade)
      if (enderecoGps.estado) onChange('estado', enderecoGps.estado)

      const point = geoJsonPointFromLatLng(dados.latitude, dados.longitude)
      setEnderecoLocalizacao(point)
      setPinPosition(point)
      setProviderEnderecoId(dados.providerEnderecoId ?? null)
      registrarReferenciaGeocode(point)
      formAntesDoAjustePinRef.current = null
      setTextoConfirmadoComPin(false)
      setEnderecoAlteradoParaGeo(false)
      setBuscaPlaces(
        maiusculasEnderecoInput(
          [enderecoGps.rua, enderecoGps.numero].filter(Boolean).join(', ') || enderecoGps.rua || ''
        )
      )
      setEtapaUi('resumo')

      showToast.success('Localização aplicada. Confira o número, o complemento e o pin no mapa.')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao obter localização')
    } finally {
      setBuscandoGps(false)
    }
  }

  const handleMapChange = (point: GeoJsonPoint) => {
    aplicarPinNoMapaCheckout(point, setPinPosition, setEnderecoLocalizacao)
    if (!referenciaGeocodeRef.current) {
      registrarReferenciaGeocode(point)
      resolverEnderecoDoPin(point, false)
      return
    }
    const divergiu = pinDivergeDaReferencia(point)
    notificarPinMovido(point)
    resolverEnderecoDoPin(point, divergiu)
  }

  const restaurarTextoDoAjuste = () => {
    if (formAntesDoAjustePinRef.current) {
      aplicarPreviewNoForm(formAntesDoAjustePinRef.current)
    }
  }

  const handleEscolherPreferencia = () => {
    restaurarTextoDoAjuste()
    setTextoConfirmadoComPin(false)
    escolherModoPin('preferencia_entrega')
  }

  const handleEscolherAtualizarEndereco = () => {
    formAntesDoAjustePinRef.current = { ...enderecoGeocodeRef.current }
    setTextoConfirmadoComPin(false)
    escolherModoPin('atualizar_endereco')
  }

  const handleConfirmaEnderecoSim = () => {
    restaurarTextoDoAjuste()
    setTextoConfirmadoComPin(true)
    abrirDialogEtapa('ponto_diferente')
  }

  const handleConfirmaEnderecoNao = () => {
    const base = formAntesDoAjustePinRef.current ?? enderecoGeocodeRef.current
    aplicarPreviewNoForm(limparLogradouroEnderecoGeocode(base, true))
    setTextoConfirmadoComPin(false)
    escolherModoPin('atualizar_endereco')
    setEtapaUi('edicao')
  }

  const handlePontoDiferenteNao = () => {
    restaurarTextoDoAjuste()
    setTextoConfirmadoComPin(true)
    escolherModoPin('atualizar_endereco')
  }

  const handlePontoDiferenteSim = () => {
    restaurarTextoDoAjuste()
    setTextoConfirmadoComPin(true)
    escolherModoPin('preferencia_entrega')
  }

  const handleConfirmar = async () => {
    if (!form.rua.trim()) {
      showToast.error('Informe a rua')
      solicitarFocoCampo('rua')
      return
    }
    if (!form.numero.trim()) {
      showToast.error('Informe o número')
      solicitarFocoCampo('numero')
      return
    }
    if (!form.bairro.trim()) {
      showToast.error('Informe o bairro')
      solicitarFocoCampo('bairro')
      return
    }
    if (!form.cidade.trim()) {
      showToast.error('Informe a cidade')
      solicitarFocoCampo('cidade')
      return
    }
    if (!geoCheckoutProntaParaConfirmar(pinPosition)) {
      showToast.error('Busque o endereço no mapa e confirme a localização antes de continuar.')
      return
    }

    if (exigeEscolhaModoPin(pinPosition)) {
      showToast.error('Responda às perguntas sobre o ponto no mapa antes de continuar.')
      return
    }

    const enderecoAtual = normalizarEnderecoGeocodeInput({
      rua: form.rua,
      numero: form.numero,
      bairro: form.bairro,
      cidade: form.cidade,
      estado: form.estado,
      cep: form.cep,
      complemento: form.complemento,
    })

    const geo = montarGeoCheckoutInputFromState({
      enderecoLocalizacao,
      pinPosition,
      providerEnderecoId,
      modoAjustePin,
      ...(modoAjustePin === 'atualizar_endereco'
        ? {
            enderecoRevertido: textoConfirmadoComPin
              ? normalizarEnderecoGeocodeInput(
                  formAntesDoAjustePinRef.current ?? enderecoAtual
                )
              : enderecoAtual,
          }
        : {}),
    })
    if (!geo) {
      showToast.error('Busque o endereço no mapa e confirme a localização antes de continuar.')
      return
    }

    setSalvando(true)
    try {
      await onConfirmar(geo)
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar endereço')
    } finally {
      setSalvando(false)
    }
  }

  const linhaCardSecundaria = [form.bairro, form.cidade, form.estado].filter(Boolean).join(' - ')

  return (
    <>
      <DeliveryCheckoutShellHeader
        title="Confirme seu endereço"
        showBack
        onBack={onCancelar}
      />
      <DeliveryCheckoutShellFooter>
        <DeliveryCheckoutFooterActions
          onVoltar={onCancelar}
          onContinuar={() => void handleConfirmar()}
          voltarLabel="Cancelar"
          continuarLabel={salvando ? 'Salvando...' : 'Confirmar'}
          voltarDisabled={salvando || buscandoReversePin}
          continuarDisabled={
            salvando ||
            buscandoReversePin ||
            etapaUi === 'busca' ||
            !geoCheckoutProntaParaConfirmar(pinPosition)
          }
        />
      </DeliveryCheckoutShellFooter>

      <div className="space-y-3">
        <button
          type="button"
          disabled={buscandoGps}
          onClick={() => void usarLocalizacaoAtual()}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold delivery-text-primary disabled:opacity-60"
          style={{ borderColor: 'var(--delivery-border)' }}
        >
          <LocateFixed className="h-4 w-4" aria-hidden />
          {buscandoGps ? 'Obtendo localização...' : 'Usar localização atual'}
        </button>

        <EnderecoPlacesAutocomplete
          variant="delivery"
          label="Buscar endereço"
          placeholder="Digite rua, bairro, cidade ou CEP…"
          value={buscaPlaces}
          onChange={setBuscaPlaces}
          onSelect={aplicarPlaceDetails}
          onClear={limparCamposAposBuscaPlaces}
          bias={placesBias}
          disabled={salvando}
        />

        {etapaUi === 'resumo' && form.rua.trim() ? (
          <div
            className="rounded-xl border p-3"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
              >
                <MapPin
                  className="h-5 w-5"
                  style={{ color: 'var(--delivery-text-muted)' }}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs delivery-text-secondary">Endereço encontrado</p>
                <p className="text-sm font-semibold delivery-text-primary">
                  {form.rua}
                  {form.numero.trim() ? `, ${form.numero}` : ''}
                </p>
                {linhaCardSecundaria ? (
                  <p className="mt-0.5 text-xs delivery-text-secondary">{linhaCardSecundaria}</p>
                ) : form.cidade.trim() ? (
                  <p className="mt-0.5 text-xs delivery-text-secondary">
                    {[form.cidade, form.estado].filter(Boolean).join(' - ')}
                  </p>
                ) : null}
                {!form.bairro.trim() ? (
                  <p className="mt-1 text-xs font-medium" style={{ color: 'var(--delivery-primary)' }}>
                    Informe o bairro abaixo (o Google não retornou)
                  </p>
                ) : null}
                {form.cep.trim() ? (
                  <p className="mt-0.5 text-xs delivery-text-secondary">CEP {form.cep}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setEtapaUi('edicao')}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold"
                style={{ color: 'var(--delivery-primary)' }}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Editar
              </button>
            </div>
          </div>
        ) : null}

        {modoEdicaoCompleta ? (
          <>
            <label className="relative block">
              <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
                CEP
              </span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={9}
                placeholder="00000-000"
                value={form.cep}
                disabled={buscandoCep}
                onChange={e => {
                  onChange('cep', formatarCepMascara(e.target.value))
                  marcarEnderecoAlterado()
                }}
                onBlur={() => {
                  if (normalizarDigitosCep(form.cep).length === 8) void buscarCep()
                }}
                className={fieldClass}
                style={fieldStyle}
              />
            </label>

            <label className="relative block">
              <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
                Cidade
              </span>
              <div className="relative">
                <DeliveryCheckoutUppercaseInput
                  ref={cidadeInputRef}
                  value={
                    form.cidade && form.estado
                      ? `${form.cidade} - ${form.estado}`
                      : form.cidade
                  }
                  onValueChange={raw => {
                    const parts = raw.split('-').map(p => p.trim())
                    marcarEnderecoAlterado()
                    if (parts.length >= 2 && parts[parts.length - 1].length <= 2) {
                      onChange('estado', normalizarEstadoEndereco(parts.pop()!))
                      onChange('cidade', maiusculasEnderecoInput(parts.join(' - ')))
                    } else {
                      onChange('cidade', maiusculasEnderecoInput(raw))
                    }
                  }}
                  className={`${fieldClass} pr-9`}
                  style={fieldStyle}
                  placeholder="Cidade - UF"
                />
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40"
                  aria-hidden
                />
              </div>
            </label>

            <label className="relative block">
              <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
                Rua/Av.
              </span>
              <DeliveryCheckoutUppercaseInput
                ref={ruaInputRef}
                value={form.rua}
                onValueChange={valor => {
                  onChange('rua', valor)
                  marcarEnderecoAlterado()
                }}
                className={fieldClass}
                style={fieldStyle}
              />
            </label>
          </>
        ) : null}

        {mostrarDetalhes ? (
          <>
            <div className="flex gap-2">
              <label className="relative w-[38%] shrink-0">
                <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
                  Número
                </span>
                <DeliveryCheckoutUppercaseInput
                  ref={numeroInputRef}
                  value={form.numero}
                  onValueChange={valor => {
                    onChange('numero', valor)
                    marcarEnderecoAlterado()
                  }}
                  className={fieldClass}
                  style={fieldStyle}
                />
              </label>
              <label className="relative min-w-0 flex-1">
                <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
                  Bairro
                </span>
                <DeliveryCheckoutUppercaseInput
                  ref={bairroInputRef}
                  value={form.bairro}
                  onValueChange={valor => {
                    onChange('bairro', valor)
                    marcarEnderecoAlterado()
                  }}
                  placeholder="Informe o bairro"
                  className={fieldClass}
                  style={fieldStyle}
                />
              </label>
            </div>

            <label className="relative block">
              <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
                Complemento
              </span>
              <DeliveryCheckoutUppercaseInput
                value={form.complemento}
                onValueChange={valor => onChange('complemento', valor)}
                className={fieldClass}
                style={fieldStyle}
              />
            </label>

            <label className="relative block">
              <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
                Ponto de referência
              </span>
              <DeliveryCheckoutUppercaseInput
                value={form.pontoReferencia}
                onValueChange={valor => onChange('pontoReferencia', valor)}
                className={fieldClass}
                style={fieldStyle}
              />
            </label>

            <div>
              <p className="mb-2 text-sm font-semibold delivery-text-primary">
                Salvar endereço como:
              </p>
              <div
                className="flex items-center gap-2 rounded-xl border px-3 py-2.5"
                style={{ borderColor: 'var(--delivery-border)' }}
              >
                <Home className="h-4 w-4 shrink-0" style={{ color: 'var(--delivery-text-muted)' }} />
                <select
                  value={form.etiquetaEndereco}
                  onChange={e => {
                    const etiqueta = e.target.value as CheckoutFormData['etiquetaEndereco']
                    onChange('etiquetaEndereco', etiqueta)
                    const labels = { casa: 'Casa', trabalho: 'Trabalho', outro: 'Outro' } as const
                    onChange('apelidoEndereco', labels[etiqueta])
                  }}
                  className="min-w-0 flex-1 bg-transparent text-base outline-none delivery-text-primary"
                >
                  <option value="casa">Casa</option>
                  <option value="trabalho">Trabalho</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            <EnderecoGeolocalizacaoSection
              variant="delivery"
              endereco={enderecoGeocode}
              localizacao={enderecoLocalizacao}
              mapValue={pinPosition}
              onLocalizacaoChange={(point, meta) => {
                setEnderecoLocalizacao(point)
                setPinPosition(point)
                setProviderEnderecoId(meta?.providerEnderecoId ?? null)
                registrarReferenciaGeocode(point)
                formAntesDoAjustePinRef.current = null
                setTextoConfirmadoComPin(false)
                setEnderecoAlteradoParaGeo(false)
              }}
              onMapChange={handleMapChange}
              enderecoAlterado={enderecoAlteradoParaGeo}
              title="Localização para entrega"
              subtitle="Obrigatória para calcular a taxa de entrega."
              obrigatorio
              buscarLabel="Buscar no mapa"
              successToast="Localização encontrada. Ajuste o pin se necessário."
            />
          </>
        ) : null}
      </div>

      <DeliveryCheckoutPinAjusteDialog
        etapa={dialogEtapa}
        resumoEndereco={[
          formAntesDoAjustePinRef.current?.rua ?? form.rua,
          (formAntesDoAjustePinRef.current?.numero ?? form.numero)
            ? `nº ${formAntesDoAjustePinRef.current?.numero ?? form.numero}`
            : '',
          formAntesDoAjustePinRef.current?.bairro ?? form.bairro,
          [
            formAntesDoAjustePinRef.current?.cidade ?? form.cidade,
            formAntesDoAjustePinRef.current?.estado ?? form.estado,
          ]
            .filter(Boolean)
            .join('/'),
        ]
          .filter(Boolean)
          .join(', ')}
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

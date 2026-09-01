'use client'

import { useMemo, useRef, useState } from 'react'
import { ChevronDown, Home, LocateFixed } from 'lucide-react'
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
import { DeliveryCheckoutFooterActions } from './DeliveryCheckoutFooterActions'
import { DeliveryCheckoutPinAjusteDialog } from './DeliveryCheckoutPinAjusteDialog'
import {
  DeliveryCheckoutShellFooter,
  DeliveryCheckoutShellHeader,
} from './DeliveryCheckoutShell'

type DeliveryCheckoutEnderecoFormModalProps = {
  form: CheckoutFormData
  onChange: <K extends keyof CheckoutFormData>(key: K, value: CheckoutFormData[K]) => void
  onClose: () => void
  onCancelar: () => void
  onConfirmar: (geo: EnderecoGeoCheckoutInput) => Promise<void>
  placesBias?: PlacesBias | null
}

export function DeliveryCheckoutEnderecoFormModal({
  form,
  onChange,
  onClose: _onClose,
  onCancelar,
  onConfirmar,
  placesBias = null,
}: DeliveryCheckoutEnderecoFormModalProps) {
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [buscandoGps, setBuscandoGps] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [enderecoLocalizacao, setEnderecoLocalizacao] = useState<GeoJsonPoint | null>(null)
  const [pinPosition, setPinPosition] = useState<GeoJsonPoint | null>(null)
  const [providerEnderecoId, setProviderEnderecoId] = useState<string | null>(null)
  const [enderecoAlteradoParaGeo, setEnderecoAlteradoParaGeo] = useState(false)
  const [buscaPlaces, setBuscaPlaces] = useState('')
  const [buscandoReversePin, setBuscandoReversePin] = useState(false)
  const [textoConfirmadoComPin, setTextoConfirmadoComPin] = useState(false)
  const reverseSeqRef = useRef(0)
  const formAntesDoAjustePinRef = useRef<EnderecoGeocodeInput | null>(null)
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

  const aplicarPreviewNoForm = (preview: EnderecoGeocodeInput) => {
    onChange('rua', preview.rua)
    onChange('numero', preview.numero)
    onChange('bairro', preview.bairro ?? '')
    onChange('cidade', preview.cidade ?? '')
    onChange('estado', preview.estado ?? '')
    onChange('cep', preview.cep ? formatarCepMascara(preview.cep) : '')
  }

  const resolverEnderecoDoPin = (point: GeoJsonPoint, abrirDialogSeDivergiu: boolean) => {
    const [lng, lat] = point.coordinates
    const seq = ++reverseSeqRef.current
    // Sempre o texto atual do form no início do ajuste (não o primeiro endereço da sessão).
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
    const fields = placeDetailsParaEnderecoGeocode(place)
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
      [fields.rua, fields.numero].filter(Boolean).join(', ') || place.enderecoFormatado || ''
    )
    showToast.success('Endereço aplicado. Confira o número e o pin no mapa.')
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
      if (dados.logradouro) onChange('rua', dados.logradouro)
      if (dados.bairro) onChange('bairro', dados.bairro)
      if (dados.localidade) onChange('cidade', dados.localidade)
      if (dados.uf) onChange('estado', dados.uf)
      if (dados.complemento && !form.complemento.trim()) {
        onChange('complemento', dados.complemento)
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
      if (dados.cep) onChange('cep', dados.cep)
      if (dados.rua) onChange('rua', dados.rua)
      if (dados.numero) onChange('numero', dados.numero)
      if (dados.bairro) onChange('bairro', dados.bairro)
      if (dados.cidade) onChange('cidade', dados.cidade)
      if (dados.estado) onChange('estado', dados.estado)

      const point = geoJsonPointFromLatLng(dados.latitude, dados.longitude)
      setEnderecoLocalizacao(point)
      setPinPosition(point)
      setProviderEnderecoId(dados.providerEnderecoId ?? null)
      registrarReferenciaGeocode(point)
      formAntesDoAjustePinRef.current = null
      setTextoConfirmadoComPin(false)
      setEnderecoAlteradoParaGeo(false)

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
    // Mantém o texto atual (reverse/digitado) e passa a ser a base do próximo ajuste.
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
    if (!form.rua.trim() || !form.numero.trim() || !form.bairro.trim()) {
      showToast.error('Preencha rua, número e bairro')
      return
    }
    if (!form.cidade.trim()) {
      showToast.error('Informe a cidade')
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

    const geo = montarGeoCheckoutInputFromState({
      enderecoLocalizacao,
      pinPosition,
      providerEnderecoId,
      modoAjustePin,
      ...(modoAjustePin === 'atualizar_endereco'
        ? {
            enderecoRevertido: textoConfirmadoComPin
              ? (formAntesDoAjustePinRef.current ?? {
                  rua: form.rua,
                  numero: form.numero,
                  bairro: form.bairro,
                  cidade: form.cidade,
                  estado: form.estado,
                  cep: form.cep,
                  complemento: form.complemento,
                })
              : {
                  rua: form.rua,
                  numero: form.numero,
                  bairro: form.bairro,
                  cidade: form.cidade,
                  estado: form.estado,
                  cep: form.cep,
                  complemento: form.complemento,
                },
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

  const fieldClass =
    'w-full rounded-xl border bg-transparent px-3 py-3 text-base outline-none delivery-text-primary'
  const fieldStyle = { borderColor: 'var(--delivery-border)' } as const

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
            salvando || buscandoReversePin || !geoCheckoutProntaParaConfirmar(pinPosition)
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
          placeholder="Digite rua, bairro ou cidade…"
          value={buscaPlaces}
          onChange={setBuscaPlaces}
          onSelect={aplicarPlaceDetails}
          onClear={limparCamposAposBuscaPlaces}
          bias={placesBias}
          disabled={salvando}
        />

        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
              CEP
            </span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={9}
              placeholder="00000-000"
              value={form.cep}
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
          <button
            type="button"
            disabled={buscandoCep || normalizarDigitosCep(form.cep).length !== 8}
            onClick={() => void buscarCep()}
            className="shrink-0 self-stretch rounded-xl border px-3 text-xs font-semibold uppercase disabled:opacity-50"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            {buscandoCep ? '...' : 'Buscar'}
          </button>
        </div>

        <label className="relative block">
          <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
            Cidade
          </span>
          <div className="relative">
            <input
              type="text"
              value={
                form.cidade && form.estado
                  ? `${form.cidade} - ${form.estado}`
                  : form.cidade
              }
              onChange={e => {
                const raw = e.target.value
                const parts = raw.split('-').map(p => p.trim())
                marcarEnderecoAlterado()
                if (parts.length >= 2 && parts[parts.length - 1].length <= 2) {
                  onChange('estado', parts.pop()!.toUpperCase())
                  onChange('cidade', parts.join(' - '))
                } else {
                  onChange('cidade', raw)
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
          <input
            type="text"
            value={form.rua}
            onChange={e => {
              onChange('rua', e.target.value)
              marcarEnderecoAlterado()
            }}
            className={fieldClass}
            style={fieldStyle}
          />
        </label>

        <label className="relative block">
          <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
            Bairro
          </span>
          <input
            type="text"
            value={form.bairro}
            onChange={e => {
              onChange('bairro', e.target.value)
              marcarEnderecoAlterado()
            }}
            placeholder="Selecione seu bairro"
            className={fieldClass}
            style={fieldStyle}
          />
        </label>

        <div className="flex gap-2">
          <label className="relative w-[38%] shrink-0">
            <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
              Número
            </span>
            <input
              type="text"
              value={form.numero}
              onChange={e => {
                onChange('numero', e.target.value)
                marcarEnderecoAlterado()
              }}
              className={fieldClass}
              style={fieldStyle}
            />
          </label>
          <label className="relative min-w-0 flex-1">
            <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
              Complemento
            </span>
            <input
              type="text"
              value={form.complemento}
              onChange={e => onChange('complemento', e.target.value)}
              className={fieldClass}
              style={fieldStyle}
            />
          </label>
        </div>

        <label className="relative block">
          <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
            Ponto de referência
          </span>
          <input
            type="text"
            value={form.pontoReferencia}
            onChange={e => onChange('pontoReferencia', e.target.value)}
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

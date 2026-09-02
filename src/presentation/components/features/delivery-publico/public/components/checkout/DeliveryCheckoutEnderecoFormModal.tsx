'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Home, LocateFixed, MapPin, Pencil, PenLine } from 'lucide-react'
import type { EnderecoGeoCheckoutInput } from '@/src/application/dto/delivery-publico/EnderecoGeoCheckoutDTO'
import {
  geoCheckoutProntaParaConfirmar,
  montarGeoCheckoutInputFromState,
} from '@/src/application/dto/delivery-publico/EnderecoGeoCheckoutDTO'
import type { EnderecoClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { EnderecoGeolocalizacaoSection } from '@/src/presentation/components/shared/geolocalizacao/EnderecoGeolocalizacaoSection'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { geoJsonPointFromLatLng, parseGeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import {
  consultarCepViaApi,
  formatarCepMascara,
  normalizarDigitosCep,
} from '@/src/shared/utils/consultaCep'
import { obterEnderecoPorGps } from '@/src/shared/utils/geolocalizacaoEndereco'
import { serializarEnderecoParaGeocode } from '@/src/shared/utils/geolocalizacaoEnderecoShared'
import {
  placeDetailsParaEnderecoGeocode,
  type PlaceDetailsResult,
  type PlacesBias,
} from '@/src/shared/utils/geolocalizacaoPlaces'
import { showToast } from '@/src/shared/utils/toast'
import { EnderecoPlacesAutocomplete } from '@/src/presentation/components/shared/geolocalizacao/EnderecoPlacesAutocomplete'
import type { CheckoutFormData } from '../../../shared/utils/montarPedidoPublico'
import { useDeliveryCheckoutPinAjustado } from '../../../shared/hooks/useDeliveryCheckoutPinAjustado'
import {
  maiusculasEnderecoInput,
  normalizarEnderecoGeocodeInput,
  normalizarEstadoEndereco,
} from '@/src/shared/utils/normalizarTextoEnderecoPublico'
import { DeliveryCheckoutFooterActions } from './DeliveryCheckoutFooterActions'
import { DeliveryCheckoutPinAjustadoDialog } from './DeliveryCheckoutPinAjustadoDialog'
import { PreferenciaEntregaToggle } from './PreferenciaEntregaToggle'
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
  /** Ao editar endereço existente, hidrata o pin com as coordenadas já salvas. */
  enderecoSalvo?: EnderecoClienteDeliveryPublicoDTO | null
}

function geoInicialDoEnderecoSalvo(endereco: EnderecoClienteDeliveryPublicoDTO | null | undefined) {
  const enderecoLocalizacao = parseGeoJsonPoint(endereco?.enderecoLocalizacao)
  const preferenciaEntrega = parseGeoJsonPoint(endereco?.preferenciaEntrega)
  return {
    enderecoLocalizacao,
    preferenciaEntrega,
    providerEnderecoId: endereco?.providerEnderecoId?.trim() || null,
    usarPontoPreferencia: Boolean(preferenciaEntrega),
  }
}

function geoKeyDoForm(form: CheckoutFormData): string {
  return serializarEnderecoParaGeocode({
    rua: form.rua,
    numero: form.numero,
    bairro: form.bairro,
    cidade: form.cidade,
    estado: form.estado,
    cep: form.cep,
    complemento: form.complemento,
  })
}

const fieldClass =
  'w-full rounded-xl border bg-transparent px-3 py-2 text-base outline-none delivery-text-primary'
const fieldStyle = { borderColor: 'var(--delivery-border)' } as const

export function DeliveryCheckoutEnderecoFormModal({
  form,
  onChange,
  onClose: _onClose,
  onCancelar,
  onConfirmar,
  placesBias = null,
  enderecoSalvo = null,
}: DeliveryCheckoutEnderecoFormModalProps) {
  const [etapaUi, setEtapaUi] = useState<EtapaUiEndereco>(() =>
    form.rua.trim() ? 'edicao' : 'busca'
  )
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [buscandoGps, setBuscandoGps] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [enderecoLocalizacao, setEnderecoLocalizacao] = useState<GeoJsonPoint | null>(() =>
    geoInicialDoEnderecoSalvo(enderecoSalvo).enderecoLocalizacao
  )
  const [providerEnderecoId, setProviderEnderecoId] = useState<string | null>(
    () => geoInicialDoEnderecoSalvo(enderecoSalvo).providerEnderecoId
  )
  const [usarPontoPreferencia, setUsarPontoPreferencia] = useState(
    () => geoInicialDoEnderecoSalvo(enderecoSalvo).usarPontoPreferencia
  )
  const [preferenciaEntrega, setPreferenciaEntrega] = useState<GeoJsonPoint | null>(() =>
    geoInicialDoEnderecoSalvo(enderecoSalvo).preferenciaEntrega
  )
  const [buscandoGeocodeMapa, setBuscandoGeocodeMapa] = useState(false)
  const [ultimoGeoKeySincronizado, setUltimoGeoKeySincronizado] = useState<string | null>(() => {
    const geo = geoInicialDoEnderecoSalvo(enderecoSalvo)
    return geo.enderecoLocalizacao ? geoKeyDoForm(form) : null
  })
  const [buscaPlaces, setBuscaPlaces] = useState(() =>
    [form.rua, form.numero].filter(Boolean).join(', ')
  )
  const ruaInputRef = useRef<HTMLInputElement>(null)
  const numeroInputRef = useRef<HTMLInputElement>(null)
  const bairroInputRef = useRef<HTMLInputElement>(null)
  const cidadeInputRef = useRef<HTMLInputElement>(null)
  const focoPendenteRef = useRef<CampoEnderecoFoco | null>(null)

  const pinMapa = usarPontoPreferencia
    ? (preferenciaEntrega ?? enderecoLocalizacao)
    : enderecoLocalizacao

  const geoPronta = geoCheckoutProntaParaConfirmar({
    enderecoLocalizacao,
    usarPontoPreferencia,
    preferenciaEntrega,
  })

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
  const enderecoGeoKey = useMemo(() => serializarEnderecoParaGeocode(enderecoGeocode), [enderecoGeocode])
  const geoSincronizadaComEndereco =
    Boolean(ultimoGeoKeySincronizado) && ultimoGeoKeySincronizado === enderecoGeoKey
  const mostrarDetalhes = etapaUi === 'resumo' || etapaUi === 'edicao'
  const modoEdicaoCompleta = etapaUi === 'edicao'

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

  const aplicarGeoEncontrada = (point: GeoJsonPoint, providerId?: string | null) => {
    setEnderecoLocalizacao(point)
    setProviderEnderecoId(providerId ?? null)
    fecharDialogPin()
    marcarGeoSincronizada()
    if (usarPontoPreferencia) {
      setPreferenciaEntrega(prev => prev ?? point)
    }
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
    setProviderEnderecoId(place.providerEnderecoId)
    fecharDialogPin()
    setPreferenciaEntrega(prev =>
      usarPontoPreferencia ? (prev ?? place.enderecoLocalizacao) : null
    )
    marcarGeoSincronizada({
      rua: fields.rua ?? form.rua,
      numero: fields.numero ?? form.numero,
      bairro: fields.bairro ?? form.bairro,
      cidade: fields.cidade ?? form.cidade,
      estado: fields.estado ?? form.estado,
      cep: fields.cep ?? form.cep,
      complemento: form.complemento,
    })
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
    setPreferenciaEntrega(null)
    setUsarPontoPreferencia(false)
    setEnderecoLocalizacao(null)
    setProviderEnderecoId(null)
    setUltimoGeoKeySincronizado(null)
    setEtapaUi('busca')
  }

  const iniciarPreenchimentoManual = () => {
    const textoBusca = buscaPlaces.trim()
    if (textoBusca) {
      const digitosCep = normalizarDigitosCep(textoBusca)
      if (digitosCep.length === 8 && !form.cep.trim()) {
        onChange('cep', formatarCepMascara(digitosCep))
      } else if (!form.rua.trim()) {
        onChange('rua', maiusculasEnderecoInput(textoBusca))
      }
    }
    setEtapaUi('edicao')
    focoPendenteRef.current = form.rua.trim() ? 'numero' : 'rua'
  }

  const handleTogglePreferencia = (checked: boolean) => {
    setUsarPontoPreferencia(checked)
    if (checked) {
      setPreferenciaEntrega(prev => prev ?? enderecoLocalizacao)
    } else {
      setPreferenciaEntrega(null)
    }
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
      aplicarGeoEncontrada(point, dados.providerEnderecoId ?? null)
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

  const handleConfirmar = async () => {
    if (dialogPinAberto) {
      showToast.error('Confirme ou cancele o ajuste do pin no mapa.')
      return
    }
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
    if (!geoPronta || !geoSincronizadaComEndereco || buscandoGeocodeMapa) {
      if (buscandoGeocodeMapa) {
        showToast.error('Aguarde a atualização do mapa.')
      } else if (!geoSincronizadaComEndereco) {
        showToast.error('Aguarde o mapa atualizar com o endereço informado.')
      } else if (usarPontoPreferencia && enderecoLocalizacao && !preferenciaEntrega) {
        showToast.error('Marque o ponto de entrega no mapa.')
      } else {
        showToast.error('Busque o endereço no mapa e confirme a localização antes de continuar.')
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

  const linhaCidadeEstado = [form.cidade, form.estado].filter(Boolean).join(' - ')
  const linhaBairroCep = [
    form.bairro.trim() || null,
    form.cep.trim() ? `CEP ${form.cep}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

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
          voltarDisabled={salvando}
          continuarDisabled={
            salvando ||
            etapaUi === 'busca' ||
            !geoPronta ||
            !geoSincronizadaComEndereco ||
            buscandoGeocodeMapa ||
            dialogPinAberto
          }
        />
      </DeliveryCheckoutShellFooter>

      <div className="space-y-2">
        <button
          type="button"
          disabled={buscandoGps}
          onClick={() => void usarLocalizacaoAtual()}
          className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold delivery-text-primary disabled:opacity-60"
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

        {etapaUi === 'busca' ? (
          <button
            type="button"
            disabled={salvando}
            onClick={iniciarPreenchimentoManual}
            className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold delivery-text-primary disabled:opacity-60"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            <PenLine className="h-4 w-4" aria-hidden />
            Preencher endereço
          </button>
        ) : null}

        {etapaUi === 'resumo' && form.rua.trim() ? (
          <div
            className="rounded-xl border px-3 py-2"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            <div className="flex items-start gap-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
              >
                <MapPin
                  className="h-4 w-4"
                  style={{ color: 'var(--delivery-text-muted)' }}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs delivery-text-secondary">Endereço encontrado</p>
                <p className="text-sm font-semibold leading-snug delivery-text-primary">
                  {form.rua}
                  {form.numero.trim() ? `, ${form.numero}` : ''}
                </p>
                {linhaCidadeEstado ? (
                  <p className="mt-0.5 text-xs leading-snug delivery-text-secondary">
                    {linhaCidadeEstado}
                  </p>
                ) : null}
                {linhaBairroCep ? (
                  <p className="mt-0.5 text-xs leading-snug delivery-text-secondary">
                    {linhaBairroCep}
                  </p>
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
            <div className="flex gap-2">
              <label className="relative w-[38%] shrink-0">
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
                  onChange={e => onChange('cep', formatarCepMascara(e.target.value))}
                  onBlur={() => {
                    if (normalizarDigitosCep(form.cep).length === 8) void buscarCep()
                  }}
                  className={fieldClass}
                  style={fieldStyle}
                />
              </label>

              <label className="relative min-w-0 flex-1">
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
            </div>

            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
                  Rua/Av.
                </span>
                <DeliveryCheckoutUppercaseInput
                  ref={ruaInputRef}
                  value={form.rua}
                  onValueChange={valor => onChange('rua', valor)}
                  className={fieldClass}
                  style={fieldStyle}
                />
              </label>

              <label className="relative w-[30%] shrink-0">
                <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
                  Número
                </span>
                <DeliveryCheckoutUppercaseInput
                  ref={numeroInputRef}
                  value={form.numero}
                  onValueChange={valor => onChange('numero', valor)}
                  className={fieldClass}
                  style={fieldStyle}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <label className="relative min-w-0">
                <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
                  Bairro
                </span>
                <DeliveryCheckoutUppercaseInput
                  ref={bairroInputRef}
                  value={form.bairro}
                  onValueChange={valor => onChange('bairro', valor)}
                  placeholder="Informe o bairro"
                  className={fieldClass}
                  style={fieldStyle}
                />
              </label>

              <label className="relative min-w-0">
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

              <label className="relative col-span-2 min-w-0 sm:col-span-1">
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
            </div>
          </>
        ) : null}

        {mostrarDetalhes ? (
          <>
            {!modoEdicaoCompleta ? (
              <>
                <div className="flex gap-2">
                  <label className="relative w-[30%] shrink-0">
                    <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
                      Número
                    </span>
                    <DeliveryCheckoutUppercaseInput
                      ref={numeroInputRef}
                      value={form.numero}
                      onValueChange={valor => onChange('numero', valor)}
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
                      onValueChange={valor => onChange('bairro', valor)}
                      placeholder="Informe o bairro"
                      className={fieldClass}
                      style={fieldStyle}
                    />
                  </label>
                </div>

                <div className="flex gap-2">
                  <label className="relative min-w-0 flex-1">
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

                  <label className="relative min-w-0 flex-1">
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
                </div>
              </>
            ) : null}

            <div>
              <p className="mb-1 text-sm font-semibold delivery-text-primary">
                Salvar endereço como:
              </p>
              <div
                className="flex items-center gap-2 rounded-xl border px-3 py-2"
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
              hideHeader
              autoGeocode={mostrarDetalhes && !geoSincronizadaComEndereco}
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
                fecharDialogPin()
                marcarGeoSincronizada()
              }}
              onMapChange={handleMapChange}
              onGeocodeBuscandoChange={setBuscandoGeocodeMapa}
              buscarLabel="Atualizar endereço no mapa"
              successToast="Localização atualizada. Ajuste o pin se necessário."
            />
          </>
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

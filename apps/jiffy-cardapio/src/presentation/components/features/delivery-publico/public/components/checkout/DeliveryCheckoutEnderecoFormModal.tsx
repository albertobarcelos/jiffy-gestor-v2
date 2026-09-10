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
  formatarCepMascara,
  normalizarDigitosCep,
} from '@/src/shared/utils/consultaCep'
import { obterEnderecoPorGps } from '@/src/shared/utils/geolocalizacaoEndereco'
import {
  enderecoGeocodeAtendeMinimo,
  geocodificarEnderecoViaGoogle,
  mensagemAmigavelErroGeolocalizacao,
  serializarEnderecoParaGeocode,
} from '@/src/shared/utils/geolocalizacaoEnderecoShared'
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
import { AjustarLocalizacaoMapaToggle } from './AjustarLocalizacaoMapaToggle'
import { DeliveryCheckoutFooterActions } from './DeliveryCheckoutFooterActions'
import { DeliveryCheckoutPinAjustadoDialog } from './DeliveryCheckoutPinAjustadoDialog'
import { PreferenciaEntregaToggle } from './PreferenciaEntregaToggle'
import { DeliveryCheckoutUppercaseInput } from './DeliveryCheckoutUppercaseInput'
import {
  DeliveryCheckoutShellFooter,
  DeliveryCheckoutShellHeader,
} from './DeliveryCheckoutShell'

type EtapaUiEndereco = 'busca' | 'resumo' | 'edicao'

/** Como a geo foi obtida — manual exige confirmação explícita do pin no mapa. */
type OrigemGeoEndereco = 'places' | 'gps' | 'manual' | 'salvo'

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
  const [origemGeo, setOrigemGeo] = useState<OrigemGeoEndereco | null>(() =>
    geoInicialDoEnderecoSalvo(enderecoSalvo).enderecoLocalizacao ? 'salvo' : null
  )
  const [pinMapaConfirmado, setPinMapaConfirmado] = useState(
    () => Boolean(geoInicialDoEnderecoSalvo(enderecoSalvo).enderecoLocalizacao)
  )
  const [mapaAjusteAberto, setMapaAjusteAberto] = useState(false)
  /** Após Places sem número: trava o foco no campo até o cliente informar. */
  const [aguardandoNumeroObrigatorio, setAguardandoNumeroObrigatorio] = useState(false)
  const ruaInputRef = useRef<HTMLInputElement>(null)
  const numeroInputRef = useRef<HTMLInputElement>(null)
  const bairroInputRef = useRef<HTMLInputElement>(null)
  const cidadeInputRef = useRef<HTMLInputElement>(null)
  const focoPendenteRef = useRef<CampoEnderecoFoco | null>(null)
  const geocodeBgSeqRef = useRef(0)
  const aguardandoNumeroRef = useRef(false)
  const toastNumeroSeqRef = useRef(0)
  aguardandoNumeroRef.current = aguardandoNumeroObrigatorio

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
  const exigeConfirmacaoMapa = origemGeo === 'manual'
  /** Mapa sob demanda: flag de ajuste, preferência de entrega, ou preenchimento manual. */
  const mostrarMapa =
    mostrarDetalhes &&
    (exigeConfirmacaoMapa || mapaAjusteAberto || usarPontoPreferencia)

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

  useEffect(() => {
    fecharDialogPin()
  }, [enderecoGeoKey, fecharDialogPin])

  useEffect(() => {
    if (origemGeo === 'manual') {
      setPinMapaConfirmado(false)
    }
  }, [enderecoGeoKey, origemGeo])

  /** Sem número a geo ainda não é definitiva — invalida sync para forçar novo geocode. */
  useEffect(() => {
    if (!mostrarDetalhes) return
    if (form.numero.trim()) return
    setUltimoGeoKeySincronizado(null)
  }, [form.numero, mostrarDetalhes])

  /**
   * Geocode em background (sem mapa): atualiza a localização do Google sempre que
   * o endereço/número muda e ainda não está sincronizado.
   */
  useEffect(() => {
    if (!mostrarDetalhes || mostrarMapa) return
    if (!form.numero.trim()) return
    if (!enderecoGeocodeAtendeMinimo(enderecoGeocode, 'flexivel')) return
    if (geoSincronizadaComEndereco) return

    let cancelled = false
    const seq = ++geocodeBgSeqRef.current
    setBuscandoGeocodeMapa(true)

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const resultado = await geocodificarEnderecoViaGoogle(enderecoGeocode, {
            minimo: 'flexivel',
          })
          if (cancelled || seq !== geocodeBgSeqRef.current) return
          setEnderecoLocalizacao(resultado.enderecoLocalizacao)
          setProviderEnderecoId(resultado.providerEnderecoId)
          setUltimoGeoKeySincronizado(serializarEnderecoParaGeocode(enderecoGeocode))
          if (usarPontoPreferencia) {
            setPreferenciaEntrega(prev => prev ?? resultado.enderecoLocalizacao)
          }
        } catch (error) {
          if (cancelled || seq !== geocodeBgSeqRef.current) return
          showToast.error(mensagemAmigavelErroGeolocalizacao(error, 'geocode'))
        } finally {
          if (!cancelled && seq === geocodeBgSeqRef.current) {
            setBuscandoGeocodeMapa(false)
          }
        }
      })()
    }, 700)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    mostrarDetalhes,
    mostrarMapa,
    form.numero,
    enderecoGeocode,
    enderecoGeoKey,
    geoSincronizadaComEndereco,
    usarPontoPreferencia,
  ])

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

  const focarNumeroObrigatorio = useCallback((opcoes?: { avisar?: boolean }) => {
    const avisar = opcoes?.avisar ?? false
    const tentarFoco = () => {
      const el = numeroInputRef.current
      if (!el) return false
      el.focus({ preventScroll: false })
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return document.activeElement === el
    }

    if (avisar) {
      const seq = ++toastNumeroSeqRef.current
      window.setTimeout(() => {
        if (seq !== toastNumeroSeqRef.current) return
        if (!aguardandoNumeroRef.current) return
        if (numeroInputRef.current?.value.trim()) return
        showToast.error('Informe o número do endereço para continuar.')
      }, 50)
    }

    // Places / teclado virtual podem roubar o foco — tenta algumas vezes.
    tentarFoco()
    window.setTimeout(() => tentarFoco(), 80)
    window.setTimeout(() => tentarFoco(), 220)
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
    if (campo === 'numero' && aguardandoNumeroRef.current) {
      focarNumeroObrigatorio()
      return
    }
    focarCampo(campo)
  }, [etapaUi, focarCampo, focarNumeroObrigatorio])

  /** Libera o travamento quando o número é preenchido. */
  useEffect(() => {
    if (!aguardandoNumeroObrigatorio) return
    if (!form.numero.trim()) return
    setAguardandoNumeroObrigatorio(false)
  }, [form.numero, aguardandoNumeroObrigatorio])

  const handleNumeroBlur = useCallback(() => {
    if (!aguardandoNumeroRef.current) return
    if (numeroInputRef.current?.value.trim()) return

    window.setTimeout(() => {
      if (!aguardandoNumeroRef.current) return
      if (numeroInputRef.current?.value.trim()) return
      const ativo = document.activeElement
      if (
        ativo instanceof Element &&
        ativo.closest('[data-checkout-leave-without-numero]')
      ) {
        return
      }
      if (ativo === numeroInputRef.current) return
      focarNumeroObrigatorio({ avisar: true })
    }, 0)
  }, [focarNumeroObrigatorio])

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

    const numeroFinal = (fields.numero ?? form.numero).trim()
    const enderecoParaSync = {
      rua: fields.rua ?? form.rua,
      numero: fields.numero ?? form.numero,
      bairro: fields.bairro ?? form.bairro,
      cidade: fields.cidade ?? form.cidade,
      estado: fields.estado ?? form.estado,
      cep: fields.cep ?? form.cep,
      complemento: form.complemento,
    }

    // Geo definitiva só com número — sem número, aguarda preenchimento + geocode.
    if (numeroFinal) {
      setEnderecoLocalizacao(place.enderecoLocalizacao)
      setProviderEnderecoId(place.providerEnderecoId)
      marcarGeoSincronizada(enderecoParaSync)
    } else {
      setEnderecoLocalizacao(null)
      setProviderEnderecoId(null)
      setUltimoGeoKeySincronizado(null)
    }

    fecharDialogPin()
    setPreferenciaEntrega(null)
    setUsarPontoPreferencia(false)
    setMapaAjusteAberto(false)
    setBuscaPlaces(
      maiusculasEnderecoInput(
        [fields.rua, fields.numero].filter(Boolean).join(', ') || place.enderecoFormatado || ''
      )
    )
    setOrigemGeo('places')
    setPinMapaConfirmado(Boolean(numeroFinal))
    // Sem número: resumo + foco travado no campo Número até o cliente preencher.
    if (numeroFinal) {
      setAguardandoNumeroObrigatorio(false)
      setEtapaUi('resumo')
      focoPendenteRef.current = null
      showToast.success('Endereço encontrado. Confira os dados e continue.')
    } else {
      setAguardandoNumeroObrigatorio(true)
      setEtapaUi('resumo')
      focoPendenteRef.current = 'numero'
      showToast.success('Endereço encontrado. Informe o número para localizar com precisão.')
      window.setTimeout(() => focarNumeroObrigatorio(), 60)
    }
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
    setOrigemGeo(null)
    setPinMapaConfirmado(false)
    setMapaAjusteAberto(false)
    setAguardandoNumeroObrigatorio(false)
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
    setOrigemGeo('manual')
    setPinMapaConfirmado(false)
    setUsarPontoPreferencia(false)
    setPreferenciaEntrega(null)
    setMapaAjusteAberto(true)
    setEtapaUi('edicao')
    focoPendenteRef.current = form.rua.trim() ? 'numero' : 'rua'
  }

  const handleToggleAjustarMapa = (checked: boolean) => {
    setMapaAjusteAberto(checked)
    if (checked) {
      setUsarPontoPreferencia(false)
      setPreferenciaEntrega(null)
    }
  }

  const handleTogglePreferencia = (checked: boolean) => {
    setUsarPontoPreferencia(checked)
    if (checked) {
      setMapaAjusteAberto(false)
      setPreferenciaEntrega(prev => prev ?? enderecoLocalizacao)
    } else {
      setPreferenciaEntrega(null)
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
      setOrigemGeo('gps')
      setPinMapaConfirmado(true)
      setMapaAjusteAberto(false)
      setEtapaUi('resumo')

      showToast.success('Localização aplicada. Confira o número e o complemento.')
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
      showToast.error('Informe o número do endereço para continuar.')
      if (aguardandoNumeroObrigatorio) {
        focarNumeroObrigatorio()
      } else {
        solicitarFocoCampo('numero')
      }
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
        showToast.error('Aguarde a localização do endereço ser atualizada.')
      } else if (!form.numero.trim()) {
        showToast.error('Informe o número para localizar o endereço com precisão.')
        solicitarFocoCampo('numero')
      } else if (!geoSincronizadaComEndereco) {
        showToast.error(
          exigeConfirmacaoMapa
            ? 'Preencha o endereço completo para o mapa localizar o pin.'
            : 'Aguarde a localização do endereço ser atualizada.'
        )
      } else if (usarPontoPreferencia && enderecoLocalizacao && !preferenciaEntrega) {
        showToast.error('Marque o ponto de entrega no mapa.')
      } else {
        showToast.error('Confirme a localização do endereço antes de continuar.')
      }
      return
    }
    if (exigeConfirmacaoMapa && !pinMapaConfirmado) {
      showToast.error('Confirme no mapa se o pin está no local correto antes de continuar.')
      setMapaAjusteAberto(true)
      return
    }

    const geo = montarGeoCheckoutInputFromState({
      enderecoLocalizacao,
      providerEnderecoId,
      usarPontoPreferencia,
      preferenciaEntrega,
    })
    if (!geo) {
      showToast.error('Confirme a localização do endereço antes de continuar.')
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

  const cancelarComLiberacao = () => {
    setAguardandoNumeroObrigatorio(false)
    onCancelar()
  }

  const numeroFieldStyle = aguardandoNumeroObrigatorio
    ? ({
        borderColor: 'var(--delivery-primary)',
        boxShadow: '0 0 0 1px var(--delivery-primary)',
      } as const)
    : fieldStyle

  return (
    <>
      <DeliveryCheckoutShellHeader
        title="Confirme seu endereço"
        showBack
        onBack={cancelarComLiberacao}
      />
      <DeliveryCheckoutShellFooter>
        <DeliveryCheckoutFooterActions
          onVoltar={cancelarComLiberacao}
          onContinuar={() => void handleConfirmar()}
          voltarLabel="Cancelar"
          continuarLabel={salvando ? 'Salvando...' : 'Confirmar'}
          voltarDisabled={salvando}
          continuarDisabled={
            salvando ||
            etapaUi === 'busca' ||
            dialogPinAberto ||
            (aguardandoNumeroObrigatorio && !form.numero.trim()
              ? false
              : !geoPronta ||
                !geoSincronizadaComEndereco ||
                buscandoGeocodeMapa ||
                (exigeConfirmacaoMapa && !pinMapaConfirmado))
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
                  onChange={e => onChange('cep', formatarCepMascara(e.target.value))}
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
                  onBlur={handleNumeroBlur}
                  inputMode="numeric"
                  autoComplete="address-line2"
                  aria-required={aguardandoNumeroObrigatorio || undefined}
                  className={fieldClass}
                  style={numeroFieldStyle}
                />
              </label>
            </div>

            {aguardandoNumeroObrigatorio && !form.numero.trim() ? (
              <p className="text-xs font-medium" style={{ color: 'var(--delivery-primary)' }}>
                Digite o número do endereço para continuar.
              </p>
            ) : null}

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
                      onBlur={handleNumeroBlur}
                      inputMode="numeric"
                      autoComplete="address-line2"
                      aria-required={aguardandoNumeroObrigatorio || undefined}
                      className={fieldClass}
                      style={numeroFieldStyle}
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

                {aguardandoNumeroObrigatorio && !form.numero.trim() ? (
                  <p className="text-xs font-medium" style={{ color: 'var(--delivery-primary)' }}>
                    Digite o número do endereço para continuar.
                  </p>
                ) : null}

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

            {mostrarDetalhes ? (
              <div className="space-y-2">
                {/* Toggles exclusivos: só um modo de mapa por vez */}
                {!exigeConfirmacaoMapa ? (
                  <div className="space-y-2">
                    {!usarPontoPreferencia ? (
                      <AjustarLocalizacaoMapaToggle
                        checked={mapaAjusteAberto}
                        onChange={handleToggleAjustarMapa}
                        disabled={salvando || !form.numero.trim()}
                      />
                    ) : null}
                    {!mapaAjusteAberto ? (
                      <PreferenciaEntregaToggle
                        checked={usarPontoPreferencia}
                        onChange={handleTogglePreferencia}
                        disabled={!enderecoLocalizacao || salvando || !form.numero.trim()}
                      />
                    ) : null}
                  </div>
                ) : null}

                {exigeConfirmacaoMapa && mostrarMapa ? (
                  <div
                    className="rounded-xl border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--delivery-border)' }}
                  >
                    <p className="font-semibold delivery-text-primary">Confirme a localização</p>
                    <p className="mt-0.5 text-xs delivery-text-secondary">
                      Como o endereço foi digitado manualmente, confira se o pin está no local
                      correto. Arraste se precisar e confirme abaixo.
                    </p>
                  </div>
                ) : null}

                {mostrarMapa ? (
                  <EnderecoGeolocalizacaoSection
                    variant="delivery"
                    hideHeader
                    hideBuscar={usarPontoPreferencia}
                    autoGeocode={
                      mostrarDetalhes &&
                      !usarPontoPreferencia &&
                      !geoSincronizadaComEndereco
                    }
                    endereco={enderecoGeocode}
                    localizacao={enderecoLocalizacao}
                    mapValue={pinMapa}
                    pinModo={usarPontoPreferencia ? 'preferencia' : 'endereco'}
                    localizacaoReferencia={usarPontoPreferencia ? enderecoLocalizacao : null}
                    onLocalizacaoChange={(point, meta) => {
                      // Em preferência, o geocode da section não deve alterar a geo do endereço.
                      if (usarPontoPreferencia) return
                      setEnderecoLocalizacao(point)
                      setProviderEnderecoId(meta?.providerEnderecoId ?? null)
                      fecharDialogPin()
                      marcarGeoSincronizada()
                      if (origemGeo === 'manual') {
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
                  />
                ) : buscandoGeocodeMapa ? (
                  <p className="text-xs delivery-text-secondary">Atualizando localização…</p>
                ) : null}

                {exigeConfirmacaoMapa && mostrarMapa ? (
                  <button
                    type="button"
                    disabled={
                      salvando ||
                      !geoPronta ||
                      !geoSincronizadaComEndereco ||
                      buscandoGeocodeMapa ||
                      dialogPinAberto ||
                      pinMapaConfirmado
                    }
                    onClick={confirmarPinNoMapa}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: 'var(--delivery-primary)' }}
                  >
                    <MapPin className="h-4 w-4" aria-hidden />
                    {pinMapaConfirmado
                      ? 'Pin confirmado no mapa'
                      : 'Confirmar que o pin está correto'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <DeliveryCheckoutPinAjustadoDialog
        open={dialogPinAberto}
        variante={variantePin}
        onConfirmar={handleConfirmarAjustePin}
        onCancelar={cancelarAjustePin}
      />
    </>
  )
}

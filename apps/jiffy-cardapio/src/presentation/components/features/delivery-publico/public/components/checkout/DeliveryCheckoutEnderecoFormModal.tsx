'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Home, LocateFixed, MapPin, PenLine, Trash2, X } from 'lucide-react'
import type { EnderecoGeoCheckoutInput } from '@/src/application/dto/delivery-publico/EnderecoGeoCheckoutDTO'
import { montarGeoCheckoutInputFromState } from '@/src/application/dto/delivery-publico/EnderecoGeoCheckoutDTO'
import type { EnderecoClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
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
import {
  maiusculasEnderecoInput,
  normalizarEnderecoGeocodeInput,
  normalizarEstadoEndereco,
} from '@/src/shared/utils/normalizarTextoEnderecoPublico'
import { formatarResumoEnderecoPublico } from '../../../shared/utils/garantirEnderecoClientePublico'
import { etiquetaEnderecoPublicoLabel } from '../../../shared/utils/etiquetaEnderecoPublicoLabel'
import { useDeliveryBodyScrollLock } from '../../../shared/hooks/useDeliveryBodyScrollLock'
import { DeliveryCheckoutConfirmarRemocaoEnderecoDialog } from './DeliveryCheckoutConfirmarRemocaoEnderecoDialog'
import { DeliveryCheckoutConfirmarSairEnderecoDialog } from './DeliveryCheckoutConfirmarSairEnderecoDialog'
import { DeliveryCheckoutEnderecoMapaModal } from './DeliveryCheckoutEnderecoMapaModal'
import { DeliveryCheckoutFooterActions } from './DeliveryCheckoutFooterActions'
import { DeliveryCheckoutUppercaseInput } from './DeliveryCheckoutUppercaseInput'
import {
  DeliveryCheckoutShellFooter,
  DeliveryCheckoutShellHeader,
  useDeliveryCheckoutShellCloseHandler,
} from './DeliveryCheckoutShell'

/** Como a geo foi obtida — manual exige geocode ao abrir o mapa. */
type OrigemGeoEndereco = 'places' | 'gps' | 'manual' | 'salvo'

type CampoEnderecoFoco = 'rua' | 'numero' | 'bairro' | 'cidade'

type ConfirmSairDestino = 'overlay' | 'checkout'

const TITULO_BUSCA_ENDERECO =
  'Informe seu CEP ou Nome da Rua onde deseja receber seu pedido'

/**
 * Só aceita o número do Google se o cliente digitou esse número na busca.
 * CEP sozinho (ex.: 78390-000) nunca preenche Número — evita lixos como "2-610".
 */
function numeroInformadoNaBuscaPlaces(busca: string, numeroGoogle: string): boolean {
  const numero = numeroGoogle.trim()
  if (!numero) return false

  const digitosCep = normalizarDigitosCep(busca)
  const soDigitosBusca = busca.replace(/\D/g, '')
  if (digitosCep.length === 8 && soDigitosBusca === digitosCep) {
    return false
  }

  let textoSemCep = busca
  if (digitosCep.length === 8) {
    textoSemCep = busca.replace(/\d{5}-?\d{3}/g, ' ')
  }

  const escapar = (valor: string) => valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const digitosNumero = numero.replace(/\D/g, '')
  if (
    new RegExp(`(^|[^\\dA-Za-z])${escapar(numero)}([^\\dA-Za-z]|$)`, 'i').test(textoSemCep)
  ) {
    return true
  }
  if (
    digitosNumero.length > 0 &&
    new RegExp(`(^|[^\\d])${escapar(digitosNumero)}([^\\d]|$)`).test(textoSemCep)
  ) {
    return true
  }
  return false
}

type DeliveryCheckoutEnderecoFormModalProps = {
  form: CheckoutFormData
  onChange: <K extends keyof CheckoutFormData>(key: K, value: CheckoutFormData[K]) => void
  onClose: () => void
  onCancelar: () => void
  onConfirmar: (geo: EnderecoGeoCheckoutInput) => Promise<void>
  placesBias?: PlacesBias | null
  /** Ao editar endereço existente, hidrata o pin com as coordenadas já salvas. */
  enderecoSalvo?: EnderecoClienteDeliveryPublicoDTO | null
  /** Endereços já cadastrados — exibidos na etapa de busca (novo endereço). */
  enderecosCadastrados?: EnderecoClienteDeliveryPublicoDTO[]
  onSelecionarEnderecoCadastrado?: (enderecoId: string) => void
  onRemoverEnderecoCadastrado?: (enderecoId: string) => Promise<void> | void
}

function geoInicialDoEnderecoSalvo(endereco: EnderecoClienteDeliveryPublicoDTO | null | undefined) {
  const enderecoLocalizacao = parseGeoJsonPoint(endereco?.enderecoLocalizacao)
  return {
    enderecoLocalizacao,
    providerEnderecoId: endereco?.providerEnderecoId?.trim() || null,
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
  'w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none delivery-text-primary'
const fieldStyle = { borderColor: 'var(--delivery-border)' } as const

export function DeliveryCheckoutEnderecoFormModal({
  form,
  onChange,
  onClose: _onClose,
  onCancelar,
  onConfirmar,
  placesBias = null,
  enderecoSalvo = null,
  enderecosCadastrados = [],
  onSelecionarEnderecoCadastrado,
  onRemoverEnderecoCadastrado,
}: DeliveryCheckoutEnderecoFormModalProps) {
  const [formOverlayOpen, setFormOverlayOpen] = useState(() => Boolean(form.rua.trim()))
  const [mapaModalOpen, setMapaModalOpen] = useState(false)
  const [pinMovido, setPinMovido] = useState(false)
  const [dialogPinAberto, setDialogPinAberto] = useState(false)
  const [buscandoGps, setBuscandoGps] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [abrindoMapa, setAbrindoMapa] = useState(false)
  const [enderecoParaRemover, setEnderecoParaRemover] =
    useState<EnderecoClienteDeliveryPublicoDTO | null>(null)
  const [removendoEndereco, setRemovendoEndereco] = useState(false)
  const [mostrarOpcaoManual, setMostrarOpcaoManual] = useState(false)
  const [confirmSairOpen, setConfirmSairOpen] = useState(false)
  const [confirmSairDestino, setConfirmSairDestino] = useState<ConfirmSairDestino>('checkout')
  const [enderecoLocalizacao, setEnderecoLocalizacao] = useState<GeoJsonPoint | null>(() =>
    geoInicialDoEnderecoSalvo(enderecoSalvo).enderecoLocalizacao
  )
  /** Geocode original do texto do endereço — âncora fixa do limite de 500 m do pin. */
  const [localizacaoAncoraGeocode, setLocalizacaoAncoraGeocode] = useState<GeoJsonPoint | null>(
    null
  )
  const [providerEnderecoId, setProviderEnderecoId] = useState<string | null>(
    () => geoInicialDoEnderecoSalvo(enderecoSalvo).providerEnderecoId
  )
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
  /** Após Places sem número: trava o foco no campo até o cliente informar. */
  const [aguardandoNumeroObrigatorio, setAguardandoNumeroObrigatorio] = useState(false)
  const [portalReady, setPortalReady] = useState(false)

  const ruaInputRef = useRef<HTMLInputElement>(null)
  const numeroInputRef = useRef<HTMLInputElement>(null)
  const bairroInputRef = useRef<HTMLInputElement>(null)
  const cidadeInputRef = useRef<HTMLInputElement>(null)
  const focoPendenteRef = useRef<CampoEnderecoFoco | null>(null)
  const aguardandoNumeroRef = useRef(false)
  const toastNumeroSeqRef = useRef(0)
  const pinAntesRef = useRef<GeoJsonPoint | null>(null)
  const providerAntesRef = useRef<string | null>(null)
  aguardandoNumeroRef.current = aguardandoNumeroObrigatorio

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useDeliveryBodyScrollLock(formOverlayOpen && !mapaModalOpen)

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

  const marcarGeoSincronizada = useCallback(
    (endereco?: typeof enderecoGeocode) => {
      setUltimoGeoKeySincronizado(serializarEnderecoParaGeocode(endereco ?? enderecoGeocode))
    },
    [enderecoGeocode]
  )

  /** Sem número a geo ainda não é definitiva — invalida sync para forçar geocode ao confirmar. */
  useEffect(() => {
    if (!formOverlayOpen) return
    if (form.numero.trim()) return
    setUltimoGeoKeySincronizado(null)
  }, [form.numero, formOverlayOpen])

  /** Manual: edição de campos invalida sync até novo geocode. */
  useEffect(() => {
    if (origemGeo !== 'manual') return
    if (!formOverlayOpen) return
    setUltimoGeoKeySincronizado(prev => {
      if (prev === null || prev === enderecoGeoKey) return prev
      return null
    })
  }, [origemGeo, formOverlayOpen, enderecoGeoKey])

  /**
   * Places/GPS/salvo: o pin permanece só enquanto o texto do endereço
   * continuar igual ao da última geo sincronizada; senão força geocode.
   */
  useEffect(() => {
    if (!(origemGeo === 'places' || origemGeo === 'gps' || origemGeo === 'salvo')) return
    if (!enderecoLocalizacao || !formOverlayOpen) return
    if (!form.numero.trim()) return
    setUltimoGeoKeySincronizado(prev => {
      if (prev === null || prev === enderecoGeoKey) return prev
      return null
    })
  }, [origemGeo, enderecoLocalizacao, formOverlayOpen, enderecoGeoKey, form.numero])

  /** Texto do endereço mudou → âncora do limite precisa ser recalculada no próximo geocode. */
  useEffect(() => {
    if (!formOverlayOpen) return
    if (ultimoGeoKeySincronizado !== null) return
    setLocalizacaoAncoraGeocode(null)
  }, [formOverlayOpen, ultimoGeoKeySincronizado])

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

    tentarFoco()
    window.setTimeout(() => tentarFoco(), 80)
    window.setTimeout(() => tentarFoco(), 220)
  }, [])

  const solicitarFocoCampo = useCallback(
    (campo: CampoEnderecoFoco) => {
      if (!formOverlayOpen) {
        focoPendenteRef.current = campo
        setFormOverlayOpen(true)
        return
      }
      focarCampo(campo)
    },
    [formOverlayOpen, focarCampo]
  )

  useLayoutEffect(() => {
    if (!formOverlayOpen || !focoPendenteRef.current) return
    const campo = focoPendenteRef.current
    focoPendenteRef.current = null
    if (campo === 'numero' && aguardandoNumeroRef.current) {
      focarNumeroObrigatorio()
      return
    }
    focarCampo(campo)
  }, [formOverlayOpen, focarCampo, focarNumeroObrigatorio])

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
    setLocalizacaoAncoraGeocode(point)
    setProviderEnderecoId(providerId ?? null)
    setDialogPinAberto(false)
    setPinMovido(false)
    marcarGeoSincronizada()
  }

  const aplicarPlaceDetails = (place: PlaceDetailsResult) => {
    const fields = normalizarEnderecoGeocodeInput(placeDetailsParaEnderecoGeocode(place))
    const numeroDaBusca = numeroInformadoNaBuscaPlaces(buscaPlaces, fields.numero)
      ? fields.numero.trim()
      : ''

    if (fields.rua) onChange('rua', fields.rua)
    else onChange('rua', '')
    onChange('numero', numeroDaBusca)
    if (fields.bairro) onChange('bairro', fields.bairro)
    else onChange('bairro', '')
    if (fields.cidade) onChange('cidade', fields.cidade)
    if (fields.estado) onChange('estado', fields.estado)
    if (fields.cep) onChange('cep', fields.cep)

    const numeroFinal = numeroDaBusca
    const ruaFinal = (fields.rua ?? '').trim()
    const enderecoParaSync = {
      rua: fields.rua || '',
      numero: numeroDaBusca,
      bairro: fields.bairro || '',
      cidade: fields.cidade || form.cidade,
      estado: fields.estado || form.estado,
      cep: fields.cep || form.cep,
      complemento: form.complemento,
    }

    if (numeroFinal && ruaFinal) {
      setEnderecoLocalizacao(place.enderecoLocalizacao)
      setLocalizacaoAncoraGeocode(place.enderecoLocalizacao)
      setProviderEnderecoId(place.providerEnderecoId)
      marcarGeoSincronizada(enderecoParaSync)
      setAguardandoNumeroObrigatorio(false)
      focoPendenteRef.current = null
    } else {
      setEnderecoLocalizacao(null)
      setLocalizacaoAncoraGeocode(null)
      setProviderEnderecoId(null)
      setUltimoGeoKeySincronizado(null)
      if (!ruaFinal) {
        setAguardandoNumeroObrigatorio(false)
        focoPendenteRef.current = 'rua'
      } else {
        setAguardandoNumeroObrigatorio(true)
        focoPendenteRef.current = 'numero'
        window.setTimeout(() => focarNumeroObrigatorio(), 60)
      }
    }

    setDialogPinAberto(false)
    setPinMovido(false)
    setMostrarOpcaoManual(false)
    setBuscaPlaces(
      maiusculasEnderecoInput(
        [fields.rua, numeroDaBusca].filter(Boolean).join(', ') ||
          [fields.cidade, fields.estado, fields.cep].filter(Boolean).join(' - ') ||
          place.enderecoFormatado ||
          ''
      )
    )
    setOrigemGeo('places')
    setFormOverlayOpen(true)
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
    setEnderecoLocalizacao(null)
    setLocalizacaoAncoraGeocode(null)
    setProviderEnderecoId(null)
    setUltimoGeoKeySincronizado(null)
    setOrigemGeo(null)
    setAguardandoNumeroObrigatorio(false)
    setMostrarOpcaoManual(false)
    setPinMovido(false)
    setDialogPinAberto(false)
    setMapaModalOpen(false)
    setFormOverlayOpen(false)
  }

  const iniciarPreenchimentoManual = () => {
    const textoBusca = buscaPlaces.trim()
    if (textoBusca) {
      const digitosCep = textoBusca.replace(/\D/g, '')
      if (digitosCep.length === 8 && !form.cep.trim()) {
        onChange('cep', formatarCepMascara(digitosCep))
      } else if (!form.rua.trim()) {
        onChange('rua', maiusculasEnderecoInput(textoBusca))
      }
    }
    setMostrarOpcaoManual(false)
    setOrigemGeo('manual')
    setPinMovido(false)
    setDialogPinAberto(false)
    setEnderecoLocalizacao(null)
    setLocalizacaoAncoraGeocode(null)
    setProviderEnderecoId(null)
    setUltimoGeoKeySincronizado(null)
    setFormOverlayOpen(true)
    focoPendenteRef.current = form.rua.trim() || textoBusca ? 'numero' : 'rua'
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
      setMostrarOpcaoManual(false)
      setFormOverlayOpen(true)

      showToast.success('Localização aplicada. Confira o número e o complemento.')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao obter localização')
    } finally {
      setBuscandoGps(false)
    }
  }

  const handleConfirmarLocalizacaoForm = async () => {
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

    setAbrindoMapa(true)
    try {
      if (!enderecoGeocodeAtendeMinimo(enderecoGeocode, 'flexivel')) {
        showToast.error('Preencha o endereço completo para localizar o pin.')
        return
      }

      // Reusa a coordenada já salva/sincronizada (ex.: editar endereço sem alterar o form).
      // Só geocodifica de novo quando não há pin válido ou o texto do endereço mudou.
      // A âncora do limite de 500 m é sempre o geocode do texto — não o último pin.
      if (enderecoLocalizacao && geoSincronizadaComEndereco) {
        let ancora = localizacaoAncoraGeocode
        if (!ancora) {
          const resultadoAncora = await geocodificarEnderecoViaGoogle(enderecoGeocode, {
            minimo: 'flexivel',
          })
          ancora = resultadoAncora.enderecoLocalizacao
          setLocalizacaoAncoraGeocode(ancora)
        }
        pinAntesRef.current = enderecoLocalizacao
        providerAntesRef.current = providerEnderecoId
        setPinMovido(false)
        setDialogPinAberto(false)
        setMapaModalOpen(true)
        return
      }

      const resultado = await geocodificarEnderecoViaGoogle(enderecoGeocode, {
        minimo: 'flexivel',
      })
      const pin = resultado.enderecoLocalizacao
      const providerId = resultado.providerEnderecoId
      setEnderecoLocalizacao(pin)
      setLocalizacaoAncoraGeocode(pin)
      setProviderEnderecoId(providerId)
      marcarGeoSincronizada()
      pinAntesRef.current = pin
      providerAntesRef.current = providerId
      setPinMovido(false)
      setDialogPinAberto(false)
      setMapaModalOpen(true)
    } catch (error) {
      showToast.error(mensagemAmigavelErroGeolocalizacao(error, 'geocode'))
    } finally {
      setAbrindoMapa(false)
    }
  }

  const handleChangePinMapa = useCallback((point: GeoJsonPoint) => {
    setEnderecoLocalizacao(point)
    setProviderEnderecoId(null)
    setPinMovido(true)
  }, [])

  const montarGeoAtual = useCallback(() => {
    return montarGeoCheckoutInputFromState({
      enderecoLocalizacao,
      providerEnderecoId,
      usarPontoPreferencia: false,
      preferenciaEntrega: null,
    })
  }, [enderecoLocalizacao, providerEnderecoId])

  const finalizarConfirmacao = useCallback(async () => {
    const geo = montarGeoAtual()
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
  }, [montarGeoAtual, onConfirmar])

  const handleConfirmarMapa = useCallback(() => {
    if (!enderecoLocalizacao) {
      showToast.error('Aguarde o mapa marcar o endereço antes de confirmar.')
      return
    }
    if (pinMovido) {
      setDialogPinAberto(true)
      return
    }
    void finalizarConfirmacao()
  }, [enderecoLocalizacao, pinMovido, finalizarConfirmacao])

  const handleConfirmarAjustePin = useCallback(() => {
    setDialogPinAberto(false)
    void finalizarConfirmacao()
  }, [finalizarConfirmacao])

  const handleCancelarAjustePin = useCallback(() => {
    const anterior = pinAntesRef.current
    if (anterior) {
      setEnderecoLocalizacao(anterior)
      setProviderEnderecoId(providerAntesRef.current)
    }
    setPinMovido(false)
    setDialogPinAberto(false)
  }, [])

  const fecharMapa = useCallback(() => {
    setDialogPinAberto(false)
    setPinMovido(false)
    setMapaModalOpen(false)
    const anterior = pinAntesRef.current
    if (anterior) {
      setEnderecoLocalizacao(anterior)
      setProviderEnderecoId(providerAntesRef.current)
    }
  }, [])

  const marcarSemResultadoPlaces = useCallback(() => {
    setMostrarOpcaoManual(true)
  }, [])

  const marcarResultadosPlaces = useCallback(() => {
    setMostrarOpcaoManual(false)
  }, [])

  const formularioTemProgresso = useMemo(() => {
    if (formOverlayOpen || mapaModalOpen) {
      return Boolean(
        form.rua.trim() ||
          form.numero.trim() ||
          form.bairro.trim() ||
          form.cidade.trim() ||
          form.cep.trim() ||
          form.complemento.trim() ||
          form.pontoReferencia.trim() ||
          buscaPlaces.trim()
      )
    }
    if (buscaPlaces.trim()) return true
    return Boolean(
      form.rua.trim() ||
        form.numero.trim() ||
        form.bairro.trim() ||
        form.cidade.trim() ||
        form.cep.trim() ||
        form.complemento.trim() ||
        form.pontoReferencia.trim()
    )
  }, [
    formOverlayOpen,
    mapaModalOpen,
    buscaPlaces,
    form.rua,
    form.numero,
    form.bairro,
    form.cidade,
    form.cep,
    form.complemento,
    form.pontoReferencia,
  ])

  const overlayTemProgresso = useMemo(
    () =>
      Boolean(
        form.rua.trim() ||
          form.numero.trim() ||
          form.bairro.trim() ||
          form.cidade.trim() ||
          form.cep.trim() ||
          form.complemento.trim() ||
          form.pontoReferencia.trim()
      ),
    [
      form.rua,
      form.numero,
      form.bairro,
      form.cidade,
      form.cep,
      form.complemento,
      form.pontoReferencia,
    ]
  )

  const cancelarComLiberacao = useCallback(() => {
    setAguardandoNumeroObrigatorio(false)
    setConfirmSairOpen(false)
    if (confirmSairDestino === 'overlay') {
      limparCamposAposBuscaPlaces()
      setBuscaPlaces('')
      return
    }
    onCancelar()
  }, [confirmSairDestino, onCancelar])

  const solicitarFecharOverlay = useCallback(() => {
    setAguardandoNumeroObrigatorio(false)
    if (overlayTemProgresso) {
      setConfirmSairDestino('overlay')
      setConfirmSairOpen(true)
      return
    }
    limparCamposAposBuscaPlaces()
    setBuscaPlaces('')
  }, [overlayTemProgresso])

  const solicitarSairDoFormulario = useCallback(() => {
    setAguardandoNumeroObrigatorio(false)
    if (mapaModalOpen) {
      fecharMapa()
      return
    }
    if (formOverlayOpen) {
      solicitarFecharOverlay()
      return
    }
    if (formularioTemProgresso) {
      setConfirmSairDestino('checkout')
      setConfirmSairOpen(true)
      return
    }
    onCancelar()
  }, [
    mapaModalOpen,
    formOverlayOpen,
    formularioTemProgresso,
    fecharMapa,
    solicitarFecharOverlay,
    onCancelar,
  ])

  useDeliveryCheckoutShellCloseHandler(solicitarSairDoFormulario)

  const numeroFieldStyle = aguardandoNumeroObrigatorio
    ? ({
        borderColor: 'var(--delivery-primary)',
        boxShadow: '0 0 0 1px var(--delivery-primary)',
      } as const)
    : fieldStyle

  const mostrarListaEnderecosCadastrados =
    form.modoEndereco !== 'existente' &&
    enderecosCadastrados.length > 0 &&
    Boolean(onSelecionarEnderecoCadastrado)

  const enderecosOrdenados = useMemo(() => {
    if (!mostrarListaEnderecosCadastrados) return []
    return [...enderecosCadastrados].sort((a, b) => {
      const ta = a.ultimaUtilizacaoEm ? Date.parse(a.ultimaUtilizacaoEm) : 0
      const tb = b.ultimaUtilizacaoEm ? Date.parse(b.ultimaUtilizacaoEm) : 0
      return tb - ta
    })
  }, [mostrarListaEnderecosCadastrados, enderecosCadastrados])

  const confirmarRemocaoEndereco = async () => {
    if (!enderecoParaRemover || !onRemoverEnderecoCadastrado) return
    setRemovendoEndereco(true)
    try {
      await onRemoverEnderecoCadastrado(enderecoParaRemover.id)
      setEnderecoParaRemover(null)
    } finally {
      setRemovendoEndereco(false)
    }
  }

  const resumoEnderecoMapa = [
    [form.rua, form.numero].filter(Boolean).join(', '),
    form.bairro,
    [form.cidade, form.estado].filter(Boolean).join(' - '),
  ]
    .filter(Boolean)
    .join(' · ')

  const cardEnderecoPreview = {
    etiqueta: etiquetaEnderecoPublicoLabel(form.etiquetaEndereco) || form.apelidoEndereco || 'Endereço',
    linhaPrincipal: [
      [form.rua, form.numero].filter(Boolean).join(', '),
      form.bairro.trim(),
    ]
      .filter(Boolean)
      .join(' · '),
    cidadeEstado: [form.cidade, form.estado].filter(Boolean).join(' - '),
    cep: form.cep.trim(),
    complemento: form.complemento.trim(),
    pontoReferencia: form.pontoReferencia.trim(),
  }
  const cardEnderecoTemConteudo = Boolean(
    cardEnderecoPreview.linhaPrincipal ||
      cardEnderecoPreview.cidadeEstado ||
      cardEnderecoPreview.cep ||
      cardEnderecoPreview.complemento ||
      cardEnderecoPreview.pontoReferencia
  )

  const formularioOverlay =
    portalReady && formOverlayOpen
      ? createPortal(
          <div
            className="delivery-vv-panel z-[100] flex flex-col rounded-t-2xl shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delivery-form-endereco-titulo"
            style={{
              backgroundColor: 'var(--delivery-surface, #ffffff)',
              height: 'calc(var(--delivery-vv-height, 100dvh) * 0.95)',
              top: 'calc(var(--delivery-vv-offset-top, 0px) + var(--delivery-vv-height, 100dvh) * 0.05)',
            }}
          >
            <div
              className="flex shrink-0 items-center gap-2 border-b px-4 py-3"
              style={{
                borderColor: 'var(--delivery-primary-dark, #171717)',
                backgroundColor: 'var(--delivery-primary-dark, #171717)',
                color: '#ffffff',
              }}
            >
              <button
                type="button"
                data-checkout-leave-without-numero=""
                onMouseDown={e => e.preventDefault()}
                onClick={solicitarFecharOverlay}
                aria-label="Voltar"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white"
              >
                <span className="text-lg leading-none">‹</span>
              </button>
              <h2
                id="delivery-form-endereco-titulo"
                className="min-w-0 flex-1 text-center text-base font-semibold text-white"
              >
                Confirme seu endereço
              </h2>
              <button
                type="button"
                data-checkout-leave-without-numero=""
                onMouseDown={e => e.preventDefault()}
                onClick={solicitarFecharOverlay}
                aria-label="Fechar"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-y-contain px-4 py-4">
                <div className="space-y-3">
                  <h3 className="text-center text-lg font-semibold leading-snug delivery-text-primary">
                    Complete os dados do seu endereço
                  </h3>

                  <div
                    className="flex items-start gap-3 rounded-lg border px-3 py-3"
                    style={{
                      backgroundColor: 'var(--delivery-surface, #ffffff)',
                      borderColor: 'var(--delivery-border)',
                    }}
                    aria-live="polite"
                  >
                    <Home
                      className="mt-0.5 h-5 w-5 shrink-0"
                      style={{ color: 'var(--delivery-text-muted)' }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold delivery-text-primary">
                        {cardEnderecoPreview.etiqueta}
                      </p>
                      {cardEnderecoTemConteudo ? (
                        <div className="mt-1 space-y-0.5 text-xs leading-relaxed delivery-text-secondary">
                          {cardEnderecoPreview.linhaPrincipal ? (
                            <p>{cardEnderecoPreview.linhaPrincipal}</p>
                          ) : null}
                          {cardEnderecoPreview.cidadeEstado || cardEnderecoPreview.cep ? (
                            <p>
                              {[
                                cardEnderecoPreview.cidadeEstado,
                                cardEnderecoPreview.cep
                                  ? `CEP ${cardEnderecoPreview.cep}`
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          ) : null}
                          {cardEnderecoPreview.complemento ||
                          cardEnderecoPreview.pontoReferencia ? (
                            <p>
                              {[
                                cardEnderecoPreview.complemento
                                  ? `Compl.: ${cardEnderecoPreview.complemento}`
                                  : '',
                                cardEnderecoPreview.pontoReferencia
                                  ? `Ref.: ${cardEnderecoPreview.pontoReferencia}`
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs delivery-text-secondary">
                          Preencha os campos abaixo para montar seu endereço.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
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

                <div className="flex gap-3">
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

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

                <div>
                  <p className="mb-2 text-sm font-semibold delivery-text-primary">
                    Salvar endereço como:
                  </p>
                  <div
                    className="flex items-center gap-2 rounded-lg border px-3 py-2.5"
                    style={{ borderColor: 'var(--delivery-border)' }}
                  >
                    <Home
                      className="h-4 w-4 shrink-0"
                      style={{ color: 'var(--delivery-text-muted)' }}
                    />
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
            </div>

            <div
              className="shrink-0"
              style={{
                paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
              }}
            >
              <button
                type="button"
                disabled={salvando || abrindoMapa || mapaModalOpen}
                data-checkout-leave-without-numero=""
                onMouseDown={e => {
                  if (!(salvando || abrindoMapa)) e.preventDefault()
                }}
                onClick={() => void handleConfirmarLocalizacaoForm()}
                className="flex min-h-[3.5rem] w-full items-center justify-center gap-2 border-0 px-5 text-base font-semibold disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--delivery-primary-dark, #171717)',
                  color: 'var(--delivery-btn-text, #ffffff)',
                }}
              >
                <MapPin className="h-4 w-4" aria-hidden />
                {abrindoMapa ? 'Localizando...' : 'Confirmar localização'}
              </button>
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <DeliveryCheckoutShellHeader title="" showBack onBack={solicitarSairDoFormulario} />
      <DeliveryCheckoutShellFooter>
        <DeliveryCheckoutFooterActions
          onVoltar={solicitarSairDoFormulario}
          onContinuar={() => undefined}
          voltarLabel="Cancelar"
          continuarLabel="Continuar"
          voltarDisabled={salvando}
          continuarDisabled
        />
      </DeliveryCheckoutShellFooter>

      <div className="space-y-3">
        <h2 className="text-center text-base font-semibold leading-snug delivery-text-primary">
          {TITULO_BUSCA_ENDERECO}
        </h2>

        <EnderecoPlacesAutocomplete
          variant="delivery"
          label=""
          floatingLabel={false}
          placeholder="Informe o seu CEP ou Nome da Rua"
          value={buscaPlaces}
          onChange={setBuscaPlaces}
          onSelect={aplicarPlaceDetails}
          onClear={limparCamposAposBuscaPlaces}
          onSemResultadoConfiavel={marcarSemResultadoPlaces}
          onResultadosEncontrados={marcarResultadosPlaces}
          bias={placesBias}
          disabled={salvando || formOverlayOpen}
        />

        {mostrarOpcaoManual ? (
          <button
            type="button"
            disabled={salvando || formOverlayOpen}
            onClick={iniciarPreenchimentoManual}
            className="flex w-full items-start gap-2 rounded-xl border px-3 py-3 text-left text-sm disabled:opacity-60"
            style={{
              borderColor: 'var(--delivery-primary)',
              backgroundColor: 'var(--delivery-surface-muted)',
            }}
          >
            <PenLine
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: 'var(--delivery-primary)' }}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="block font-semibold delivery-text-primary">
                Não encontramos este endereço
              </span>
              <span className="mt-0.5 block text-xs delivery-text-secondary">
                Toque aqui para preencher o endereço manualmente.
              </span>
            </span>
          </button>
        ) : null}

        <div className="flex items-center gap-3 py-0.5" aria-hidden>
          <span className="h-px flex-1" style={{ backgroundColor: 'var(--delivery-border)' }} />
          <span className="text-xs font-medium uppercase delivery-text-secondary">ou</span>
          <span className="h-px flex-1" style={{ backgroundColor: 'var(--delivery-border)' }} />
        </div>

        <button
          type="button"
          disabled={buscandoGps || salvando || formOverlayOpen}
          onClick={() => void usarLocalizacaoAtual()}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold delivery-text-primary disabled:opacity-60"
          style={{ borderColor: 'var(--delivery-border)' }}
        >
          <LocateFixed className="h-4 w-4" aria-hidden />
          {buscandoGps ? 'Obtendo localização...' : 'Usar minha localização'}
        </button>

        {mostrarListaEnderecosCadastrados ? (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-semibold delivery-text-primary">Últimos endereços</p>
            <div className="space-y-2">
              {enderecosOrdenados.map(endereco => {
                const bloqueado =
                  removendoEndereco && enderecoParaRemover?.id === endereco.id
                const resumo = formatarResumoEnderecoPublico(endereco)
                return (
                  <div key={endereco.id} className="flex items-stretch gap-2">
                    <button
                      type="button"
                      disabled={bloqueado || salvando || formOverlayOpen}
                      onClick={() => onSelecionarEnderecoCadastrado?.(endereco.id)}
                      className="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-3 py-3 text-left disabled:opacity-60"
                      style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
                    >
                      <Home
                        className="mt-0.5 h-5 w-5 shrink-0"
                        style={{ color: 'var(--delivery-text-muted)' }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold delivery-text-primary">
                          {etiquetaEnderecoPublicoLabel(endereco.etiqueta) || 'Endereço'}
                        </span>
                        <span className="mt-0.5 block truncate text-xs delivery-text-secondary">
                          {resumo}
                        </span>
                      </span>
                    </button>
                    {onRemoverEnderecoCadastrado ? (
                      <button
                        type="button"
                        aria-label={`Remover endereço ${endereco.rua}`}
                        disabled={removendoEndereco || salvando || formOverlayOpen}
                        onClick={() => setEnderecoParaRemover(endereco)}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-lg text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      {formularioOverlay}

      <DeliveryCheckoutEnderecoMapaModal
        open={mapaModalOpen}
        localizacao={enderecoLocalizacao}
        localizacaoAncora={localizacaoAncoraGeocode}
        pinMovido={pinMovido}
        salvando={salvando}
        dialogPinAberto={dialogPinAberto}
        onChangePin={handleChangePinMapa}
        onVoltar={fecharMapa}
        onConfirmar={handleConfirmarMapa}
        onConfirmarAjustePin={handleConfirmarAjustePin}
        onCancelarAjustePin={handleCancelarAjustePin}
        resumoEndereco={resumoEnderecoMapa}
      />

      <DeliveryCheckoutConfirmarSairEnderecoDialog
        open={confirmSairOpen}
        onConfirmarSair={cancelarComLiberacao}
        onContinuar={() => setConfirmSairOpen(false)}
      />

      <DeliveryCheckoutConfirmarRemocaoEnderecoDialog
        open={Boolean(enderecoParaRemover)}
        resumoEndereco={
          enderecoParaRemover
            ? formatarResumoEnderecoPublico(enderecoParaRemover)
            : undefined
        }
        removendo={removendoEndereco}
        onConfirmar={() => void confirmarRemocaoEndereco()}
        onCancelar={() => {
          if (removendoEndereco) return
          setEnderecoParaRemover(null)
        }}
      />
    </>
  )
}

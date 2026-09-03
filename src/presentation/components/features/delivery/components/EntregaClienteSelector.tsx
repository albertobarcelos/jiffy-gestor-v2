'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { MdSearch, MdAddLocation, MdEdit, MdLocationOn, MdPhone, MdPerson, MdCheckCircle } from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { Label } from '@/src/presentation/components/ui/label'
import { showToast } from '@/src/shared/utils/toast'
import {
  consultarCepViaApi,
  formatarCepMascara,
  normalizarDigitosCep,
  type ViaCepEnderecoNormalizado,
} from '@/src/shared/utils/consultaCep'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import {
  useMoradasPorTelefone,
  useCriarMoradaTelefone,
  useAtualizarMoradaTelefone,
  useRegistrarUsoMoradaTelefone,
  useBuscarClienteDeliveryPorTelefone,
  useCriarClienteDeliveryRapido,
  type MoradaTelefone,
  type EnderecoMorada,
} from '@/src/presentation/hooks/useMoradaTelefone'
import {
  useBuscarClientePorTelefone,
  useCriarClienteRapido,
} from '@/src/presentation/hooks/useClientes'
import {
  extrairDigitosTelefone,
  telefoneCelularBrCompleto,
} from '@/src/shared/utils/telefoneBr'
import { EnderecoPlacesAutocomplete } from '@/src/presentation/components/shared/geolocalizacao/EnderecoPlacesAutocomplete'
import {
  placeDetailsParaEnderecoGeocode,
  type PlaceDetailsResult,
} from '@/src/shared/utils/geolocalizacaoPlaces'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import type { EnderecoGeoCheckoutInput } from '@/src/application/dto/delivery-publico/EnderecoGeoCheckoutDTO'
import { enderecoTemGeolocalizacao } from '@/src/shared/utils/geolocalizacaoEnderecoShared'
import {
  MoradaEntregaGeoPanel,
  type MoradaEntregaGeoFormPatch,
} from '@/src/presentation/components/features/delivery/components/MoradaEntregaGeoPanel'

/** Snapshot mínimo do cliente encontrado / criado. */
interface ClienteEntrega {
  id: string
  nome: string
}

interface EntregaClienteSelectorProps {
  /** Morada atualmente selecionada */
  moradaSelecionada: MoradaTelefone | null
  onMoradaSelecionada: (morada: MoradaTelefone | null) => void
  /** Cliente vinculado (controlado pelo pai para persistir entre etapas). */
  clienteVinculado: ClienteEntrega | null
  onClienteVinculado: (cliente: ClienteEntrega | null) => void
  /** Duplo clique no campo nome com cliente já encontrado — abre o mesmo modal de edição da página de clientes. */
  onEditarClientePorDuploClique?: () => void
  /** Abre o seletor completo de clientes quando a busca por telefone não for possível. */
  onAbrirSeletorCliente?: () => void
  /**
   * Modo controlado: telefone exibido + últimos dígitos usados na busca (ex.: wizard com troca de etapa).
   * Se os quatro forem passados, o estado local de telefone não é usado.
   */
  telefoneExibicaoExterno?: string
  onTelefoneExibicaoExternoChange?: (valor: string) => void
  digitosUltimaBuscaExterno?: string | null
  onDigitosUltimaBuscaExternoChange?: (digitos: string | null) => void
  enderecoPadrao?: {
    cidade?: string
    estado?: string
  }
  mostrarEnderecos?: boolean
  /** Catálogo de moradas via módulo delivery (`/api/delivery/clientes`). */
  usarModuloDeliveryClientes?: boolean
}

interface FormNovasMorada {
  nomeMorada: string
  tipoEtiqueta: string
  cep: string
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  complemento: string
  referencia: string
}

const ETIQUETAS_MORADA = ['Casa', 'Trabalho', 'Outro'] as const
type TipoEtiquetaMorada = (typeof ETIQUETAS_MORADA)[number]

function normalizarTipoEtiqueta(valor: string | undefined | null): TipoEtiquetaMorada {
  const raw = String(valor ?? '').trim().toLowerCase()
  if (raw === 'trabalho') return 'Trabalho'
  if (raw === 'outro') return 'Outro'
  return 'Casa'
}

function nomePadraoMorada(tipoEtiqueta: TipoEtiquetaMorada): string {
  if (tipoEtiqueta === 'Casa') return 'Casa Principal'
  if (tipoEtiqueta === 'Trabalho') return 'Trabalho'
  return 'Outro'
}

const FORM_INICIAL: FormNovasMorada = {
  nomeMorada: 'Casa Principal',
  tipoEtiqueta: 'Casa',
  cep: '',
  rua: '',
  numero: '',
  bairro: '',
  cidade: '',
  estado: '',
  complemento: '',
  referencia: '',
}

function formInicialComEnderecoPadrao(
  enderecoPadrao?: EntregaClienteSelectorProps['enderecoPadrao']
): FormNovasMorada {
  return {
    ...FORM_INICIAL,
    cidade: enderecoPadrao?.cidade?.trim().toLocaleUpperCase('pt-BR') ?? '',
    estado: enderecoPadrao?.estado?.trim().toUpperCase().slice(0, 2) ?? '',
  }
}

/** Formata telefone para exibição: (XX) XXXXX-XXXX */
function formatarTelefoneExibicao(valor: string): string {
  const numeros = valor.replace(/\D/g, '')
  if (numeros.length <= 2) return numeros
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
  if (numeros.length <= 11)
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`
}

function telefoneMinimoParaBusca(usarModuloDeliveryClientes: boolean): number {
  return usarModuloDeliveryClientes ? 11 : 8
}

function moradaParaForm(m: MoradaTelefone): FormNovasMorada {
  const e = m.endereco
  const tipoEtiqueta = normalizarTipoEtiqueta(m.tipoEtiqueta)
  return {
    nomeMorada: m.nomeMorada ?? nomePadraoMorada(tipoEtiqueta),
    tipoEtiqueta,
    cep: e?.cep ? formatarCepMascara(e.cep) : '',
    rua: e?.rua ?? '',
    numero: e?.numero ?? '',
    bairro: e?.bairro ?? '',
    cidade: e?.cidade ?? '',
    estado: e?.estado ?? '',
    complemento: e?.complemento ?? '',
    referencia: e?.referencia ?? '',
  }
}

function MoradaCard({
  morada,
  selecionada,
  onSelecionar,
  onVerDetalhes,
  exigirGeo,
}: {
  morada: MoradaTelefone
  selecionada: boolean
  onSelecionar: () => void
  onVerDetalhes: () => void
  exigirGeo?: boolean
}) {
  const etiqueta = morada.tipoEtiqueta || morada.nomeMorada || 'Endereço'
  const e = morada.endereco
  const temGeo = e ? enderecoTemGeolocalizacao(e) : false
  const linhaResumo =
    e ?
      `${e.rua || '—'}, ${e.numero || '—'} — ${e.cidade || '—'}`
    : 'Endereço indisponível'
  return (
    <div
      className={`flex items-start justify-between gap-2 rounded-lg border-2 p-3 transition-colors ${
        selecionada
          ? 'border-primary bg-primary/5'
          : 'border-gray-200 bg-white hover:border-primary/40'
      }`}
    >
      <button
        type="button"
        className="flex flex-1 items-start gap-2 text-left"
        onClick={onSelecionar}
      >
        <MdLocationOn
          className={`mt-0.5 h-5 w-5 flex-shrink-0 ${selecionada ? 'text-primary' : 'text-gray-400'}`}
        />
        <div className="min-w-0">
          <p className={`text-sm font-semibold capitalize ${selecionada ? 'text-primary' : 'text-gray-800'}`}>
            {etiqueta}
          </p>
          <p className="truncate text-xs text-gray-500">{linhaResumo}</p>
          {exigirGeo ? (
            <p
              className={`mt-1 text-[11px] font-medium ${
                temGeo ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {temGeo ? 'Com geolocalização' : 'Sem pin — confirme no mapa'}
            </p>
          ) : null}
        </div>
      </button>

      <button
        type="button"
        onClick={onVerDetalhes}
        title="Editar endereço"
        className="flex-shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-primary/10 hover:text-primary"
      >
        <MdEdit className="h-4 w-4" />
      </button>
    </div>
  )
}

export function EntregaClienteSelector({
  moradaSelecionada,
  onMoradaSelecionada,
  clienteVinculado,
  onClienteVinculado,
  onEditarClientePorDuploClique,
  onAbrirSeletorCliente,
  telefoneExibicaoExterno,
  onTelefoneExibicaoExternoChange,
  digitosUltimaBuscaExterno,
  onDigitosUltimaBuscaExternoChange,
  enderecoPadrao,
  mostrarEnderecos = true,
  usarModuloDeliveryClientes = false,
}: EntregaClienteSelectorProps) {
  const telefoneControlado =
    telefoneExibicaoExterno !== undefined &&
    onTelefoneExibicaoExternoChange !== undefined &&
    digitosUltimaBuscaExterno !== undefined &&
    onDigitosUltimaBuscaExternoChange !== undefined

  const [telefoneInputLocal, setTelefoneInputLocal] = useState('')
  const [telefoneBuscadoLocal, setTelefoneBuscadoLocal] = useState<string | null>(null)

  const telefoneInput = telefoneControlado ? telefoneExibicaoExterno! : telefoneInputLocal
  const setTelefoneInput = telefoneControlado
    ? onTelefoneExibicaoExternoChange!
    : setTelefoneInputLocal
  const telefoneBuscado = telefoneControlado ? digitosUltimaBuscaExterno! : telefoneBuscadoLocal
  const setTelefoneBuscado = telefoneControlado
    ? onDigitosUltimaBuscaExternoChange!
    : setTelefoneBuscadoLocal

  /** Nome digitado pelo usuário quando o cliente não existe (para pré-preencher o painel de cadastro). */
  const [nomeDigitado, setNomeDigitado] = useState('')
  /** `true` após busca sem resultado — exibe opção "Cadastrar cliente". */
  const [clienteNaoEncontrado, setClienteNaoEncontrado] = useState(false)
  /** Cliente delivery localizado via `GET /delivery/clientes/{telefone}`. */
  const [clienteDeliveryEncontrado, setClienteDeliveryEncontrado] = useState(false)
  /** Painel lateral de cadastro rápido de cliente. */
  const [painelClienteAberto, setPainelClienteAberto] = useState(false)
  /** Nome no formulário de cadastro rápido (separado do campo de busca). */
  const [nomeNovoCliente, setNomeNovoCliente] = useState('')
  /** `null` = modo criar; definido = modo editar */
  const [moradaEditando, setMoradaEditando] = useState<MoradaTelefone | null>(null)
  const [painelMoradaAberto, setPainelMoradaAberto] = useState(false)
  const [formNova, setFormNova] = useState<FormNovasMorada>(FORM_INICIAL)
  const [isLoadingCep, setIsLoadingCep] = useState(false)
  const [buscaPlacesMorada, setBuscaPlacesMorada] = useState('')
  /** Legado (não delivery): geo só via Places simples. */
  const [moradaGeo, setMoradaGeo] = useState<{
    enderecoLocalizacao: GeoJsonPoint
    providerEnderecoId: string
  } | null>(null)
  /** Delivery: sessão do painel de geo + estado reportado pelo MoradaEntregaGeoPanel. */
  const [geoPanelSession, setGeoPanelSession] = useState(0)
  const [forcarBackfillGeo, setForcarBackfillGeo] = useState(false)
  const [geoPanelState, setGeoPanelState] = useState<{
    podeSalvar: boolean
    geo: EnderecoGeoCheckoutInput | null
  }>({ podeSalvar: false, geo: null })

  const telefoneInputRef = useRef<HTMLInputElement>(null)

  // Foca o campo de telefone ao montar (ex.: ao entrar na step de informações do pedido).
  useEffect(() => {
    const id = setTimeout(() => telefoneInputRef.current?.focus(), 100)
    return () => clearTimeout(id)
  }, [])

  const moradaHookOptions = { usarModuloDelivery: usarModuloDeliveryClientes }

  const { data: moradas, isLoading: buscando, isError: erroMoradas, error: erroMoradasMsg } =
    useMoradasPorTelefone(telefoneBuscado, moradaHookOptions)
  const criarMorada = useCriarMoradaTelefone(moradaHookOptions)
  const atualizarMorada = useAtualizarMoradaTelefone(moradaHookOptions)
  const registrarUsoMorada = useRegistrarUsoMoradaTelefone(moradaHookOptions)
  const buscarCliente = useBuscarClientePorTelefone()
  const buscarClienteDelivery = useBuscarClienteDeliveryPorTelefone()
  const criarCliente = useCriarClienteRapido()
  const criarClienteDelivery = useCriarClienteDeliveryRapido()

  useEffect(() => {
    if (!erroMoradas || !erroMoradasMsg) return
    showToast.error(
      erroMoradasMsg instanceof Error ? erroMoradasMsg.message : 'Erro ao buscar endereços'
    )
  }, [erroMoradas, erroMoradasMsg])

  /**
   * Atualiza a morada no estado do pai e regista uso na API para ordenar como mais recente.
   * `telefoneDigitosOverride` — após criar morada o estado `telefoneBuscado` pode ainda não refletir os dígitos.
   */
  const definirMoradaSelecionada = useCallback(
    (morada: MoradaTelefone | null, telefoneDigitosOverride?: string | null) => {
      onMoradaSelecionada(morada)
      if (!morada) return
      const tel = telefoneDigitosOverride ?? telefoneBuscado
      if (tel) {
        registrarUsoMorada.mutate({ id: morada.id, telefoneDigitos: tel })
      }
    },
    [onMoradaSelecionada, telefoneBuscado, registrarUsoMorada]
  )

  const podeGerenciarEnderecos =
    Boolean(clienteVinculado?.id?.trim()) ||
    (usarModuloDeliveryClientes && clienteDeliveryEncontrado)

  const resetGeoPainelState = useCallback(() => {
    setBuscaPlacesMorada('')
    setMoradaGeo(null)
    setForcarBackfillGeo(false)
    setGeoPanelState({ podeSalvar: false, geo: null })
    setGeoPanelSession(s => s + 1)
  }, [])

  const abrirPainelNovo = useCallback(() => {
    if (!podeGerenciarEnderecos) {
      showToast.warning('Cadastre o cliente antes de adicionar um endereço.')
      return
    }
    setMoradaEditando(null)
    setFormNova(formInicialComEnderecoPadrao(enderecoPadrao))
    resetGeoPainelState()
    setPainelMoradaAberto(true)
  }, [podeGerenciarEnderecos, enderecoPadrao, resetGeoPainelState])

  const abrirPainelEditar = useCallback(
    (m: MoradaTelefone, opts?: { forcarBackfill?: boolean }) => {
      if (!podeGerenciarEnderecos) {
        showToast.warning('Cadastre o cliente antes de editar o endereço.')
        return
      }
      setMoradaEditando(m)
      setFormNova(moradaParaForm(m))
      setBuscaPlacesMorada('')
      setMoradaGeo(null)
      const precisaBackfill =
        Boolean(opts?.forcarBackfill) ||
        (usarModuloDeliveryClientes && !(m.endereco && enderecoTemGeolocalizacao(m.endereco)))
      setForcarBackfillGeo(precisaBackfill)
      setGeoPanelState({ podeSalvar: false, geo: null })
      setGeoPanelSession(s => s + 1)
      setPainelMoradaAberto(true)
    },
    [podeGerenciarEnderecos, usarModuloDeliveryClientes]
  )

  const fecharPainelMorada = useCallback(() => {
    setPainelMoradaAberto(false)
    setMoradaEditando(null)
    setFormNova(formInicialComEnderecoPadrao(enderecoPadrao))
    setBuscaPlacesMorada('')
    setMoradaGeo(null)
    setForcarBackfillGeo(false)
    setGeoPanelState({ podeSalvar: false, geo: null })
  }, [enderecoPadrao])

  const tentarSelecionarMorada = useCallback(
    (morada: MoradaTelefone, telefoneDigitosOverride?: string | null) => {
      if (
        usarModuloDeliveryClientes &&
        !(morada.endereco && enderecoTemGeolocalizacao(morada.endereco))
      ) {
        showToast.warning('Confirme a localização no mapa antes de usar este endereço.')
        abrirPainelEditar(morada, { forcarBackfill: true })
        return
      }
      definirMoradaSelecionada(morada, telefoneDigitosOverride)
    },
    [usarModuloDeliveryClientes, abrirPainelEditar, definirMoradaSelecionada]
  )
  const handleBuscar = useCallback(async (telefoneOverride?: string) => {
    const digitos = extrairDigitosTelefone(telefoneOverride ?? telefoneInput)
    const minDigitos = telefoneMinimoParaBusca(usarModuloDeliveryClientes)

    if (digitos.length < minDigitos) {
      if (usarModuloDeliveryClientes) {
        showToast.warning('Informe o celular completo com DDD (11 dígitos).')
      } else {
        onAbrirSeletorCliente?.()
      }
      return
    }

    setClienteNaoEncontrado(false)
    setClienteDeliveryEncontrado(false)
    onClienteVinculado(null)
    onMoradaSelecionada(null)

    if (usarModuloDeliveryClientes) {
      setTelefoneBuscado(digitos)
      try {
        const delivery = await buscarClienteDelivery.mutateAsync(digitos)
        if (delivery) {
          setClienteDeliveryEncontrado(true)
          const nomeDelivery = delivery.nome?.trim() || nomeDigitado.trim() || 'Cliente'
          if (delivery.clienteIdVinculado?.trim()) {
            onClienteVinculado({
              id: delivery.clienteIdVinculado.trim(),
              nome: nomeDelivery,
            })
          } else {
            onClienteVinculado({ id: '', nome: nomeDelivery })
          }
          return
        }

        const clienteErp = await buscarCliente.mutateAsync(digitos)
        if (clienteErp) {
          onClienteVinculado({ id: clienteErp.getId(), nome: clienteErp.getNome() })
          return
        }

        setClienteNaoEncontrado(true)
      } catch {
        setClienteNaoEncontrado(true)
      }
      return
    }

    setTelefoneBuscado(digitos)

    try {
      const cliente = await buscarCliente.mutateAsync(digitos)
      if (cliente) {
        onClienteVinculado({ id: cliente.getId(), nome: cliente.getNome() })
      } else {
        setClienteNaoEncontrado(true)
      }
    } catch {
      setClienteNaoEncontrado(true)
    }
  }, [
    telefoneInput,
    usarModuloDeliveryClientes,
    nomeDigitado,
    buscarCliente,
    buscarClienteDelivery,
    onClienteVinculado,
    onMoradaSelecionada,
    setTelefoneBuscado,
    onAbrirSeletorCliente,
  ])

  const handleTelefoneKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        void handleBuscar()
      }
    },
    [handleBuscar]
  )

  /** Ao sair do campo de telefone, busca o cliente automaticamente (telefone completo e ainda não buscado). */
  const handleTelefoneBlur = useCallback(() => {
    const digitos = extrairDigitosTelefone(telefoneInput)
    const minDigitos = telefoneMinimoParaBusca(usarModuloDeliveryClientes)
    if (digitos.length >= minDigitos && digitos !== telefoneBuscado) {
      void handleBuscar()
    }
  }, [telefoneInput, telefoneBuscado, handleBuscar, usarModuloDeliveryClientes])

  const handleFormChange = useCallback(
    (campo: keyof FormNovasMorada, valor: string) => {
      setFormNova(prev => ({ ...prev, [campo]: valor }))
    },
    []
  )

  const handleTipoEtiquetaChange = useCallback((valor: string) => {
    const tipoEtiqueta = normalizarTipoEtiqueta(valor)
    setFormNova(prev => ({
      ...prev,
      tipoEtiqueta,
      nomeMorada:
        prev.nomeMorada.trim() === '' ||
        ETIQUETAS_MORADA.some(etiqueta => prev.nomeMorada === nomePadraoMorada(etiqueta))
          ? nomePadraoMorada(tipoEtiqueta)
          : prev.nomeMorada,
    }))
  }, [])

  const handleCepInputChange = useCallback((valor: string) => {
    setFormNova(prev => ({ ...prev, cep: formatarCepMascara(valor) }))
  }, [])

  const aplicarEnderecoDoCep = useCallback((dados: ViaCepEnderecoNormalizado) => {
    setFormNova(prev => ({
      ...prev,
      cep: formatarCepMascara(dados.cep),
      rua: dados.logradouro ? dados.logradouro.toLocaleUpperCase('pt-BR') : prev.rua,
      bairro: dados.bairro ? dados.bairro.toLocaleUpperCase('pt-BR') : prev.bairro,
      cidade: dados.localidade ? dados.localidade.toLocaleUpperCase('pt-BR') : prev.cidade,
      estado: dados.uf ? dados.uf.toUpperCase().slice(0, 2) : prev.estado,
      complemento:
        dados.complemento ? dados.complemento.toLocaleUpperCase('pt-BR') : prev.complemento,
    }))
  }, [])

  const handleBuscarCep = useCallback(async () => {
    const digitos = normalizarDigitosCep(formNova.cep)
    if (digitos.length !== 8) {
      showToast.warning('CEP inválido. Informe 8 dígitos.')
      return
    }

    setIsLoadingCep(true)
    try {
      const dados = await consultarCepViaApi(digitos)
      aplicarEnderecoDoCep(dados)
      showToast.success('Endereço encontrado pelo CEP.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao consultar CEP'
      showToast.error(msg)
    } finally {
      setIsLoadingCep(false)
    }
  }, [formNova.cep, aplicarEnderecoDoCep])

  const handleSalvarMorada = useCallback(async () => {
    if (!podeGerenciarEnderecos) {
      showToast.warning('Cadastre o cliente antes de salvar o endereço.')
      return
    }

    const digitos = extrairDigitosTelefone(telefoneInput)
    const nomeMoradaTrim = formNova.nomeMorada.trim()
    if (!digitos || !nomeMoradaTrim || !formNova.rua || !formNova.numero || !formNova.cidade || !formNova.estado) {
      if (digitos && !nomeMoradaTrim) {
        showToast.warning('Informe o nome da morada.')
      }
      return
    }

    const cepDigits = normalizarDigitosCep(formNova.cep)
    if (cepDigits.length > 0 && cepDigits.length !== 8) {
      showToast.warning('Informe um CEP válido com 8 dígitos ou deixe o campo em branco.')
      return
    }

    const uf = formNova.estado.trim().toUpperCase().slice(0, 2)
    if (uf.length !== 2) {
      showToast.warning('Informe a UF com 2 letras.')
      return
    }

    const geoDelivery = usarModuloDeliveryClientes ? geoPanelState.geo : null
    if (usarModuloDeliveryClientes) {
      if (!geoPanelState.podeSalvar || !geoDelivery) {
        showToast.warning(
          'Defina a localização do endereço (Google, GPS ou confirme o pin no mapa) antes de salvar.'
        )
        return
      }
    }

    const endereco: EnderecoMorada = {
      cep: cepDigits,
      rua: formNova.rua.trim(),
      numero: formNova.numero.trim(),
      bairro: formNova.bairro.trim(),
      cidade: formNova.cidade.trim(),
      estado: uf,
      complemento: formNova.complemento.trim() || undefined,
      referencia: formNova.referencia.trim() || undefined,
      ...(geoDelivery
        ? {
            enderecoLocalizacao: geoDelivery.enderecoLocalizacao,
            providerEnderecoId: geoDelivery.providerEnderecoId ?? null,
            ...(geoDelivery.preferenciaEntrega
              ? { preferenciaEntrega: geoDelivery.preferenciaEntrega }
              : {}),
          }
        : moradaGeo
          ? {
              enderecoLocalizacao: moradaGeo.enderecoLocalizacao,
              providerEnderecoId: moradaGeo.providerEnderecoId,
            }
          : {}),
    }

    const dto = {
      telefone: digitos,
      tipoEtiqueta: formNova.tipoEtiqueta.toLowerCase(),
      nomeMorada: nomeMoradaTrim,
      endereco,
    }

    if (moradaEditando) {
      const atualizada = await atualizarMorada.mutateAsync({
        id: moradaEditando.id,
        dto,
      })
      fecharPainelMorada()
      setTelefoneBuscado(digitos)
      definirMoradaSelecionada(atualizada, digitos)
      return
    }

    const nova = await criarMorada.mutateAsync(dto)
    fecharPainelMorada()
    setTelefoneBuscado(digitos)
    definirMoradaSelecionada(nova, digitos)
  }, [
    podeGerenciarEnderecos,
    telefoneInput,
    formNova,
    moradaEditando,
    criarMorada,
    atualizarMorada,
    fecharPainelMorada,
    definirMoradaSelecionada,
    setTelefoneBuscado,
    moradaGeo,
    usarModuloDeliveryClientes,
    geoPanelState,
  ])

  const handleSalvarClienteRapido = useCallback(async () => {
    const nome = nomeNovoCliente.trim()
    if (!nome) {
      showToast.warning('Informe o nome do cliente.')
      return
    }
    const digitos = extrairDigitosTelefone(telefoneInput)
    if (usarModuloDeliveryClientes && !telefoneCelularBrCompleto(digitos)) {
      showToast.warning('Informe o celular completo com DDD (11 dígitos).')
      return
    }
    try {
      const novo = await criarCliente.mutateAsync({ nome, telefone: digitos })
      if (usarModuloDeliveryClientes) {
        await criarClienteDelivery.mutateAsync({ telefone: digitos, nome })
        setClienteDeliveryEncontrado(true)
        setTelefoneBuscado(digitos)
      }
      onClienteVinculado({ id: novo.getId(), nome: novo.getNome() })
      setClienteNaoEncontrado(false)
      setPainelClienteAberto(false)
      setNomeNovoCliente('')
      showToast.success('Cliente cadastrado com sucesso!')
    } catch {
      /* erro exibido pelo hook */
    }
  }, [
    nomeNovoCliente,
    telefoneInput,
    usarModuloDeliveryClientes,
    criarCliente,
    criarClienteDelivery,
    onClienteVinculado,
    setTelefoneBuscado,
  ])

  const handleAbrirPainelCliente = useCallback(() => {
    setNomeNovoCliente(nomeDigitado.trim())
    setPainelClienteAberto(true)
  }, [nomeDigitado])

  const moradasEncontradas = moradas ?? []
  const buscaRealizada =
    telefoneBuscado !== null || clienteVinculado !== null || clienteDeliveryEncontrado
  const buscandoCliente = buscarCliente.isPending || buscarClienteDelivery.isPending
  const clienteCadastrado = podeGerenciarEnderecos

  useEffect(() => {
    if (!mostrarEnderecos || !clienteCadastrado || moradaSelecionada || moradasEncontradas.length === 0) {
      return
    }
    const primeira = moradasEncontradas[0]
    if (
      usarModuloDeliveryClientes &&
      !(primeira.endereco && enderecoTemGeolocalizacao(primeira.endereco))
    ) {
      // Não auto-seleciona nem abre o painel em loop — o usuário escolhe e confirma o pin.
      return
    }
    definirMoradaSelecionada(primeira)
  }, [
    mostrarEnderecos,
    clienteCadastrado,
    moradaSelecionada,
    moradasEncontradas,
    usarModuloDeliveryClientes,
    definirMoradaSelecionada,
  ])

  return (
    <div className="relative space-y-3">
      {/* Bloqueia a área enquanto busca o cliente/endereços, garantindo o carregamento completo. */}
      {(buscando || buscandoCliente) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-white/70 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-md ring-1 ring-primary/10">
            <JiffyLoading size={20} className="gap-0 py-0" />
            <span className="text-sm font-medium text-primary">Buscando cliente...</span>
          </div>
        </div>
      )}

      {/* Antes da validação: só telefone (linha inteira). Depois: nome à esquerda, telefone à direita */}
      <div className={buscaRealizada ? 'grid grid-cols-2 gap-2' : 'block'}>
        {/* Nome do cliente — só aparece após a validação do telefone (coluna esquerda) */}
        {buscaRealizada && (
          <div>
            <Label className="mb-1 block text-sm font-medium text-gray-700">Nome do cliente</Label>
            <div className="relative">
              <MdPerson
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                type="text"
                value={
                  clienteVinculado
                    ? clienteVinculado.nome
                    : nomeDigitado
                }
                onChange={e => {
                  if (clienteVinculado) {
                    onClienteVinculado(null)
                    setClienteNaoEncontrado(false)
                  }
                  setNomeDigitado(e.target.value)
                }}
                readOnly={!!clienteVinculado}
                placeholder="Ex.: João Silva"
                autoFocus
                title={
                  clienteVinculado?.id
                    ? 'Clique para editar o cadastro do cliente.'
                    : undefined
                }
                className={`w-full rounded-md border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-0 ${
                  clienteVinculado
                    ? 'cursor-pointer select-none border-green-400 bg-green-50 text-green-800'
                    : 'border-primary/30 bg-white'
                }`}
                onMouseDown={e => {
                  /** Evita seleção de palavra ao abrir edição de cliente pelo campo readOnly. */
                  if (clienteVinculado?.id && e.detail >= 2) {
                    e.preventDefault()
                  }
                }}
                onClick={e => {
                  if (clienteVinculado?.id) {
                    e.preventDefault()
                    onEditarClientePorDuploClique?.()
                  }
                }}
                onDoubleClick={e => {
                  if (clienteVinculado?.id) {
                    e.preventDefault()
                    onEditarClientePorDuploClique?.()
                  } else {
                    showToast.info(
                      'Valide o telefone e localize um cliente cadastrado para editar o cadastro.'
                    )
                  }
                }}
              />
            </div>
            {clienteCadastrado && (
              <p className="mt-1 flex items-center gap-1 text-xs text-green-700">
                <MdCheckCircle className="h-3.5 w-3.5" />
                Cliente encontrado
              </p>
            )}
            {clienteNaoEncontrado && !clienteVinculado && (
              <p className="mt-1 text-xs text-secondary">
                Cliente não encontrado.{' '}
                <button
                  type="button"
                  className="font-semibold text-secondary underline"
                  onClick={handleAbrirPainelCliente}
                >
                  Cadastrar
                </button>
              </p>
            )}
          </div>
        )}

        {/* Telefone + busca — linha inteira antes da validação; coluna direita depois */}
        <div className={buscaRealizada ? '' : 'w-full'}>
          <Label className="mb-1 block text-sm font-medium text-gray-700">
            Telefone do cliente
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MdPhone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={telefoneInputRef}
                type="tel"
                value={telefoneInput}
                onChange={e => {
                  const formatado = formatarTelefoneExibicao(e.target.value)
                  setTelefoneInput(formatado)

                  const digitos = extrairDigitosTelefone(formatado)
                  // Número completo (celular com 11 dígitos): busca automática ao finalizar a digitação.
                  if (digitos.length === 11) {
                    if (digitos !== telefoneBuscado) void handleBuscar(formatado)
                    return
                  }

                  if (telefoneBuscado !== null) {
                    setTelefoneBuscado(null)
                    onMoradaSelecionada(null)
                    onClienteVinculado(null)
                    setClienteNaoEncontrado(false)
                  }
                }}
                onKeyDown={handleTelefoneKeyDown}
                onBlur={handleTelefoneBlur}
                placeholder="(00) 00000-0000"
                maxLength={15}
                className="w-full rounded-md border border-primary/30 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-0"
              />
            </div>
            <Button
              type="button"
              variant="outlined"
              onClick={() => void handleBuscar()}
              disabled={
                (!onAbrirSeletorCliente && extrairDigitosTelefone(telefoneInput).length < 8) ||
                buscando ||
                buscandoCliente
              }
              className="flex-shrink-0 border-primary/30 hover:bg-primary/10"
              title="Buscar cliente e endereços"
            >
              {buscando || buscandoCliente ? (
                <JiffyLoading size={20} className="gap-0 py-0" />
              ) : (
                <MdSearch className="h-4 w-4 text-primary" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Resultado da busca — endereços só após cliente cadastrado/vinculado */}
      {mostrarEnderecos && telefoneBuscado !== null && !buscando && (
        <div className="space-y-2">
          {clienteCadastrado && moradasEncontradas.length > 0 ? (
            <>
              <p className="text-xs font-medium text-gray-500">
                {moradasEncontradas.length} endereço{moradasEncontradas.length !== 1 ? 's' : ''} encontrado{moradasEncontradas.length !== 1 ? 's' : ''}
              </p>
              {moradasEncontradas.map(morada => (
                <MoradaCard
                  key={morada.id}
                  morada={morada}
                  selecionada={moradaSelecionada?.id === morada.id}
                  onSelecionar={() => tentarSelecionarMorada(morada)}
                  onVerDetalhes={() => abrirPainelEditar(morada)}
                  exigirGeo={usarModuloDeliveryClientes}
                />
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-6 text-center">
              <MdAddLocation className="h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">
                {clienteCadastrado
                  ? 'Nenhum endereço cadastrado para este cliente.'
                  : 'Cadastre o cliente antes de adicionar endereços de entrega.'}
              </p>
              <Button
                type="button"
                variant="outlined"
                onClick={() => abrirPainelNovo()}
                disabled={!clienteCadastrado}
                className="mt-1 border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-50"
                title={
                  clienteCadastrado
                    ? 'Adicionar endereço de entrega'
                    : 'Cadastre o cliente antes de adicionar um endereço'
                }
              >
                <MdAddLocation className="mr-1.5 h-4 w-4" />
                Adicionar endereço
              </Button>
            </div>
          )}

          {clienteCadastrado && moradasEncontradas.length > 0 && (
            <button
              type="button"
              onClick={() => abrirPainelNovo()}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/30 py-2 text-xs text-primary hover:bg-primary/5"
            >
              <MdAddLocation className="h-4 w-4" />
              Adicionar novo endereço
            </button>
          )}
        </div>
      )}

      {/* Painel lateral: cadastro rápido de cliente */}
      <JiffySidePanelModal
        open={painelClienteAberto}
        onClose={() => {
          setPainelClienteAberto(false)
          setNomeNovoCliente('')
        }}
        title="Cadastrar cliente"
        zIndex={1600}
        panelClassName="w-[min(36rem,94vw)] sm:w-[min(38rem,90vw)]"
        footerVariant="bar"
        footerActions={{
          showSave: true,
          saveLabel: 'Salvar cliente',
          saveLoading: criarCliente.isPending,
          saveDisabled: criarCliente.isPending || !nomeNovoCliente.trim(),
          onSave: handleSalvarClienteRapido,
          showCancel: true,
          cancelLabel: 'Cancelar',
          onCancel: () => {
            setPainelClienteAberto(false)
            setNomeNovoCliente('')
          },
        }}
      >
        <div className="space-y-4 px-4 py-4 text-sm">
          <div>
            <Label className="mb-1 block text-xs font-medium text-gray-600">
              Nome do cliente <span className="text-red-500">*</span>
            </Label>
            <input
              value={nomeNovoCliente}
              onChange={e => setNomeNovoCliente(e.target.value)}
              placeholder="Ex.: João Silva"
              autoFocus
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium text-gray-600">Telefone</Label>
            <div className="relative">
              <MdPhone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={telefoneInput}
                readOnly
                className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-500"
              />
            </div>
            <p className="mt-0.5 text-xs text-gray-400">Preenchido automaticamente pelo número digitado.</p>
          </div>
        </div>
      </JiffySidePanelModal>

      {/* Painel lateral: novo ou editar morada */}
      <JiffySidePanelModal
        open={painelMoradaAberto}
        onClose={fecharPainelMorada}
        title={
          moradaEditando ? 'Editar endereço de entrega' : 'Novo endereço de entrega'
        }
        zIndex={1500}
        panelClassName="w-[min(40rem,94vw)] sm:w-[min(42rem,90vw)]"
        footerVariant="bar"
        footerActions={{
          showSave: true,
          saveLabel: moradaEditando
            ? forcarBackfillGeo
              ? 'Confirmar localização'
              : 'Salvar alterações'
            : 'Salvar endereço',
          saveLoading: criarMorada.isPending || atualizarMorada.isPending,
          saveDisabled:
            criarMorada.isPending ||
            atualizarMorada.isPending ||
            !formNova.nomeMorada.trim() ||
            !formNova.rua ||
            !formNova.numero ||
            !formNova.cidade ||
            !formNova.estado ||
            (usarModuloDeliveryClientes && !geoPanelState.podeSalvar),
          onSave: handleSalvarMorada,
          showCancel: true,
          cancelLabel: 'Cancelar',
          onCancel: fecharPainelMorada,
        }}
      >
        <div className="space-y-4 px-4 py-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-medium text-gray-600">Etiqueta</Label>
              <select
                value={formNova.tipoEtiqueta}
                onChange={e => handleTipoEtiquetaChange(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {ETIQUETAS_MORADA.map(etiqueta => (
                  <option key={etiqueta} value={etiqueta}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-gray-600">CEP</Label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={formNova.cep}
                  onChange={e => handleCepInputChange(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                  className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => void handleBuscarCep()}
                  disabled={isLoadingCep || normalizarDigitosCep(formNova.cep).length !== 8}
                  className="flex-shrink-0 border-primary/30 hover:bg-primary/10"
                  title="Buscar endereço pelo CEP"
                  aria-label="Buscar endereço pelo CEP"
                >
                  {isLoadingCep ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <MdSearch className="h-4 w-4 text-primary" />
                  )}
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                Opcional. Use a lupa apenas se quiser preencher o endereço pelo CEP.
              </p>
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-medium text-gray-600">
              Nome da morada <span className="text-red-500">*</span>
            </Label>
            <input
              value={formNova.nomeMorada}
              onChange={e => handleFormChange('nomeMorada', e.target.value)}
              placeholder="Ex.: Casa principal, Apartamento 301..."
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoComplete="off"
            />
          </div>

          <div>
            {usarModuloDeliveryClientes ? (
              <MoradaEntregaGeoPanel
                sessionKey={`${geoPanelSession}-${moradaEditando?.id ?? 'new'}`}
                form={{
                  rua: formNova.rua,
                  numero: formNova.numero,
                  bairro: formNova.bairro,
                  cidade: formNova.cidade,
                  estado: formNova.estado,
                  cep: formNova.cep,
                  complemento: formNova.complemento,
                }}
                onFormPatch={(patch: MoradaEntregaGeoFormPatch) => {
                  setFormNova(prev => ({
                    ...prev,
                    ...patch,
                  }))
                }}
                initialGeo={
                  moradaEditando?.endereco
                    ? {
                        enderecoLocalizacao: moradaEditando.endereco.enderecoLocalizacao,
                        preferenciaEntrega: moradaEditando.endereco.preferenciaEntrega,
                        providerEnderecoId: moradaEditando.endereco.providerEnderecoId,
                      }
                    : null
                }
                forcarModoManual={forcarBackfillGeo}
                disabled={criarMorada.isPending || atualizarMorada.isPending}
                onGeoStateChange={setGeoPanelState}
              />
            ) : (
              <EnderecoPlacesAutocomplete
                variant="gestor"
                floatingLabel={false}
                label="Buscar endereço no Google"
                placeholder="Digite rua, bairro ou cidade…"
                value={buscaPlacesMorada}
                onChange={setBuscaPlacesMorada}
                onSelect={(place: PlaceDetailsResult) => {
                  const fields = placeDetailsParaEnderecoGeocode(place)
                  setFormNova(prev => ({
                    ...prev,
                    ...(fields.rua ? { rua: fields.rua.toLocaleUpperCase('pt-BR') } : {}),
                    ...(fields.numero ? { numero: fields.numero } : {}),
                    ...(fields.bairro ? { bairro: fields.bairro.toLocaleUpperCase('pt-BR') } : {}),
                    ...(fields.cidade ? { cidade: fields.cidade.toLocaleUpperCase('pt-BR') } : {}),
                    ...(fields.estado ? { estado: fields.estado.toUpperCase().slice(0, 2) } : {}),
                    ...(fields.cep ? { cep: formatarCepMascara(fields.cep) } : {}),
                  }))
                  setMoradaGeo({
                    enderecoLocalizacao: place.enderecoLocalizacao,
                    providerEnderecoId: place.providerEnderecoId,
                  })
                  setBuscaPlacesMorada(
                    [fields.rua, fields.numero].filter(Boolean).join(', ') ||
                      place.enderecoFormatado ||
                      ''
                  )
                  showToast.success('Endereço aplicado a partir da sugestão do Google.')
                }}
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="mb-1 block text-xs font-medium text-gray-600">
                Rua / Logradouro <span className="text-red-500">*</span>
              </Label>
              <input
                value={formNova.rua}
                onChange={e => {
                  handleFormChange('rua', e.target.value)
                  if (!usarModuloDeliveryClientes) {
                    setMoradaGeo(null)
                  }
                }}
                placeholder="Rua das Flores"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-gray-600">
                Nº <span className="text-red-500">*</span>
              </Label>
              <input
                value={formNova.numero}
                onChange={e => handleFormChange('numero', e.target.value)}
                placeholder="100"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-medium text-gray-600">Bairro</Label>
            <input
              value={formNova.bairro}
              onChange={e => handleFormChange('bairro', e.target.value)}
              placeholder="Centro"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="mb-1 block text-xs font-medium text-gray-600">
                Cidade <span className="text-red-500">*</span>
              </Label>
              <input
                value={formNova.cidade}
                onChange={e => handleFormChange('cidade', e.target.value)}
                placeholder="São Paulo"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-gray-600">
                UF <span className="text-red-500">*</span>
              </Label>
              <input
                value={formNova.estado}
                onChange={e => handleFormChange('estado', e.target.value.toUpperCase())}
                placeholder="SP"
                maxLength={2}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-medium text-gray-600">Complemento</Label>
            <input
              value={formNova.complemento}
              onChange={e => handleFormChange('complemento', e.target.value)}
              placeholder="Apto 2, Bloco B..."
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <Label className="mb-1 block text-xs font-medium text-gray-600">Referência</Label>
            <input
              value={formNova.referencia}
              onChange={e => handleFormChange('referencia', e.target.value)}
              placeholder="Próximo ao mercado..."
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      </JiffySidePanelModal>
    </div>
  )
}

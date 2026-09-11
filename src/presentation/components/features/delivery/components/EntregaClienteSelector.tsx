'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { MdSearch, MdAddLocation, MdEdit, MdDelete, MdLocationOn, MdPhone, MdPerson, MdCheckCircle } from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { Label } from '@/src/presentation/components/ui/label'
import { showToast } from '@/src/shared/utils/toast'
import {
  consultarCepViaApi,
  formatarCepMascara,
  normalizarDigitosCep,
} from '@/src/shared/utils/consultaCep'
import { maiusculasEnderecoInput } from '@/src/shared/utils/normalizarTextoEnderecoPublico'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { JiffyConfirmDialog } from '@/src/presentation/components/ui/jiffy-confirm-dialog'
import {
  useMoradasPorTelefone,
  useCriarMoradaTelefone,
  useAtualizarMoradaTelefone,
  useExcluirMoradaTelefone,
  useRegistrarUsoMoradaTelefone,
  useCriarClienteDeliveryRapido,
  useGeoEmpresaEntrega,
} from '@/src/presentation/hooks/useMoradaTelefone'
import type { MoradaTelefone, EnderecoMorada } from '@/src/domain/types/moradaEntrega'
import {
  useBuscarClientePorTelefone,
  useCriarClienteRapido,
  useAtualizarNomeCliente,
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
import { enderecoTemGeolocalizacao } from '@/src/shared/utils/geolocalizacaoEnderecoShared'
import { resolverGeoMoradaDeliveryGestor } from '@/src/shared/utils/resolverGeoMoradaDeliveryGestor'
import {
  clienteCadastradoNestaEmpresa,
  ETIQUETAS_MORADA_ENTREGA,
  nomePadraoMoradaEntrega,
  normalizarTipoEtiquetaMorada,
  podeExibirEnderecosClienteEntrega,
  telefoneMinimoDigitosBuscaEntrega,
} from '@/src/domain/policies/pedido/ClienteEntregaPolicy'

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
  /** Clique no lápis — abre o modal de cadastro completo do cliente. */
  onAbrirCadastroCliente?: () => void
  /** @deprecated Use onAbrirCadastroCliente */
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
  /**
   * Tempo previsto escolhido no formulário (minutos).
   * No card selecionado, sobrescreve o tempo sugerido pela área/raio.
   */
  tempoPrevistoMinutos?: number | null
  /**
   * Status de cobertura da morada selecionada (delivery).
   * `null` = sem seleção / não aplicável.
   */
  onCoberturaMoradaSelecionadaChange?: (
    status: CoberturaMoradaSelecionadaStatus
  ) => void
}

export type CoberturaMoradaSelecionadaStatus =
  | { status: 'null' }
  | { status: 'sem_geo' }
  | { status: 'loading' }
  | { status: 'fora' }
  | { status: 'coberta'; moradaId: string; valorTaxa: number; tempoEntregaInMinutes: number }
  | { status: 'erro' }

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

const CAMPOS_ENDERECO_MAIUSCULA: ReadonlySet<keyof FormNovasMorada> = new Set([
  'rua',
  'numero',
  'bairro',
  'cidade',
  'estado',
  'complemento',
  'referencia',
])

function paraMaiusculaEndereco(valor: string): string {
  return valor.toLocaleUpperCase('pt-BR')
}

function moradaParaForm(m: MoradaTelefone): FormNovasMorada {
  const e = m.endereco
  const tipoEtiqueta = normalizarTipoEtiquetaMorada(m.tipoEtiqueta)
  return {
    nomeMorada: m.nomeMorada ?? nomePadraoMoradaEntrega(tipoEtiqueta),
    tipoEtiqueta,
    cep: e?.cep ? formatarCepMascara(e.cep) : '',
    rua: e?.rua ? paraMaiusculaEndereco(e.rua) : '',
    numero: e?.numero ? paraMaiusculaEndereco(e.numero) : '',
    bairro: e?.bairro ? paraMaiusculaEndereco(e.bairro) : '',
    cidade: e?.cidade ? paraMaiusculaEndereco(e.cidade) : '',
    estado: e?.estado ? e.estado.toUpperCase().slice(0, 2) : '',
    complemento: e?.complemento ? paraMaiusculaEndereco(e.complemento) : '',
    referencia: e?.referencia ? paraMaiusculaEndereco(e.referencia) : '',
  }
}

function MoradaCard({
  morada,
  selecionada,
  onSelecionar,
  onVerDetalhes,
  onRemover,
  localizando,
  exigirGeo,
  tempoPrevistoOverrideMinutos,
}: {
  morada: MoradaTelefone
  selecionada: boolean
  onSelecionar: () => void
  onVerDetalhes: () => void
  onRemover: () => void
  localizando?: boolean
  exigirGeo?: boolean
  tempoPrevistoOverrideMinutos?: number | null
}) {
  const etiqueta = morada.tipoEtiqueta || morada.nomeMorada || 'Endereço'
  const e = morada.endereco
  const temGeo = e ? enderecoTemGeolocalizacao(e) : false
  const tempoExibidoMinutos =
    selecionada && tempoPrevistoOverrideMinutos != null && tempoPrevistoOverrideMinutos > 0
      ? tempoPrevistoOverrideMinutos
      : null
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
          className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
            selecionada ? 'text-primary' : 'text-gray-400'
          }`}
        />
        <div className="min-w-0">
          <p
            className={`text-sm font-semibold capitalize ${
              selecionada ? 'text-primary' : 'text-gray-800'
            }`}
          >
            {etiqueta}
          </p>
          <p className="truncate text-xs text-gray-500">{linhaResumo}</p>
          {exigirGeo ? (
            <div className="mt-1 space-y-0.5">
              {localizando ? (
                <p className="text-[11px] font-medium text-gray-500">Buscando localização…</p>
              ) : null}
              {temGeo && tempoExibidoMinutos != null ? (
                <p className="text-[11px] font-semibold text-emerald-700">
                  ~{tempoExibidoMinutos} min
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </button>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onVerDetalhes()
            }}
            title="Editar endereço"
            className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <MdEdit className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onRemover()
            }}
            title="Remover endereço"
            aria-label="Remover endereço"
            className="rounded-full p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <MdDelete className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function EntregaClienteSelector({
  moradaSelecionada,
  onMoradaSelecionada,
  clienteVinculado,
  onClienteVinculado,
  onAbrirCadastroCliente,
  onEditarClientePorDuploClique,
  onAbrirSeletorCliente,
  telefoneExibicaoExterno,
  onTelefoneExibicaoExternoChange,
  digitosUltimaBuscaExterno,
  onDigitosUltimaBuscaExternoChange,
  enderecoPadrao,
  mostrarEnderecos = true,
  usarModuloDeliveryClientes = false,
  tempoPrevistoMinutos = null,
  onCoberturaMoradaSelecionadaChange,
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

  const temCadastroNestaEmpresa = clienteCadastradoNestaEmpresa(clienteVinculado?.id)

  /** Nome digitado pelo usuário quando o cliente não existe (para pré-preencher o painel de cadastro). */
  const [nomeDigitado, setNomeDigitado] = useState('')
  /** `true` após busca sem cliente desta empresa — exibe opção "Cadastrar". */
  const [clienteNaoEncontrado, setClienteNaoEncontrado] = useState(false)
  /** Painel lateral de cadastro rápido de cliente. */
  const [painelClienteAberto, setPainelClienteAberto] = useState(false)
  /** Nome no formulário de cadastro rápido (separado do campo de busca). */
  const [nomeNovoCliente, setNomeNovoCliente] = useState('')
  /** `null` = modo criar; definido = modo editar */
  const [moradaEditando, setMoradaEditando] = useState<MoradaTelefone | null>(null)
  const [painelMoradaAberto, setPainelMoradaAberto] = useState(false)
  const [formNova, setFormNova] = useState<FormNovasMorada>(FORM_INICIAL)
  const [buscaPlacesMorada, setBuscaPlacesMorada] = useState('')
  /** Legado (não delivery): geo só via Places simples. */
  const [moradaGeo, setMoradaGeo] = useState<{
    enderecoLocalizacao: GeoJsonPoint
    providerEnderecoId: string
  } | null>(null)
  const [localizandoMoradaId, setLocalizandoMoradaId] = useState<string | null>(null)
  const [moradaParaExcluir, setMoradaParaExcluir] = useState<MoradaTelefone | null>(null)
  /** Edição inline do nome (cliente já encontrado). */
  const [editandoNome, setEditandoNome] = useState(false)
  const [nomeEmEdicao, setNomeEmEdicao] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)

  const telefoneInputRef = useRef<HTMLInputElement>(null)
  const nomeInputRef = useRef<HTMLInputElement>(null)
  const numeroMoradaInputRef = useRef<HTMLInputElement>(null)
  const abrirCadastroCliente = onAbrirCadastroCliente ?? onEditarClientePorDuploClique
  /** Evita blur+salvar quando o clique foi no lápis (que tira o foco do input). */
  const ignorarBlurSalvarNomeRef = useRef(false)
  /** Evita Enter + blur dispararem dois PATCH. */
  const salvandoNomeRef = useRef(false)

  // Foca o campo de telefone ao montar (ex.: ao entrar na step de informações do pedido).
  useEffect(() => {
    const id = setTimeout(() => telefoneInputRef.current?.focus(), 100)
    return () => clearTimeout(id)
  }, [])

  const moradaHookOptions = { usarModuloDelivery: usarModuloDeliveryClientes }

  const empresaGeoQuery = useGeoEmpresaEntrega(usarModuloDeliveryClientes)
  const fallbackEmpresaGeo = empresaGeoQuery.data?.enderecoLocalizacao ?? null

  const { data: moradas, isLoading: buscando, isError: erroMoradas, error: erroMoradasMsg } =
    useMoradasPorTelefone(temCadastroNestaEmpresa ? telefoneBuscado : null, moradaHookOptions)
  const criarMorada = useCriarMoradaTelefone(moradaHookOptions)
  const atualizarMorada = useAtualizarMoradaTelefone(moradaHookOptions)
  const excluirMorada = useExcluirMoradaTelefone(moradaHookOptions)
  const registrarUsoMorada = useRegistrarUsoMoradaTelefone(moradaHookOptions)
  const buscarCliente = useBuscarClientePorTelefone()
  const criarCliente = useCriarClienteRapido()
  const criarClienteDelivery = useCriarClienteDeliveryRapido()
  const atualizarNomeCliente = useAtualizarNomeCliente()

  useEffect(() => {
    setEditandoNome(false)
    setNomeEmEdicao('')
    setSalvandoNome(false)
    salvandoNomeRef.current = false
  }, [clienteVinculado?.id, telefoneBuscado])

  useEffect(() => {
    if (!editandoNome) return
    const id = setTimeout(() => {
      nomeInputRef.current?.focus()
      nomeInputRef.current?.select()
    }, 0)
    return () => clearTimeout(id)
  }, [editandoNome])

  const iniciarEdicaoNome = useCallback(() => {
    if (!clienteVinculado || salvandoNomeRef.current) return
    setNomeEmEdicao(clienteVinculado.nome)
    setEditandoNome(true)
  }, [clienteVinculado])

  const cancelarEdicaoNome = useCallback(() => {
    setEditandoNome(false)
    setNomeEmEdicao(clienteVinculado?.nome ?? '')
  }, [clienteVinculado?.nome])

  const salvarNomeCliente = useCallback(async () => {
    if (!clienteVinculado || salvandoNomeRef.current) return

    const nomeTrim = nomeEmEdicao.trim()
    if (!nomeTrim) {
      showToast.error('Informe o nome do cliente.')
      nomeInputRef.current?.focus()
      return
    }

    if (nomeTrim === clienteVinculado.nome.trim()) {
      setEditandoNome(false)
      return
    }

    salvandoNomeRef.current = true
    setSalvandoNome(true)
    setEditandoNome(false)
    try {
      const clienteId = clienteVinculado.id.trim()
      if (!clienteId) {
        throw new Error('Cadastre o cliente nesta empresa para editar o nome.')
      }
      await atualizarNomeCliente.mutateAsync({
        clienteId,
        nome: nomeTrim,
      })
      onClienteVinculado({ id: clienteId, nome: nomeTrim })
      setNomeDigitado(nomeTrim)
      showToast.success('Nome atualizado.')
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar nome')
      setNomeEmEdicao(nomeTrim)
      setEditandoNome(true)
    } finally {
      salvandoNomeRef.current = false
      setSalvandoNome(false)
    }
  }, [
    clienteVinculado,
    nomeEmEdicao,
    atualizarNomeCliente,
    onClienteVinculado,
  ])

  useEffect(() => {
    if (!onCoberturaMoradaSelecionadaChange) return

    if (!usarModuloDeliveryClientes || !mostrarEnderecos || !moradaSelecionada) {
      onCoberturaMoradaSelecionadaChange({ status: 'null' })
      return
    }

    if (!(moradaSelecionada.endereco && enderecoTemGeolocalizacao(moradaSelecionada.endereco))) {
      onCoberturaMoradaSelecionadaChange({ status: 'sem_geo' })
      return
    }

    onCoberturaMoradaSelecionadaChange({
      status: 'coberta',
      moradaId: moradaSelecionada.id,
      valorTaxa: 0,
      tempoEntregaInMinutes: 0,
    })
  }, [
    onCoberturaMoradaSelecionadaChange,
    usarModuloDeliveryClientes,
    mostrarEnderecos,
    moradaSelecionada,
  ])

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

  const podeGerenciarEnderecos = temCadastroNestaEmpresa

  const resetGeoPainelState = useCallback(() => {
    setBuscaPlacesMorada('')
    setMoradaGeo(null)
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
    (m: MoradaTelefone) => {
      if (!podeGerenciarEnderecos) {
        showToast.warning('Cadastre o cliente antes de editar o endereço.')
        return
      }
      setMoradaEditando(m)
      setFormNova(moradaParaForm(m))
      resetGeoPainelState()
      setPainelMoradaAberto(true)
    },
    [podeGerenciarEnderecos, resetGeoPainelState]
  )

  const fecharPainelMorada = useCallback(() => {
    setPainelMoradaAberto(false)
    setMoradaEditando(null)
    setFormNova(formInicialComEnderecoPadrao(enderecoPadrao))
    setBuscandoCep(false)
    resetGeoPainelState()
  }, [enderecoPadrao, resetGeoPainelState])

  const abrirConfirmacaoExclusao = useCallback(
    (m: MoradaTelefone) => {
      if (!podeGerenciarEnderecos) {
        showToast.warning('Cadastre o cliente antes de remover o endereço.')
        return
      }
      setMoradaParaExcluir(m)
    },
    [podeGerenciarEnderecos]
  )

  const fecharConfirmacaoExclusao = useCallback(() => {
    if (excluirMorada.isPending) return
    setMoradaParaExcluir(null)
  }, [excluirMorada.isPending])

  const confirmarExclusaoMorada = useCallback(async () => {
    const morada = moradaParaExcluir
    if (!morada) return

    const digitos =
      telefoneBuscado ||
      extrairDigitosTelefone(telefoneInput) ||
      extrairDigitosTelefone(morada.telefone)
    if (!digitos) {
      showToast.warning('Telefone inválido para remover o endereço.')
      return
    }

    try {
      await excluirMorada.mutateAsync({
        id: morada.id,
        telefoneDigitos: digitos,
      })
      if (moradaSelecionada?.id === morada.id) {
        onMoradaSelecionada(null)
      }
      if (moradaEditando?.id === morada.id) {
        fecharPainelMorada()
      }
      setMoradaParaExcluir(null)
    } catch {
      // toast já tratado no hook
    }
  }, [
    moradaParaExcluir,
    telefoneBuscado,
    telefoneInput,
    excluirMorada,
    moradaSelecionada?.id,
    onMoradaSelecionada,
    moradaEditando?.id,
    fecharPainelMorada,
  ])

  const handleLocalizarMorada = useCallback(
    async (morada: MoradaTelefone) => {
      if (!morada.endereco) {
        showToast.warning('Endereço incompleto para localizar.')
        return
      }
      setLocalizandoMoradaId(morada.id)
      try {
        const resolvida = await resolverGeoMoradaDeliveryGestor({
          endereco: morada.endereco,
          fallbackEmpresaGeo,
        })
        const digitos =
          extrairDigitosTelefone(morada.telefone) ||
          extrairDigitosTelefone(telefoneInput) ||
          telefoneBuscado ||
          ''
        if (!digitos) {
          showToast.error('Telefone do cliente não encontrado para salvar a localização.')
          return
        }
        const atualizada = await atualizarMorada.mutateAsync({
          id: morada.id,
          dto: {
            telefone: digitos,
            tipoEtiqueta: morada.tipoEtiqueta,
            nomeMorada: morada.nomeMorada,
            endereco: {
              ...morada.endereco,
              enderecoLocalizacao: resolvida.enderecoLocalizacao,
              providerEnderecoId: resolvida.providerEnderecoId ?? null,
              preferenciaEntrega: null,
            },
          },
        })
        if (resolvida.origem === 'empresa') {
          showToast.warning(
            'Google não localizou o endereço. Usamos a localização da empresa como aproximação.'
          )
        }
        if (moradaSelecionada?.id === morada.id || !moradaSelecionada) {
          definirMoradaSelecionada(atualizada, digitos)
        }
      } catch (error) {
        showToast.error(
          error instanceof Error ? error.message : 'Não foi possível localizar o endereço'
        )
      } finally {
        setLocalizandoMoradaId(null)
      }
    },
    [
      fallbackEmpresaGeo,
      telefoneInput,
      telefoneBuscado,
      atualizarMorada,
      moradaSelecionada?.id,
      definirMoradaSelecionada,
    ]
  )

  const tentarSelecionarMorada = useCallback(
    (morada: MoradaTelefone, telefoneDigitosOverride?: string | null) => {
      definirMoradaSelecionada(morada, telefoneDigitosOverride)
      if (
        usarModuloDeliveryClientes &&
        morada.endereco &&
        !enderecoTemGeolocalizacao(morada.endereco)
      ) {
        void handleLocalizarMorada(morada)
      }
    },
    [usarModuloDeliveryClientes, definirMoradaSelecionada, handleLocalizarMorada]
  )
  const handleBuscar = useCallback(async (telefoneOverride?: string) => {
    const digitos = extrairDigitosTelefone(telefoneOverride ?? telefoneInput)
    const minDigitos = telefoneMinimoDigitosBuscaEntrega(usarModuloDeliveryClientes)

    /**
     * Lupa sem telefone → seletor ERP (lista + novo cliente), como na main.
     * Com dígitos incompletos no módulo delivery → exige celular 11 dígitos.
     */
    if (digitos.length === 0) {
      if (onAbrirSeletorCliente) {
        onAbrirSeletorCliente()
        return
      }
      if (usarModuloDeliveryClientes) {
        showToast.warning('Informe o celular completo com DDD (11 dígitos).')
      }
      return
    }

    if (digitos.length < minDigitos) {
      if (usarModuloDeliveryClientes) {
        showToast.warning('Informe o celular completo com DDD (11 dígitos).')
      } else {
        onAbrirSeletorCliente?.()
      }
      return
    }

    setClienteNaoEncontrado(false)
    setNomeDigitado('')
    onClienteVinculado(null)
    onMoradaSelecionada(null)
    setTelefoneBuscado(digitos)

    try {
      const clienteErp = await buscarCliente.mutateAsync(digitos)
      if (clienteErp) {
        onClienteVinculado({ id: clienteErp.getId(), nome: clienteErp.getNome() })
        return
      }

      setClienteNaoEncontrado(true)
    } catch {
      setClienteNaoEncontrado(true)
    }
  }, [
    telefoneInput,
    usarModuloDeliveryClientes,
    buscarCliente,
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
    const minDigitos = telefoneMinimoDigitosBuscaEntrega(usarModuloDeliveryClientes)
    if (digitos.length >= minDigitos && digitos !== telefoneBuscado) {
      void handleBuscar()
    }
  }, [telefoneInput, telefoneBuscado, handleBuscar, usarModuloDeliveryClientes])

  const handleFormChange = useCallback(
    (campo: keyof FormNovasMorada, valor: string) => {
      const normalizado = CAMPOS_ENDERECO_MAIUSCULA.has(campo)
        ? campo === 'estado'
          ? valor.toUpperCase().slice(0, 2)
          : paraMaiusculaEndereco(valor)
        : valor
      setFormNova(prev => ({ ...prev, [campo]: normalizado }))
    },
    []
  )

  const handleBuscarCep = useCallback(async () => {
    const cep = normalizarDigitosCep(formNova.cep)
    if (cep.length !== 8) {
      showToast.warning('Informe um CEP com 8 dígitos.')
      return
    }
    setBuscandoCep(true)
    try {
      const via = await consultarCepViaApi(cep)
      setFormNova(prev => ({
        ...prev,
        cep: formatarCepMascara(via.cep || cep),
        ...(via.logradouro ? { rua: paraMaiusculaEndereco(via.logradouro) } : {}),
        ...(via.bairro ? { bairro: paraMaiusculaEndereco(via.bairro) } : {}),
        ...(via.localidade ? { cidade: paraMaiusculaEndereco(via.localidade) } : {}),
        ...(via.uf ? { estado: via.uf.toUpperCase().slice(0, 2) } : {}),
      }))
      showToast.success('Endereço preenchido pelo CEP.')
      window.setTimeout(() => numeroMoradaInputRef.current?.focus(), 50)
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Não foi possível consultar o CEP.')
    } finally {
      setBuscandoCep(false)
    }
  }, [formNova.cep])

  const handleTipoEtiquetaChange = useCallback((valor: string) => {
    const tipoEtiqueta = normalizarTipoEtiquetaMorada(valor)
    setFormNova(prev => ({
      ...prev,
      tipoEtiqueta,
      nomeMorada: nomePadraoMoradaEntrega(tipoEtiqueta),
    }))
  }, [])

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

    const enderecoBase: EnderecoMorada = {
      cep: cepDigits,
      rua: paraMaiusculaEndereco(formNova.rua.trim()),
      numero: paraMaiusculaEndereco(formNova.numero.trim()),
      bairro: paraMaiusculaEndereco(formNova.bairro.trim()),
      cidade: paraMaiusculaEndereco(formNova.cidade.trim()),
      estado: uf,
      complemento: formNova.complemento.trim()
        ? paraMaiusculaEndereco(formNova.complemento.trim())
        : undefined,
      referencia: formNova.referencia.trim()
        ? paraMaiusculaEndereco(formNova.referencia.trim())
        : undefined,
    }

    let geoParaSalvar: {
      enderecoLocalizacao: GeoJsonPoint
      providerEnderecoId?: string | null
    } | null = null

    if (usarModuloDeliveryClientes) {
      try {
        const resolvida = await resolverGeoMoradaDeliveryGestor({
          endereco: enderecoBase,
          fallbackEmpresaGeo,
        })
        geoParaSalvar = {
          enderecoLocalizacao: resolvida.enderecoLocalizacao,
          providerEnderecoId: resolvida.providerEnderecoId ?? null,
        }
        if (resolvida.origem === 'empresa') {
          showToast.warning(
            'Google não localizou o endereço. Usamos a localização da empresa como aproximação.'
          )
        }
      } catch (error) {
        if (
          moradaEditando?.endereco &&
          enderecoTemGeolocalizacao(moradaEditando.endereco)
        ) {
          geoParaSalvar = {
            enderecoLocalizacao: moradaEditando.endereco.enderecoLocalizacao!,
            providerEnderecoId: moradaEditando.endereco.providerEnderecoId ?? null,
          }
        } else {
          showToast.error(
            error instanceof Error
              ? error.message
              : 'Não foi possível obter a localização do endereço'
          )
          return
        }
      }
    } else if (moradaGeo) {
      geoParaSalvar = moradaGeo
    }

    const endereco: EnderecoMorada = {
      ...enderecoBase,
      ...(geoParaSalvar
        ? {
            enderecoLocalizacao: geoParaSalvar.enderecoLocalizacao,
            providerEnderecoId: geoParaSalvar.providerEnderecoId ?? null,
            preferenciaEntrega: null,
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
    fallbackEmpresaGeo,
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
        try {
          await criarClienteDelivery.mutateAsync({ telefone: digitos, nome })
        } catch {
          /* Perfil delivery deste telefone já pode existir — só o cadastro da empresa é obrigatório. */
        }
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
  const buscaRealizada = telefoneBuscado !== null || clienteVinculado !== null
  const buscandoCliente = buscarCliente.isPending
  const clienteCadastrado = podeGerenciarEnderecos

  useEffect(() => {
    if (
      !mostrarEnderecos ||
      !clienteCadastrado ||
      moradaSelecionada ||
      moradasEncontradas.length === 0
    ) {
      return
    }

    tentarSelecionarMorada(moradasEncontradas[0])
  }, [
    mostrarEnderecos,
    clienteCadastrado,
    moradaSelecionada,
    moradasEncontradas,
    tentarSelecionarMorada,
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
                ref={nomeInputRef}
                type="text"
                value={
                  editandoNome
                    ? nomeEmEdicao
                    : clienteVinculado
                      ? clienteVinculado.nome
                      : nomeDigitado
                }
                onChange={e => {
                  if (editandoNome) {
                    setNomeEmEdicao(e.target.value)
                    return
                  }
                  if (clienteVinculado) {
                    onClienteVinculado(null)
                    setClienteNaoEncontrado(false)
                  }
                  setNomeDigitado(e.target.value)
                }}
                readOnly={!!clienteVinculado && !editandoNome}
                disabled={salvandoNome}
                placeholder="Ex.: João Silva"
                autoFocus={!clienteVinculado}
                title={
                  clienteVinculado && !editandoNome
                    ? 'Clique para editar o nome'
                    : undefined
                }
                className={`w-full rounded-md border py-2 pl-9 text-sm focus:outline-none focus:ring-0 ${
                  clienteVinculado?.id?.trim() ? 'pr-10' : 'pr-3'
                } ${
                  clienteVinculado && !editandoNome
                    ? 'cursor-pointer select-none border-green-400 bg-green-50 text-green-800'
                    : editandoNome
                      ? 'border-primary/40 bg-white'
                      : 'border-primary/30 bg-white'
                }`}
                onMouseDown={e => {
                  if (clienteVinculado && !editandoNome && e.detail >= 2) {
                    e.preventDefault()
                  }
                }}
                onClick={() => {
                  if (clienteVinculado && !editandoNome) {
                    iniciarEdicaoNome()
                  }
                }}
                onKeyDown={e => {
                  if (!editandoNome) return
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void salvarNomeCliente()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    cancelarEdicaoNome()
                  }
                }}
                onBlur={() => {
                  if (!editandoNome || salvandoNomeRef.current) return
                  if (ignorarBlurSalvarNomeRef.current) {
                    ignorarBlurSalvarNomeRef.current = false
                    return
                  }
                  void salvarNomeCliente()
                }}
              />
              {clienteVinculado?.id?.trim() ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-primary hover:bg-primary/10 disabled:opacity-50"
                  title="Editar cadastro do cliente"
                  aria-label="Editar cadastro do cliente"
                  disabled={salvandoNome}
                  onMouseDown={() => {
                    ignorarBlurSalvarNomeRef.current = true
                  }}
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (editandoNome) {
                      cancelarEdicaoNome()
                    }
                    if (abrirCadastroCliente) {
                      abrirCadastroCliente()
                    } else {
                      showToast.info(
                        'Não foi possível abrir o cadastro completo neste fluxo.'
                      )
                    }
                  }}
                >
                  <MdEdit className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {clienteCadastrado && (
              <p className="mt-1 flex items-center gap-1 text-xs text-green-700">
                <MdCheckCircle className="h-3.5 w-3.5" />
                Cliente encontrado
              </p>
            )}
            {clienteNaoEncontrado && !clienteVinculado && (
              <p className="mt-1 text-xs text-secondary">
                Cliente não cadastrado nesta empresa.{' '}
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

      {/* Endereços só depois do cadastro nesta empresa */}
      {podeExibirEnderecosClienteEntrega({
        mostrarEnderecos: Boolean(mostrarEnderecos),
        clienteId: clienteVinculado?.id,
      }) &&
        telefoneBuscado !== null &&
        !buscando && (
        <div className="space-y-2">
          {moradasEncontradas.length > 0 ? (
            <>
              <p className="text-xs font-medium text-gray-500">
                {moradasEncontradas.length} endereço{moradasEncontradas.length !== 1 ? 's' : ''}{' '}
                encontrado{moradasEncontradas.length !== 1 ? 's' : ''}
              </p>
              {moradasEncontradas.map(morada => (
                <MoradaCard
                  key={morada.id}
                  morada={morada}
                  selecionada={moradaSelecionada?.id === morada.id}
                  onSelecionar={() => tentarSelecionarMorada(morada)}
                  onVerDetalhes={() => abrirPainelEditar(morada)}
                  onRemover={() => abrirConfirmacaoExclusao(morada)}
                  localizando={localizandoMoradaId === morada.id}
                  exigirGeo={usarModuloDeliveryClientes}
                  tempoPrevistoOverrideMinutos={
                    moradaSelecionada?.id === morada.id ? tempoPrevistoMinutos : null
                  }
                />
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-6 text-center">
              <MdAddLocation className="h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">
                Nenhum endereço cadastrado para este cliente.
              </p>
              <Button
                type="button"
                variant="outlined"
                onClick={() => abrirPainelNovo()}
                className="mt-1 border-primary/30 text-primary hover:bg-primary/10"
                title="Adicionar endereço de entrega"
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
          saveLabel: moradaEditando ? 'Salvar alterações' : 'Salvar endereço',
          saveLoading: criarMorada.isPending || atualizarMorada.isPending,
          saveDisabled:
            criarMorada.isPending ||
            atualizarMorada.isPending ||
            !formNova.nomeMorada.trim() ||
            !formNova.rua ||
            !formNova.numero ||
            !formNova.cidade ||
            !formNova.estado,
          onSave: handleSalvarMorada,
          showCancel: true,
          cancelLabel: 'Cancelar',
          onCancel: fecharPainelMorada,
        }}
      >
        <div className="space-y-4 px-4 py-4 text-sm">
          <div>
            <Label className="mb-1 block text-xs font-medium text-gray-600">
              Nome da morada <span className="text-red-500">*</span>
            </Label>
            <select
              value={formNova.tipoEtiqueta}
              onChange={e => handleTipoEtiquetaChange(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {ETIQUETAS_MORADA_ENTREGA.map(etiqueta => (
                <option key={etiqueta} value={etiqueta}>
                  {etiqueta}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-400">
              Classificação do endereço (Casa, Trabalho ou Outro).
            </p>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-medium text-gray-600">CEP</Label>
            <div className="flex gap-2">
              <input
                value={formNova.cep}
                onChange={e => handleFormChange('cep', formatarCepMascara(e.target.value))}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleBuscarCep()
                  }
                }}
                placeholder="00000-000"
                inputMode="numeric"
                autoComplete="postal-code"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => void handleBuscarCep()}
                disabled={buscandoCep || normalizarDigitosCep(formNova.cep).length !== 8}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MdSearch className="h-4 w-4" />
                {buscandoCep ? 'Buscando…' : 'Buscar'}
              </button>
            </div>
          </div>

          {!usarModuloDeliveryClientes ? (
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
                  ...(fields.rua ? { rua: paraMaiusculaEndereco(fields.rua) } : {}),
                  ...(fields.numero ? { numero: paraMaiusculaEndereco(fields.numero) } : {}),
                  ...(fields.bairro ? { bairro: paraMaiusculaEndereco(fields.bairro) } : {}),
                  ...(fields.cidade ? { cidade: paraMaiusculaEndereco(fields.cidade) } : {}),
                  ...(fields.estado ? { estado: fields.estado.toUpperCase().slice(0, 2) } : {}),
                  ...(fields.cep ? { cep: formatarCepMascara(fields.cep) } : {}),
                }))
                setMoradaGeo({
                  enderecoLocalizacao: place.enderecoLocalizacao,
                  providerEnderecoId: place.providerEnderecoId,
                })
                setBuscaPlacesMorada(
                  maiusculasEnderecoInput(
                    [fields.rua, fields.numero].filter(Boolean).join(', ') ||
                      place.enderecoFormatado ||
                      ''
                  )
                )
                showToast.success('Endereço aplicado a partir da sugestão do Google.')
              }}
            />
          ) : null}

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
                placeholder="RUA DAS FLORES"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-gray-600">
                Nº <span className="text-red-500">*</span>
              </Label>
              <input
                ref={numeroMoradaInputRef}
                value={formNova.numero}
                onChange={e => handleFormChange('numero', e.target.value)}
                placeholder="100"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-medium text-gray-600">Bairro</Label>
            <input
              value={formNova.bairro}
              onChange={e => handleFormChange('bairro', e.target.value)}
              placeholder="CENTRO"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
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
                placeholder="SÃO PAULO"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-gray-600">
                UF <span className="text-red-500">*</span>
              </Label>
              <input
                value={formNova.estado}
                onChange={e => handleFormChange('estado', e.target.value)}
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
              placeholder="APTO 2, BLOCO B..."
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <Label className="mb-1 block text-xs font-medium text-gray-600">Referência</Label>
            <input
              value={formNova.referencia}
              onChange={e => handleFormChange('referencia', e.target.value)}
              placeholder="PRÓXIMO AO MERCADO..."
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      </JiffySidePanelModal>

      <JiffyConfirmDialog
        open={moradaParaExcluir != null}
        onOpenChange={open => {
          if (!open) fecharConfirmacaoExclusao()
        }}
        title="Remover endereço?"
        description={
          moradaParaExcluir ? (
            <>
              O endereço{' '}
              <strong>
                {moradaParaExcluir.tipoEtiqueta || moradaParaExcluir.nomeMorada || 'selecionado'}
              </strong>
              {moradaParaExcluir.endereco
                ? ` (${moradaParaExcluir.endereco.rua}, ${moradaParaExcluir.endereco.numero})`
                : ''}{' '}
              será removido permanentemente. Deseja continuar?
            </>
          ) : (
            'Este endereço será removido permanentemente. Deseja continuar?'
          )
        }
        cancelLabel="Cancelar"
        confirmLabel={excluirMorada.isPending ? 'Removendo…' : 'Remover'}
        onConfirm={() => void confirmarExclusaoMorada()}
        busy={excluirMorada.isPending}
        confirmButtonClassName="bg-red-600 hover:bg-red-700"
        titleSx={{ color: 'var(--color-alternate)' }}
      />
    </div>
  )
}

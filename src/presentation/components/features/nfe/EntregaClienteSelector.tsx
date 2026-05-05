'use client'

import { useState, useCallback, useEffect } from 'react'
import { MdSearch, MdAddLocation, MdEdit, MdLocationOn, MdPhone, MdPerson, MdCheckCircle } from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
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
  type MoradaTelefone,
  type EnderecoMorada,
} from '@/src/presentation/hooks/useMoradaTelefone'
import {
  useBuscarClientePorTelefone,
  useCriarClienteRapido,
} from '@/src/presentation/hooks/useClientes'

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

/** Retorna apenas os dígitos do telefone */
function extrairDigitosTelefone(valor: string): string {
  return valor.replace(/\D/g, '')
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
}: {
  morada: MoradaTelefone
  selecionada: boolean
  onSelecionar: () => void
  onVerDetalhes: () => void
}) {
  const etiqueta = morada.tipoEtiqueta || morada.nomeMorada || 'Endereço'
  const e = morada.endereco
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
  /** Painel lateral de cadastro rápido de cliente. */
  const [painelClienteAberto, setPainelClienteAberto] = useState(false)
  /** Nome no formulário de cadastro rápido (separado do campo de busca). */
  const [nomeNovoCliente, setNomeNovoCliente] = useState('')
  /** `null` = modo criar; definido = modo editar */
  const [moradaEditando, setMoradaEditando] = useState<MoradaTelefone | null>(null)
  const [painelMoradaAberto, setPainelMoradaAberto] = useState(false)
  const [formNova, setFormNova] = useState<FormNovasMorada>(FORM_INICIAL)
  const [isLoadingCep, setIsLoadingCep] = useState(false)

  const { data: moradas, isLoading: buscando } = useMoradasPorTelefone(telefoneBuscado)
  const criarMorada = useCriarMoradaTelefone()
  const atualizarMorada = useAtualizarMoradaTelefone()
  const registrarUsoMorada = useRegistrarUsoMoradaTelefone()
  const buscarCliente = useBuscarClientePorTelefone()
  const criarCliente = useCriarClienteRapido()

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

  const abrirPainelNovo = useCallback(() => {
    setMoradaEditando(null)
    setFormNova(formInicialComEnderecoPadrao(enderecoPadrao))
    setPainelMoradaAberto(true)
  }, [enderecoPadrao])

  const abrirPainelEditar = useCallback((m: MoradaTelefone) => {
    setMoradaEditando(m)
    setFormNova(moradaParaForm(m))
    setPainelMoradaAberto(true)
  }, [])

  const fecharPainelMorada = useCallback(() => {
    setPainelMoradaAberto(false)
    setMoradaEditando(null)
    setFormNova(formInicialComEnderecoPadrao(enderecoPadrao))
  }, [enderecoPadrao])

  const handleBuscar = useCallback(async () => {
    const digitos = extrairDigitosTelefone(telefoneInput)
    if (digitos.length < 8) {
      onAbrirSeletorCliente?.()
      return
    }

    setClienteNaoEncontrado(false)
    onClienteVinculado(null)
    setTelefoneBuscado(digitos)
    onMoradaSelecionada(null)

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

    const endereco: EnderecoMorada = {
      cep: cepDigits,
      rua: formNova.rua.trim(),
      numero: formNova.numero.trim(),
      bairro: formNova.bairro.trim(),
      cidade: formNova.cidade.trim(),
      estado: uf,
      complemento: formNova.complemento.trim() || undefined,
      referencia: formNova.referencia.trim() || undefined,
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
      if (moradaSelecionada?.id === moradaEditando.id) {
        definirMoradaSelecionada(atualizada, digitos)
      }
      return
    }

    const nova = await criarMorada.mutateAsync(dto)
    fecharPainelMorada()
    setTelefoneBuscado(digitos)
    definirMoradaSelecionada(nova, digitos)
  }, [
    telefoneInput,
    formNova,
    moradaEditando,
    moradaSelecionada?.id,
    criarMorada,
    atualizarMorada,
    fecharPainelMorada,
    definirMoradaSelecionada,
    setTelefoneBuscado,
  ])

  const handleSalvarClienteRapido = useCallback(async () => {
    const nome = nomeNovoCliente.trim()
    if (!nome) {
      showToast.warning('Informe o nome do cliente.')
      return
    }
    const digitos = extrairDigitosTelefone(telefoneInput)
    try {
      const novo = await criarCliente.mutateAsync({ nome, telefone: digitos })
      onClienteVinculado({ id: novo.getId(), nome: novo.getNome() })
      setClienteNaoEncontrado(false)
      setPainelClienteAberto(false)
      setNomeNovoCliente('')
      showToast.success('Cliente cadastrado com sucesso!')
    } catch {
      /* erro exibido pelo hook */
    }
  }, [nomeNovoCliente, telefoneInput, criarCliente, onClienteVinculado])

  const handleAbrirPainelCliente = useCallback(() => {
    setNomeNovoCliente(nomeDigitado.trim())
    setPainelClienteAberto(true)
  }, [nomeDigitado])

  const moradasEncontradas = moradas ?? []
  const buscaRealizada = telefoneBuscado !== null || clienteVinculado !== null
  const buscandoCliente = buscarCliente.isPending

  useEffect(() => {
    if (!mostrarEnderecos || !clienteVinculado || moradaSelecionada || moradasEncontradas.length === 0) {
      return
    }
    definirMoradaSelecionada(moradasEncontradas[0])
  }, [
    mostrarEnderecos,
    clienteVinculado,
    moradaSelecionada,
    moradasEncontradas,
    definirMoradaSelecionada,
  ])

  return (
    <div className="space-y-3">
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
                  buscandoCliente
                    ? 'Buscando cliente...'
                    : clienteVinculado
                      ? clienteVinculado.nome
                      : nomeDigitado
                }
                onChange={e => {
                  if (buscandoCliente) return
                  if (clienteVinculado) {
                    onClienteVinculado(null)
                    setClienteNaoEncontrado(false)
                  }
                  setNomeDigitado(e.target.value)
                }}
                readOnly={!!clienteVinculado || buscandoCliente}
                placeholder="Ex.: João Silva"
                autoFocus={!buscandoCliente}
                title={
                  clienteVinculado?.id
                    ? 'Clique para editar o cadastro do cliente.'
                    : undefined
                }
                className={`w-full rounded-md border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-0 ${
                  clienteVinculado
                    ? 'cursor-pointer select-none border-green-400 bg-green-50 text-green-800'
                    : buscandoCliente
                      ? 'cursor-wait border-primary/30 bg-gray-50 text-secondary-text'
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
              {buscandoCliente && (
                <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </div>
            {clienteVinculado && (
              <p className="mt-1 flex items-center gap-1 text-xs text-green-700">
                <MdCheckCircle className="h-3.5 w-3.5" />
                Cliente encontrado
              </p>
            )}
            {clienteNaoEncontrado && !clienteVinculado && (
              <p className="mt-1 text-xs text-amber-600">
                Cliente não encontrado.{' '}
                <button
                  type="button"
                  className="font-semibold text-primary underline"
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
                type="tel"
                value={telefoneInput}
                onChange={e => {
                  const formatado = formatarTelefoneExibicao(e.target.value)
                  setTelefoneInput(formatado)
                  if (telefoneBuscado !== null) {
                    setTelefoneBuscado(null)
                    onMoradaSelecionada(null)
                    onClienteVinculado(null)
                    setClienteNaoEncontrado(false)
                  }
                }}
                onKeyDown={handleTelefoneKeyDown}
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
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <MdSearch className="h-4 w-4 text-primary" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Resultado da busca */}
      {mostrarEnderecos && telefoneBuscado !== null && !buscando && (
        <div className="space-y-2">
          {moradasEncontradas.length > 0 ? (
            <>
              <p className="text-xs font-medium text-gray-500">
                {moradasEncontradas.length} endereço{moradasEncontradas.length !== 1 ? 's' : ''} encontrado{moradasEncontradas.length !== 1 ? 's' : ''}
              </p>
              {moradasEncontradas.map(morada => (
                <MoradaCard
                  key={morada.id}
                  morada={morada}
                  selecionada={moradaSelecionada?.id === morada.id}
                  onSelecionar={() =>
                    definirMoradaSelecionada(morada)
                  }
                  onVerDetalhes={() => abrirPainelEditar(morada)}
                />
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-6 text-center">
              <MdAddLocation className="h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">
                Nenhum endereço cadastrado para este número.
              </p>
              <Button
                type="button"
                variant="outlined"
                onClick={() => abrirPainelNovo()}
                className="mt-1 border-primary/30 text-primary hover:bg-primary/10"
              >
                <MdAddLocation className="mr-1.5 h-4 w-4" />
                Adicionar endereço
              </Button>
            </div>
          )}

          {/* Botão para adicionar mais quando já existem moradas */}
          {moradasEncontradas.length > 0 && (
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

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="mb-1 block text-xs font-medium text-gray-600">
                Rua / Logradouro <span className="text-red-500">*</span>
              </Label>
              <input
                value={formNova.rua}
                onChange={e => handleFormChange('rua', e.target.value)}
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

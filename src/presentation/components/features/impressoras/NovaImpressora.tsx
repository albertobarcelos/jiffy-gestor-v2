'use client'

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Impressora } from '@/src/domain/entities/Impressora'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { Input } from '@/src/presentation/components/ui/input'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { MdCheck, MdExpandLess, MdExpandMore, MdPhone } from 'react-icons/md'

interface TerminalConfig {
  terminalId: string
  nome: string
  modelo: string // valor DB: generico, sunmiIntegrada, stone
  modeloDisplay: string // valor display: Genérico, Sunmi Integrada, Stone
  ip: string
  porta: string
  modoFicha: boolean
  ativo: boolean
  isHovering: boolean
}

export interface NovaImpressoraHandle {
  save: () => Promise<void>
}

interface NovaImpressoraProps {
  impressoraId?: string
  isCopyMode?: boolean // Se true, carrega dados mas cria nova impressora ao salvar
  isEmbedded?: boolean
  /** Quando true com `isEmbedded`, oculta o header interno (título + Cancelar/Salvar) — uso com `JiffySidePanelModal`. */
  hideEmbeddedChrome?: boolean
  /** Estado para o rodapé do modal (Salvar desabilitado / loading). */
  onEmbedChromeStateChange?: (state: { canSave: boolean; isSubmitting: boolean }) => void
  onClose?: () => void
  onSaved?: () => void
  onRequestClose?: (callback: () => void) => void // Callback para interceptar tentativas de fechar
}

/**
 * Mapeamento de modelo: Display ↔ DB
 */
const MODELO_MAP: Record<string, string> = {
  generico: 'Genérico',
  sunmiIntegrada: 'Sunmi Integrada',
  stoneIntegrada: 'Stone Integrada',
  pagbankIntegrada: 'Pagbank Integrada',
}

const MODELO_REVERSE_MAP: Record<string, string> = {
  Genérico: 'generico',
  'Sunmi Integrada': 'sunmiIntegrada',
  'Stone Integrada': 'stoneIntegrada',
  'Pagbank Integrada': 'pagbankIntegrada',
}

const MODELOS_OPTIONS = ['Genérico', 'Sunmi Integrada', 'Stone Integrada', 'Pagbank Integrada']

/** Grid desktop (cabeçalho + linhas): mesma largura de colunas e padding para alinhar títulos aos controles */
const DESKTOP_TERMINAL_ROW_GRID =
  'grid grid-cols-[auto_minmax(0,1fr)_7rem_7rem_3.5rem] items-center gap-3 px-2'

/** Labels outlined em preto — igual NovoGrupo / grupo de complementos */
const sxOutlinedLabelTextoEscuro = {
  '& .MuiInputLabel-root': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiFormLabel-asterisk': {
    color: 'var(--color-error)',
  },
} as const

const entradaCompactaInput = {
  padding: '14px',
  fontSize: '0.875rem',
} as const

const sxInputNomeImpressora = {
  ...sxOutlinedLabelTextoEscuro,
  '& .MuiOutlinedInput-input': entradaCompactaInput,
} as const

/**
 * Componente para criar/editar impressora
 * Replica o design e funcionalidades do Flutter conforme prompt
 */
export const NovaImpressora = forwardRef<NovaImpressoraHandle, NovaImpressoraProps>(
  function NovaImpressora(
    {
      impressoraId,
      isCopyMode = false,
      isEmbedded = false,
      hideEmbeddedChrome = false,
      onEmbedChromeStateChange,
      onClose,
      onSaved,
      onRequestClose,
    },
    ref
  ) {
    const router = useRouter()
    const { auth, isAuthenticated } = useAuthStore()
    // Em modo cópia, não é edição (sempre cria nova)
    const isEditing = !!impressoraId && !isCopyMode

    // Estados do formulário
    const [nome, setNome] = useState('')
    const [terminaisConfig, setTerminaisConfig] = useState<TerminalConfig[]>([])

    // Estados do formulário
    const [nomeInicial, setNomeInicial] = useState('')
    const [terminaisConfigInicial, setTerminaisConfigInicial] = useState<TerminalConfig[]>([])

    // Estados de loading
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingImpressora, setIsLoadingImpressora] = useState(false)
    const [isLoadingTerminais, setIsLoadingTerminais] = useState(false)

    // Estados de paginação
    const [currentPage, setCurrentPage] = useState(0)
    const [hasMoreTerminals, setHasMoreTerminals] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

    // Estado para diálogo de confirmação
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [pendingClose, setPendingClose] = useState<(() => void) | null>(null)

    // Estado para seleção múltipla de terminais
    const [selectedTerminalIds, setSelectedTerminalIds] = useState<Set<string>>(new Set())
    // Estado para controle de expansão no mobile
    const [expandedTerminalIds, setExpandedTerminalIds] = useState<Set<string>>(new Set())

    // Estados para inputs da barra de ações em lote
    const [bulkModelo, setBulkModelo] = useState('')
    const [bulkIP, setBulkIP] = useState('')
    const [bulkPorta, setBulkPorta] = useState('')

    const hasLoadedImpressoraRef = useRef(false)
    const hasLoadedTerminaisRef = useRef(false)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const pageSize = 10

    /**
     * Aplica máscara de IP (###.###.#.###)
     * Aceita 1-3 dígitos em cada grupo, permitindo IPs como 192.168.1.100
     * Detecta quando o terceiro grupo tem menos dígitos (ex: 192.168.1 ao invés de 192.168.110)
     */
    const formatIP = (value: string): string => {
      // Se o valor já contém pontos, preserva a estrutura existente
      // Isso ajuda a detectar quando o usuário já formatou parcialmente
      if (value.includes('.')) {
        // Remove pontos e reaplica a máscara
        const digits = value.replace(/\D/g, '')
        return formatIPFromDigits(digits)
      }

      // Remove tudo que não é dígito
      const digits = value.replace(/\D/g, '')
      return formatIPFromDigits(digits)
    }

    /**
     * Formata IP a partir de apenas dígitos
     * Lógica inteligente: tenta dividir os dígitos de forma que cada grupo tenha 1-3 dígitos
     * Prioriza completar grupos anteriores antes de avançar para o próximo
     * Exemplo: 192168101 → 192.168.10.1 (não 192.168.1.01)
     */
    const formatIPFromDigits = (digits: string): string => {
      // Limita a 12 dígitos (máximo para IP: 3+3+3+3)
      const limited = digits.slice(0, 12)

      if (limited.length === 0) return ''

      // Primeiro grupo (1-3 dígitos)
      if (limited.length <= 3) return limited

      // Segundo grupo (1-3 dígitos)
      const firstGroup = limited.slice(0, 3)
      const afterFirst = limited.slice(3)

      if (afterFirst.length <= 3) {
        return `${firstGroup}.${afterFirst}`
      }

      // A partir daqui, temos pelo menos 7 dígitos
      // ESTRATÉGIA: Tenta completar grupos de forma inteligente
      const secondGroup = afterFirst.slice(0, 3)
      const afterSecond = afterFirst.slice(3) // Dígitos após o segundo grupo

      // Se temos exatamente 7 dígitos: 192.168.1
      if (limited.length === 7) {
        return `${firstGroup}.${secondGroup}.${afterSecond}`
      }

      // Se temos 8 dígitos: pode ser 192.168.1.1 ou 192.168.10
      if (limited.length === 8) {
        // Tenta completar o terceiro grupo primeiro (prioriza 192.168.10)
        const thirdGroup = afterSecond.slice(0, 2) // Tenta 2 dígitos
        const fourthGroup = afterSecond.slice(2) // Resto
        if (fourthGroup.length > 0) {
          return `${firstGroup}.${secondGroup}.${thirdGroup}.${fourthGroup}`
        }
        // Se não há quarto grupo, deixa incompleto
        return `${firstGroup}.${secondGroup}.${thirdGroup}`
      }

      // Se temos 9 dígitos: pode ser 192.168.10.1 ou 192.168.100
      if (limited.length === 9) {
        const thirdGroup = afterSecond.slice(0, 2) // Tenta 2 dígitos primeiro
        const fourthGroup = afterSecond.slice(2) // Resto
        if (fourthGroup.length > 0) {
          return `${firstGroup}.${secondGroup}.${thirdGroup}.${fourthGroup}`
        }
        // Se não há quarto grupo, tenta 3 dígitos no terceiro
        return `${firstGroup}.${secondGroup}.${afterSecond}`
      }

      // Se temos 10 dígitos: pode ser 192.168.10.10 ou 192.168.100.1 ou 192.168.1.100
      if (limited.length === 10) {
        // Tenta diferentes combinações
        // Opção 1: 2+2 (192.168.10.10)
        const thirdGroup2 = afterSecond.slice(0, 2)
        const fourthGroup2 = afterSecond.slice(2, 4)
        if (fourthGroup2.length === 2) {
          return `${firstGroup}.${secondGroup}.${thirdGroup2}.${fourthGroup2}`
        }
        // Opção 2: 3+1 (192.168.100.1)
        const thirdGroup3 = afterSecond.slice(0, 3)
        const fourthGroup1 = afterSecond.slice(3)
        if (fourthGroup1.length > 0) {
          return `${firstGroup}.${secondGroup}.${thirdGroup3}.${fourthGroup1}`
        }
        // Opção 3: 1+3 (192.168.1.100) - fallback
        const thirdGroup1 = afterSecond.slice(0, 1)
        const fourthGroup3Fallback = afterSecond.slice(1, 4)
        return `${firstGroup}.${secondGroup}.${thirdGroup1}.${fourthGroup3Fallback}`
      }

      // Se temos 11 dígitos: pode ser 192.168.10.100 ou 192.168.100.10 ou 192.168.1.100 (com 1 extra)
      if (limited.length === 11) {
        // Opção 1: 2+3 (192.168.10.100) - mais comum
        const thirdGroup2 = afterSecond.slice(0, 2)
        const fourthGroup3 = afterSecond.slice(2, 5)
        if (fourthGroup3.length === 3) {
          return `${firstGroup}.${secondGroup}.${thirdGroup2}.${fourthGroup3}`
        }
        // Opção 2: 3+2 (192.168.100.10)
        const thirdGroup3 = afterSecond.slice(0, 3)
        const fourthGroup2Alt = afterSecond.slice(3, 5)
        if (fourthGroup2Alt.length === 2) {
          return `${firstGroup}.${secondGroup}.${thirdGroup3}.${fourthGroup2Alt}`
        }
        // Opção 3: 1+3 (192.168.1.100) - ignora o dígito extra
        const thirdGroup1 = afterSecond.slice(0, 1)
        const fourthGroup3Fallback = afterSecond.slice(1, 4)
        return `${firstGroup}.${secondGroup}.${thirdGroup1}.${fourthGroup3Fallback}`
      }

      // Se temos 12 dígitos: 192.168.100.100 (máximo)
      if (limited.length === 12) {
        const thirdGroup = afterSecond.slice(0, 3)
        const fourthGroup = afterSecond.slice(3, 6)
        return `${firstGroup}.${secondGroup}.${thirdGroup}.${fourthGroup}`
      }

      // Fallback para casos não cobertos
      // Tenta dividir de forma equilibrada
      if (afterSecond.length <= 3) {
        return `${firstGroup}.${secondGroup}.${afterSecond}`
      }

      // Divide o que sobra entre terceiro e quarto grupos
      // Prioriza completar o terceiro grupo primeiro
      let thirdGroup = ''
      let fourthGroup = ''

      if (afterSecond.length <= 4) {
        // Se temos 4 dígitos, tenta 2+2
        thirdGroup = afterSecond.slice(0, 2)
        fourthGroup = afterSecond.slice(2)
      } else if (afterSecond.length <= 5) {
        // Se temos 5 dígitos, tenta 2+3
        thirdGroup = afterSecond.slice(0, 2)
        fourthGroup = afterSecond.slice(2, 5)
      } else {
        // Se temos 6 ou mais, tenta 3+3
        thirdGroup = afterSecond.slice(0, 3)
        fourthGroup = afterSecond.slice(3, 6)
      }

      return `${firstGroup}.${secondGroup}.${thirdGroup}.${fourthGroup}`
    }

    /**
     * Carrega terminais com paginação
     */
    const loadTerminais = useCallback(
      async (offset: number, reset: boolean = false) => {
        const token = auth?.getAccessToken()
        if (!token) return

        setIsLoadingMore(true)

        try {
          const params = new URLSearchParams({
            limit: pageSize.toString(),
            offset: offset.toString(),
          })

          const response = await fetch(`/api/terminais?${params.toString()}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            throw new Error('Erro ao carregar terminais')
          }

          const data = await response.json()
          const terminais = data.items || []

          // Cria configurações padrão para cada terminal
          const newConfigs: TerminalConfig[] = terminais.map((terminal: any) => ({
            terminalId: terminal.id || terminal._id,
            nome: terminal.nome || terminal.name || 'Terminal sem nome',
            modelo: 'generico',
            modeloDisplay: 'Genérico',
            ip: '192.168.1.100',
            porta: '9100',
            modoFicha: true,
            ativo: true,
            isHovering: false,
          }))

          setTerminaisConfig(prev => {
            if (reset) {
              return newConfigs
            }
            // Evita duplicatas
            const existingIds = new Set(prev.map(t => t.terminalId))
            const unique = newConfigs.filter(t => !existingIds.has(t.terminalId))
            return [...prev, ...unique]
          })

          // Verifica se há mais páginas
          const hasMore = terminais.length === pageSize
          setHasMoreTerminals(hasMore)
          if (hasMore) {
            setCurrentPage(offset + terminais.length)
          }
        } catch (error) {
          console.error('Erro ao carregar terminais:', error)
        } finally {
          setIsLoadingMore(false)
          // Não define isLoadingTerminais aqui, pois é gerenciado por loadAllTerminais
        }
      },
      [auth]
    )

    /**
     * Carrega todos os terminais (para nova impressora)
     */
    const loadAllTerminais = useCallback(async () => {
      if (isEditing) return // Não carrega todos se estiver editando

      hasLoadedTerminaisRef.current = false
      setIsLoadingTerminais(true)
      setTerminaisConfig([])
      setCurrentPage(0)
      setHasMoreTerminals(true)

      const token = auth?.getAccessToken()
      if (!token) {
        setIsLoadingTerminais(false)
        hasLoadedTerminaisRef.current = true
        return
      }

      try {
        // Carrega primeira página
        let offset = 0
        let hasMore = true
        let firstRequest = true
        let totalLoaded = 0
        const maxIterations = 1000 // Proteção contra loop infinito
        let iterations = 0

        while (hasMore && iterations < maxIterations) {
          iterations++

          const params = new URLSearchParams({
            limit: pageSize.toString(),
            offset: offset.toString(),
          })

          const response = await fetch(`/api/terminais?${params.toString()}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            hasMore = false
            break
          }

          const data = await response.json()
          const terminais = data.items || []

          // Se não retornou nenhum terminal e já fez pelo menos uma requisição, para
          if (terminais.length === 0) {
            hasMore = false
            break
          }

          // Cria configurações padrão para cada terminal
          const newConfigs: TerminalConfig[] = terminais.map((terminal: any) => ({
            terminalId: terminal.id || terminal._id,
            nome: terminal.nome || terminal.name || 'Terminal sem nome',
            modelo: 'generico',
            modeloDisplay: 'Genérico',
            ip: '192.168.1.100',
            porta: '9100',
            modoFicha: true,
            ativo: true,
            isHovering: false,
          }))

          setTerminaisConfig(prev => {
            const existingIds = new Set(prev.map(t => t.terminalId))
            const unique = newConfigs.filter(t => !existingIds.has(t.terminalId))
            const combined = [...prev, ...unique]
            // Ordena por nome (case-insensitive)
            combined.sort((a, b) =>
              a.nome.localeCompare(b.nome, undefined, { sensitivity: 'base' })
            )
            return combined
          })

          totalLoaded += terminais.length
          hasMore = terminais.length === pageSize
          if (hasMore) {
            offset += terminais.length
          }

          firstRequest = false
        }

        // Proteção: se atingiu o limite de iterações, força parada
        if (iterations >= maxIterations) {
          console.warn('Limite de iterações atingido ao carregar terminais')
          hasMore = false
        }

        setHasMoreTerminals(false)
      } catch (error) {
        console.error('Erro ao carregar terminais:', error)
        setHasMoreTerminals(false)
      } finally {
        setIsLoadingTerminais(false)
        hasLoadedTerminaisRef.current = true
      }
    }, [isEditing, auth, pageSize])

    /**
     * Carrega dados da impressora (para edição ou cópia)
     */
    const loadImpressora = useCallback(async () => {
      // Em modo cópia ou edição, carrega os dados
      if ((!isEditing && !isCopyMode) || !impressoraId || hasLoadedImpressoraRef.current) return

      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingImpressora(true)
      hasLoadedImpressoraRef.current = true

      try {
        const response = await fetch(`/api/impressoras/${impressoraId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Erro ao carregar impressora')
        }

        const data = await response.json()
        const impressora = Impressora.fromJSON(data)

        // Em modo cópia, adiciona " (Cópia)" ao nome
        const nomeBase = impressora.getNome()
        setNome(isCopyMode ? `${nomeBase} (Cópia)` : nomeBase)

        // Carrega configurações dos terminais
        // Seguindo o fluxo do Flutter: para cada terminalId em terminaisConfig, busca o terminal individualmente
        // A API retorna terminaisConfig com a estrutura: { terminalId, modelo, ativo, modoFicha, tipoConexao, ip, porta }
        // IMPORTANTE: Usar data diretamente, não impressora.toJSON(), pois toJSON() pode não incluir terminaisConfig
        const terminaisConfigData = data.terminaisConfig || data.terminais || []

        console.log('=== DEBUG CARREGAMENTO IMPRESSORA ===')
        console.log('Dados completos da impressora:', JSON.stringify(data, null, 2))
        console.log('Terminais config:', terminaisConfigData)
        console.log(
          'Tipo de terminaisConfig:',
          typeof terminaisConfigData,
          Array.isArray(terminaisConfigData)
        )
        console.log('=====================================')

        const configs: TerminalConfig[] = []

        // Se não há terminais configurados, apenas define lista vazia
        if (!Array.isArray(terminaisConfigData) || terminaisConfigData.length === 0) {
          console.warn('Nenhum terminal configurado encontrado na impressora')
          setTerminaisConfig([])
          setIsLoadingImpressora(false)
          return
        }

        // Busca todos os terminais de uma vez para mapear nomes (mais eficiente)
        // Depois faz o match com os terminais configurados
        let allTerminaisMap = new Map<string, any>()
        try {
          let offset = 0
          let hasMore = true
          while (hasMore) {
            const terminalResponse = await fetch(`/api/terminais?limit=100&offset=${offset}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            })

            if (terminalResponse.ok) {
              const terminaisData = await terminalResponse.json()
              const terminais = terminaisData.items || []

              // Cria um mapa de terminais por ID para busca rápida
              terminais.forEach((t: any) => {
                const tId = t.id || t._id
                if (tId) {
                  allTerminaisMap.set(tId.toString(), t)
                  // Também adiciona sem conversão para garantir match
                  if (tId.toString() !== tId) {
                    allTerminaisMap.set(tId, t)
                  }
                }
              })

              hasMore = terminais.length === 100
              offset += terminais.length
            } else {
              hasMore = false
            }
          }
          console.log('Terminais encontrados no sistema:', allTerminaisMap.size)
        } catch (error) {
          console.error('Erro ao buscar terminais:', error)
        }

        // Para cada terminal configurado, busca o nome do terminal (seguindo o fluxo do Flutter)
        // A estrutura da API é: { terminalId, modelo, ativo, modoFicha, tipoConexao, ip, porta }
        for (const config of terminaisConfigData) {
          const terminalId = config.terminalId

          if (!terminalId) {
            console.warn('Terminal config sem terminalId:', config)
            continue
          }

          // Busca o terminal no mapa (equivalente ao TerminaisGroup.buscarTerminalIdCall do Flutter)
          const terminal =
            allTerminaisMap.get(terminalId.toString()) || allTerminaisMap.get(terminalId)
          const terminalName = terminal?.nome || terminal?.name || terminalId

          console.log(`Terminal ${terminalId}:`, { encontrado: !!terminal, nome: terminalName })

          // Monta a configuração do terminal (seguindo o padrão do Flutter)
          const modeloDB = config.modelo || 'generico'
          configs.push({
            terminalId: terminalId,
            nome: terminalName,
            modelo: modeloDB,
            modeloDisplay: MODELO_MAP[modeloDB] || 'Genérico',
            ip: config.ip || '192.168.1.100',
            porta: config.porta || '9100',
            modoFicha:
              config.modoFicha === true ||
              config.modoFicha === 'true' ||
              config.modoFicha === undefined,
            ativo: config.ativo === true || config.ativo === 'true' || config.ativo === undefined,
            isHovering: false,
          })
        }

        console.log('Configurações montadas:', configs.length)

        // Ordena por nome (case-insensitive)
        configs.sort((a, b) => a.nome.localeCompare(b.nome, undefined, { sensitivity: 'base' }))
        setTerminaisConfig(configs)
      } catch (error) {
        console.error('Erro ao carregar impressora:', error)
      } finally {
        setIsLoadingImpressora(false)
      }
    }, [isEditing, isCopyMode, impressoraId, auth])

    // Carrega dados iniciais
    useEffect(() => {
      if (!isAuthenticated) return

      // Se está em modo cópia ou edição, carrega os dados da impressora
      if (impressoraId && (isEditing || isCopyMode)) {
        loadImpressora()
      } else {
        loadAllTerminais()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, isEditing, isCopyMode, impressoraId])

    // Salva estado inicial após carregar dados
    useEffect(() => {
      if (
        hasLoadedImpressoraRef.current &&
        nome &&
        terminaisConfig.length > 0 &&
        nomeInicial === ''
      ) {
        setNomeInicial(nome)
        setTerminaisConfigInicial(JSON.parse(JSON.stringify(terminaisConfig)))
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nome, terminaisConfig])

    // Scroll infinito para carregar mais terminais (se necessário)
    useEffect(() => {
      const container = scrollContainerRef.current
      if (!container || isEditing) return // Não usa scroll infinito na edição

      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = container
        if (scrollTop + clientHeight >= scrollHeight - 200 && !isLoadingMore && hasMoreTerminals) {
          loadTerminais(currentPage, false)
        }
      }

      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }, [currentPage, hasMoreTerminals, isLoadingMore, isEditing, loadTerminais])

    /**
     * Verifica se há mudanças não salvas
     */
    const hasUnsavedChanges = (): boolean => {
      // Verifica se o nome mudou
      if (nome !== nomeInicial) {
        return true
      }

      // Verifica se há diferenças nos terminais
      if (terminaisConfig.length !== terminaisConfigInicial.length) {
        return true
      }

      // Compara cada terminal
      for (const config of terminaisConfig) {
        const inicial = terminaisConfigInicial.find(t => t.terminalId === config.terminalId)

        if (!inicial) {
          return true // Terminal novo
        }

        // Compara campos
        if (
          config.modelo !== inicial.modelo ||
          config.ip !== inicial.ip ||
          config.porta !== inicial.porta ||
          config.modoFicha !== inicial.modoFicha ||
          config.ativo !== inicial.ativo
        ) {
          return true
        }
      }

      return false
    }

    /**
     * Salva o estado inicial após carregar dados
     */
    const saveInitialState = () => {
      setNomeInicial(nome)
      setTerminaisConfigInicial(JSON.parse(JSON.stringify(terminaisConfig)))
    }

    /**
     * Funções de seleção de terminais
     */
    const toggleTerminalSelection = (terminalId: string) => {
      setSelectedTerminalIds(prev => {
        const newSet = new Set(prev)
        if (newSet.has(terminalId)) {
          newSet.delete(terminalId)
        } else {
          newSet.add(terminalId)
        }
        return newSet
      })
    }

    const toggleSelectAll = () => {
      setSelectedTerminalIds(prev => {
        if (prev.size === terminaisConfig.length) {
          // Se todos estão selecionados, desmarca todos
          return new Set()
        } else {
          // Seleciona todos
          return new Set(terminaisConfig.map(t => t.terminalId))
        }
      })
    }

    const clearSelection = () => {
      setSelectedTerminalIds(new Set())
    }

    const isTerminalSelected = (terminalId: string): boolean => {
      return selectedTerminalIds.has(terminalId)
    }

    const isAllSelected = (): boolean => {
      return terminaisConfig.length > 0 && selectedTerminalIds.size === terminaisConfig.length
    }

    const toggleTerminalExpanded = (terminalId: string) => {
      setExpandedTerminalIds(prev => {
        const newSet = new Set(prev)
        if (newSet.has(terminalId)) {
          newSet.delete(terminalId)
        } else {
          newSet.add(terminalId)
        }
        return newSet
      })
    }

    /**
     * Valida campo antes de aplicar
     */
    const validateField = (field: keyof TerminalConfig, value: string | boolean): boolean => {
      if (field === 'ip') {
        const ip = value as string
        if (!ip || ip.trim() === '') return false
        // Valida formato básico de IP (###.###.###.###)
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
        if (!ipRegex.test(ip)) return false
        // Valida que cada octeto está entre 0 e 255
        const parts = ip.split('.')
        return parts.every(part => {
          const num = parseInt(part, 10)
          return !isNaN(num) && num >= 0 && num <= 255
        })
      }
      if (field === 'porta') {
        const porta = value as string
        if (!porta || porta.trim() === '') return false
        // Porta deve ser número entre 1 e 65535
        const numPorta = parseInt(porta, 10)
        return !isNaN(numPorta) && numPorta >= 1 && numPorta <= 65535
      }
      if (field === 'modeloDisplay') {
        const modelo = value as string
        return modelo !== '' && MODELOS_OPTIONS.includes(modelo)
      }
      return true
    }

    /**
     * Valida campo IP quando perde o foco
     */
    const validateIPOnBlur = (ip: string): boolean => {
      if (!ip || ip.trim() === '') return true // Permite campo vazio

      // Valida formato básico de IP (###.###.###.###)
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
      if (!ipRegex.test(ip)) {
        showToast.error('IP inválido. Use o formato: 192.168.1.100 (cada octeto entre 0-255)')
        return false
      }

      // Valida que cada octeto está entre 0 e 255
      const parts = ip.split('.')
      const isValid = parts.every(part => {
        const num = parseInt(part, 10)
        return !isNaN(num) && num >= 0 && num <= 255
      })

      if (!isValid) {
        showToast.error('IP inválido. Cada octeto deve estar entre 0 e 255')
        return false
      }

      return true
    }

    /**
     * Atualiza configuração de um terminal ou múltiplos terminais selecionados
     * Não valida durante a digitação, apenas formata
     */
    const updateTerminalConfig = (
      index: number,
      field: keyof TerminalConfig,
      value: string | boolean
    ) => {
      // Se há terminais selecionados e o terminal editado está selecionado, aplica a todos
      const currentTerminal = terminaisConfig[index]
      const shouldApplyToSelected =
        selectedTerminalIds.size > 0 && selectedTerminalIds.has(currentTerminal.terminalId)

      setTerminaisConfig(prev => {
        const updated = [...prev]

        // Processa o valor formatado
        let processedValue: string | boolean = value
        if (field === 'modeloDisplay') {
          // Não precisa processar, já é string
          processedValue = value as string
        } else if (field === 'ip') {
          // IP sem formatação automática - usuário digita manualmente
          processedValue = value as string
        } else if (field === 'porta') {
          const digits = (value as string).replace(/\D/g, '').slice(0, 5)
          processedValue = digits
        } else {
          processedValue = value
        }

        if (shouldApplyToSelected) {
          // Aplica a todos os terminais selecionados
          // Não mostra toast aqui, pois é edição em lote automática durante digitação
          updated.forEach((config, idx) => {
            if (selectedTerminalIds.has(config.terminalId)) {
              const configCopy = { ...config }

              if (field === 'modeloDisplay') {
                configCopy.modeloDisplay = processedValue as string
                configCopy.modelo = MODELO_REVERSE_MAP[processedValue as string] || 'generico'
              } else if (field === 'ip') {
                configCopy.ip = processedValue as string
              } else if (field === 'porta') {
                configCopy.porta = processedValue as string
              } else {
                ;(configCopy as any)[field] = processedValue
              }

              updated[idx] = configCopy
            }
          })

          // Toast removido - não mostra mensagem durante edição individual
        } else {
          // Aplica apenas ao terminal específico
          const config = { ...updated[index] }

          if (field === 'modeloDisplay') {
            config.modeloDisplay = processedValue as string
            config.modelo = MODELO_REVERSE_MAP[processedValue as string] || 'generico'
          } else if (field === 'ip') {
            config.ip = processedValue as string
          } else if (field === 'porta') {
            config.porta = processedValue as string
          } else {
            ;(config as any)[field] = processedValue
          }

          updated[index] = config
        }

        return updated
      })
    }

    /**
     * Aplica valor em lote para todos os terminais selecionados (usado pela barra de ações)
     */
    const applyBulkUpdate = (field: keyof TerminalConfig, value: string | boolean) => {
      if (selectedTerminalIds.size === 0) {
        showToast.error('Selecione pelo menos um terminal')
        return
      }

      // Valida o campo antes de aplicar
      let errorMsg = 'Valor inválido'
      if (field === 'ip') {
        errorMsg = 'IP inválido. Use o formato: 192.168.1.100 (cada octeto entre 0-255)'
      } else if (field === 'porta') {
        errorMsg = 'Porta inválida. Use um número entre 1 e 65535'
      } else if (field === 'modeloDisplay') {
        errorMsg = 'Modelo inválido. Selecione um modelo válido'
      }

      if (!validateField(field, value)) {
        showToast.error(errorMsg)
        return
      }

      setTerminaisConfig(prev => {
        const updated = [...prev]
        let processedValue: string | boolean = value

        // Processa o valor formatado
        if (field === 'modeloDisplay') {
          processedValue = value as string
        } else if (field === 'ip') {
          // IP sem formatação automática - usuário digita manualmente
          processedValue = value as string
        } else if (field === 'porta') {
          const digits = (value as string).replace(/\D/g, '').slice(0, 5)
          processedValue = digits
        } else {
          processedValue = value
        }

        // Aplica a todos os terminais selecionados
        updated.forEach((config, idx) => {
          if (selectedTerminalIds.has(config.terminalId)) {
            const configCopy = { ...config }

            if (field === 'modeloDisplay') {
              configCopy.modeloDisplay = processedValue as string
              configCopy.modelo = MODELO_REVERSE_MAP[processedValue as string] || 'generico'
            } else if (field === 'ip') {
              configCopy.ip = processedValue as string
            } else if (field === 'porta') {
              configCopy.porta = processedValue as string
            } else {
              ;(configCopy as any)[field] = processedValue
            }

            updated[idx] = configCopy
          }
        })

        return updated
      })

      showToast.success(`Alteração aplicada a ${selectedTerminalIds.size} terminal(is)`)
    }

    /**
     * Salva impressora
     */
    const handleSave = async () => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado')
        return
      }

      if (!nome.trim()) {
        showToast.error('Nome da impressora é obrigatório')
        return
      }

      setIsLoading(true)

      try {
        const formattedDate = new Date().toISOString()

        let impressoraIdToUse = impressoraId

        // Se criando (nova ou cópia), cria a impressora primeiro
        if (!isEditing || isCopyMode) {
          const createBody = {
            nome,
            modelo: 'generico', // Valor padrão
            tipoConexao: 'ethernet',
            ip: '192.168.1.100',
            porta: '9100',
            ativo: true,
            dataCriacao: formattedDate,
            dataAtualizacao: formattedDate,
          }

          const createResponse = await fetch('/api/impressoras', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(createBody),
          })

          if (!createResponse.ok) {
            const errorData = await createResponse.json().catch(() => ({}))
            throw new Error(errorData.error || 'Erro ao criar impressora')
          }

          const createdData = await createResponse.json()
          impressoraIdToUse = createdData.id

          if (!impressoraIdToUse) {
            throw new Error('ID da impressora não retornado')
          }
        }

        // Monta payload de terminais
        const terminais = terminaisConfig.map(config => ({
          terminalId: config.terminalId,
          config: {
            modelo: config.modelo || 'generico',
            ativo: config.ativo !== undefined ? config.ativo : true,
            modoFicha: config.modoFicha !== undefined ? config.modoFicha : true,
            tipoConexao: 'ethernet',
            ip: config.ip || '192.168.1.100',
            porta: config.porta || '9100',
          },
        }))

        // Atualiza impressora com terminais
        const updateBody = {
          nome,
          dataAtualizacao: formattedDate,
          terminais,
        }

        const updateResponse = await fetch(`/api/impressoras/${impressoraIdToUse}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateBody),
        })

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao atualizar impressora')
        }

        showToast.success(
          isEditing && !isCopyMode
            ? 'Impressora atualizada com sucesso!'
            : 'Impressora criada com sucesso!'
        )

        // Atualiza estado inicial após salvar
        setNomeInicial(nome)
        setTerminaisConfigInicial(JSON.parse(JSON.stringify(terminaisConfig)))

        // Remove seleção após salvar
        clearSelection()

        if (isEmbedded) {
          onSaved?.()
        } else {
          router.push('/cadastros/impressoras')
        }
      } catch (error) {
        console.error('Erro ao salvar impressora:', error)
        showToast.error(error instanceof Error ? error.message : 'Erro ao salvar impressora')
      } finally {
        setIsLoading(false)
      }
    }

    /**
     * Função que verifica mudanças antes de fechar
     * Pode ser chamada tanto pelo botão cancelar quanto pelo fechamento do modal (clicar fora)
     */
    const handleRequestClose = useCallback(() => {
      if (hasUnsavedChanges()) {
        setPendingClose(() => {
          if (isEmbedded) {
            return () => onClose?.()
          } else {
            return () => {
              if (window.history.length > 1) {
                router.back()
              } else {
                router.push('/cadastros/impressoras')
              }
            }
          }
        })
        setShowConfirmDialog(true)
      } else {
        if (isEmbedded) {
          onClose?.()
        } else {
          if (window.history.length > 1) {
            router.back()
          } else {
            router.push('/cadastros/impressoras')
          }
        }
      }
    }, [hasUnsavedChanges, isEmbedded, onClose, router])

    /**
     * Cancela e volta
     */
    const handleCancel = () => {
      handleRequestClose()
    }

    // Expõe a função para o componente pai (via callback)
    useEffect(() => {
      if (onRequestClose) {
        onRequestClose(handleRequestClose)
      }
    }, [onRequestClose, handleRequestClose])

    const handleSaveRef = useRef(handleSave)
    handleSaveRef.current = handleSave

    useImperativeHandle(ref, () => ({
      save: () => handleSaveRef.current(),
    }))

    // Estado do rodapé do modal (Salvar / Atualizar)
    useEffect(() => {
      onEmbedChromeStateChange?.({
        canSave: !!nome.trim(),
        isSubmitting: isLoading,
      })
    }, [nome, isLoading, onEmbedChromeStateChange])

    /**
     * Confirma sair sem salvar
     */
    const handleConfirmExit = () => {
      setShowConfirmDialog(false)
      if (pendingClose) {
        pendingClose()
        setPendingClose(null)
      }
    }

    /**
     * Cancela saída e salva antes
     */
    const handleCancelExit = async () => {
      setShowConfirmDialog(false)
      try {
        await handleSave()
        // handleSave já redireciona, então não precisamos chamar pendingClose
      } catch (error) {
        // Se houver erro, não fecha o modal
        console.error('Erro ao salvar:', error)
      }
    }

    // Título dinâmico
    const pageTitle = nome.trim() || 'Nova Impressora'

    if (isLoadingImpressora) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <JiffyLoading />
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col">
        {/* Header fixo — oculto quando o chrome vem do `JiffySidePanelModal` */}
        {!(isEmbedded && hideEmbeddedChrome) && (
          <div className="sticky top-0 z-10 border-b-2 border-primary/70 px-1 py-2 md:px-[30px]">
            <div className="flex items-center justify-between">
              <h1 className="font-exo text-sm font-semibold text-primary md:text-xl">
                {pageTitle}
              </h1>
              <div className="flex flex-col-reverse items-center gap-2 md:flex-row">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="h-8 rounded-lg border border-primary/70 bg-primary/10 px-2 font-exo text-sm font-semibold text-primary transition-colors hover:bg-primary/20 md:px-6"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isLoading || !nome.trim()}
                  className="flex h-8 items-center gap-2 rounded-lg bg-primary px-2 font-exo text-sm font-semibold text-info transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 md:px-8"
                >
                  {isLoading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-info border-t-transparent" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Impressora'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo com scroll */}
        <div className="min-h-0 flex-1">
          <div
            className={cn(
              'space-y-3 py-2',
              isEmbedded && hideEmbeddedChrome ? 'px-4 md:px-4' : 'px-1 md:px-2'
            )}
          >
            {/* Nome — label na borda (outlined), sem título externo */}
            <Input
              label="Nome da Impressora"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              size="small"
              placeholder="Digite o nome da impressora"
              className="bg-info"
              sx={sxInputNomeImpressora}
            />

            {/* Tabela Config. por Terminal */}
            <div className="overflow-x-visible md:overflow-visible">
              <div className="overflow-hidden rounded-lg bg-info md:w-full md:min-w-[min(100%,520px)]">
                <div className="border-b border-primary px-4 py-1">
                  <h2 className="font-exo text-lg font-semibold text-primary">
                    Config. por Terminal
                  </h2>
                </div>

                {/* Barra de ações em lote — sempre visível; aplica só com terminais selecionados */}
                <div className="border-b border-primary px-2 py-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-nunito text-sm font-semibold text-primary-text">
                      {selectedTerminalIds.size === 0 ?
                        'Nenhum terminal selecionado'
                      : `${selectedTerminalIds.size} terminal(is) selecionado(s)`}
                    </span>
                    {selectedTerminalIds.size > 0 ?
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="rounded-lg border border-primary/70 bg-primary/10 px-3 py-1.5 font-exo text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                      >
                        Limpar seleção
                      </button>
                    : null}
                  </div>
                  <div className="space-y-1">
                    {/* Primeira linha: Modelo, IP, Porta */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {/* Aplicar Modelo */}
                        <div className="flex flex-col gap-1">
                          <label className="font-nunito text-xs text-primary-text">Modelo</label>
                          <div className="flex gap-1">
                            <select
                              value={bulkModelo}
                              onChange={e => setBulkModelo(e.target.value)}
                              className="font-nunito h-7 flex-1 rounded-lg border border-primary bg-info px-2 text-xs text-primary-text focus:border-primary focus:outline-none"
                            >
                              <option value="">Selecione...</option>
                              {MODELOS_OPTIONS.map(modelo => (
                                <option key={modelo} value={modelo}>
                                  {modelo}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                if (bulkModelo && MODELOS_OPTIONS.includes(bulkModelo)) {
                                  applyBulkUpdate('modeloDisplay', bulkModelo)
                                  setBulkModelo('')
                                } else if (bulkModelo) {
                                  showToast.error('Modelo inválido')
                                }
                              }}
                              disabled={!bulkModelo || selectedTerminalIds.size === 0}
                              className="whitespace-nowrap rounded-lg border border-primary/70 bg-primary/10 px-2 py-1 font-exo text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <MdCheck className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {/* Aplicar IP */}
                        <div className="flex flex-col gap-1">
                          <label className="font-nunito text-xs text-primary-text">IP</label>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={bulkIP}
                              onChange={e => {
                                // Permite digitação livre sem formatação automática
                                setBulkIP(e.target.value)
                              }}
                              onBlur={e => {
                                // Valida apenas quando perde o foco
                                const ip = e.target.value
                                if (ip && !validateIPOnBlur(ip)) {
                                  // Se inválido, mantém o valor mas mostra erro
                                }
                              }}
                              placeholder="192.168.1.100"
                              className="font-nunito h-7 flex-1 rounded-lg border border-primary bg-info px-2 text-xs text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (bulkIP) {
                                  // Valida antes de aplicar
                                  if (validateIPOnBlur(bulkIP)) {
                                    applyBulkUpdate('ip', bulkIP)
                                    setBulkIP('')
                                  }
                                }
                              }}
                              disabled={!bulkIP || selectedTerminalIds.size === 0}
                              className="whitespace-nowrap rounded-lg border border-primary/70 bg-primary/10 px-2 py-1 font-exo text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <MdCheck className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {/* Aplicar Porta */}
                        <div className="flex flex-col gap-1">
                          <label className="font-nunito text-xs text-primary-text">Porta</label>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={bulkPorta}
                              onChange={e => {
                                const digits = e.target.value.replace(/\D/g, '').slice(0, 5)
                                setBulkPorta(digits)
                              }}
                              placeholder="9100"
                              maxLength={5}
                              className="font-nunito h-7 flex-1 rounded-lg border border-primary bg-info px-2 text-xs text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (bulkPorta) {
                                  applyBulkUpdate('porta', bulkPorta)
                                  setBulkPorta('')
                                }
                              }}
                              disabled={!bulkPorta || selectedTerminalIds.size === 0}
                              className="whitespace-nowrap rounded-lg border border-primary/70 bg-primary/10 px-2 py-1 font-exo text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <MdCheck className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* Segunda linha: Ações Rápidas */}
                      <div className="flex flex-col gap-1">
                        <label className="font-nunito text-xs text-primary-text">
                          Ações Rápidas
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => applyBulkUpdate('modoFicha', true)}
                            disabled={selectedTerminalIds.size === 0}
                            className="whitespace-nowrap rounded-lg border border-primary/70 bg-primary/10 px-3 py-1.5 font-exo text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Modo Ficha ON
                          </button>
                          <button
                            type="button"
                            onClick={() => applyBulkUpdate('modoFicha', false)}
                            disabled={selectedTerminalIds.size === 0}
                            className="whitespace-nowrap rounded-lg border border-primary/70 bg-primary/10 px-3 py-1.5 font-exo text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Modo Ficha OFF
                          </button>
                          <button
                            type="button"
                            onClick={() => applyBulkUpdate('ativo', true)}
                            disabled={selectedTerminalIds.size === 0}
                            className="whitespace-nowrap rounded-lg border border-primary/70 bg-primary/10 px-3 py-1.5 font-exo text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Ativar
                          </button>
                          <button
                            type="button"
                            onClick={() => applyBulkUpdate('ativo', false)}
                            disabled={selectedTerminalIds.size === 0}
                            className="whitespace-nowrap rounded-lg border border-primary/70 bg-primary/10 px-3 py-1.5 font-exo text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Desativar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Cabeçalho (desktop): terminal + toggles; detalhes em área expansível */}
                <div className="hidden bg-custom-2 py-2 md:block rounded-lg mt-2">
                  {/* Mesmo grid que as linhas: títulos centralizados como os switches/botão (flex w-full justify-center) */}
                  <div className={DESKTOP_TERMINAL_ROW_GRID}>
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected()}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 cursor-pointer rounded border-primary bg-info text-primary focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="min-w-0 font-nunito text-sm font-semibold text-primary-text">
                      Terminal
                    </div>
                    <div className="flex min-w-0 w-full justify-center">
                      <span className="font-nunito text-center text-sm font-semibold text-primary-text">
                        Modo Ficha
                      </span>
                    </div>
                    <div className="flex min-w-0 w-full justify-center">
                      <span className="font-nunito text-center text-sm font-semibold text-primary-text">
                        Ativo
                      </span>
                    </div>
                    <div className="flex min-w-0 w-full justify-center">
                      <span className="font-nunito text-center text-sm font-semibold text-primary-text">
                        Rede
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lista de terminais com scroll — scrollbar-gutter evita deslocar colunas em relação ao cabeçalho */}
                <div
                  ref={scrollContainerRef}
                  className="max-h-[500px] overflow-y-auto [scrollbar-gutter:stable]"
                >
                  {(isLoadingTerminais || !hasLoadedTerminaisRef.current) &&
                    terminaisConfig.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-2 py-12">
                        <JiffyLoading />
                      </div>
                    )}
                  {terminaisConfig.length === 0 &&
                    !isLoadingTerminais &&
                    hasLoadedTerminaisRef.current &&
                    !isLoadingMore && (
                      <div className="flex flex-col items-center justify-center gap-4 py-12">
                        <MdPhone className="text-secondary-text" size={48} />
                        <p className="text-lg font-semibold text-primary-text">
                          Nenhum terminal cadastrado
                        </p>
                        <p className="max-w-xs text-center text-sm text-secondary-text">
                          Parece que você ainda não tem nenhum terminal cadastrado. Cadastre um
                          terminal na seção de configurações para começar a configurar impressoras.
                        </p>
                      </div>
                    )}

                  {terminaisConfig.map((config, index) => {
                    const isZebraEven = index % 2 === 0
                    const bgClass = isZebraEven ? 'bg-gray-50' : 'bg-white'
                    const isExpanded = expandedTerminalIds.has(config.terminalId)

                    return (
                      <div
                        key={config.terminalId}
                        className="gap-1 px-2 md:px-0"
                        onMouseEnter={() => {
                          setTerminaisConfig(prev => {
                            const updated = [...prev]
                            updated[index] = { ...updated[index], isHovering: true }
                            return updated
                          })
                        }}
                        onMouseLeave={() => {
                          setTerminaisConfig(prev => {
                            const updated = [...prev]
                            updated[index] = { ...updated[index], isHovering: false }
                            return updated
                          })
                        }}
                      >
                        {/* Desktop: linha resumo + área expansível (modelo / IP / porta) */}
                        <div
                          className={cn(
                            'hidden rounded-lg border border-transparent md:block',
                            bgClass,
                            isTerminalSelected(config.terminalId) && 'ring-2 ring-primary'
                          )}
                        >
                          <div
                            className={cn(
                              DESKTOP_TERMINAL_ROW_GRID,
                              'py-1 transition-colors hover:bg-primary/10'
                            )}
                          >
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isTerminalSelected(config.terminalId)}
                                onChange={() => toggleTerminalSelection(config.terminalId)}
                                className="h-4 w-4 cursor-pointer rounded border-primary bg-info text-primary focus:ring-2 focus:ring-primary"
                                onClick={e => e.stopPropagation()}
                              />
                            </div>
                            <div className="font-nunito min-w-0 truncate text-sm text-primary-text">
                              {config.nome}
                            </div>
                            <div className="flex min-w-0 w-full justify-center">
                              <JiffyIconSwitch
                                checked={config.modoFicha}
                                onChange={e =>
                                  updateTerminalConfig(index, 'modoFicha', e.target.checked)
                                }
                                size="xs"
                                className="justify-center gap-0 px-0 py-0"
                                inputProps={{
                                  'aria-label': `Modo ficha — ${config.nome}`,
                                }}
                              />
                            </div>
                            <div className="flex min-w-0 w-full justify-end pr-3">
                              <JiffyIconSwitch
                                checked={config.ativo}
                                onChange={e =>
                                  updateTerminalConfig(index, 'ativo', e.target.checked)
                                }
                                size="xs"
                                className="justify-center gap-0 px-0 py-0"
                                inputProps={{
                                  'aria-label': `Ativo — ${config.nome}`,
                                }}
                              />
                            </div>
                            <div className="flex min-w-0 w-full justify-end">
                              <button
                                type="button"
                                onClick={() => toggleTerminalExpanded(config.terminalId)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-primary/15"
                                aria-expanded={isExpanded}
                                aria-label={
                                  isExpanded
                                    ? 'Ocultar modelo, IP e porta'
                                    : 'Mostrar modelo, IP e porta'
                                }
                              >
                                {isExpanded ? (
                                  <MdExpandLess className="h-6 w-6" />
                                ) : (
                                  <MdExpandMore className="h-6 w-6" />
                                )}
                              </button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="border-t border-primary/20 bg-gray-50/90 px-4 py-3">
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="space-y-1">
                                  <label className="font-nunito text-xs text-primary-text">
                                    Modelo
                                  </label>
                                  <select
                                    value={config.modeloDisplay}
                                    onChange={e =>
                                      updateTerminalConfig(index, 'modeloDisplay', e.target.value)
                                    }
                                    className="font-nunito h-8 w-full rounded-lg border border-primary bg-info px-3 text-sm text-primary-text focus:border-primary focus:outline-none"
                                  >
                                    {MODELOS_OPTIONS.map(modelo => (
                                      <option key={modelo} value={modelo}>
                                        {modelo}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="font-nunito text-xs text-primary-text">
                                    IP
                                  </label>
                                  <input
                                    type="text"
                                    value={config.ip}
                                    onChange={e =>
                                      updateTerminalConfig(index, 'ip', e.target.value)
                                    }
                                    onBlur={e => {
                                      const ip = e.target.value
                                      if (ip && !validateIPOnBlur(ip)) {
                                        // validação exibida pelo toast em validateIPOnBlur
                                      }
                                    }}
                                    placeholder="192.168.1.100"
                                    className="font-nunito h-8 w-full rounded-lg border border-primary bg-info px-3 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="font-nunito text-xs text-primary-text">
                                    Porta
                                  </label>
                                  <input
                                    type="text"
                                    value={config.porta}
                                    onChange={e =>
                                      updateTerminalConfig(index, 'porta', e.target.value)
                                    }
                                    placeholder="9100"
                                    maxLength={5}
                                    className="font-nunito h-8 w-full rounded-lg border border-primary bg-info px-3 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Mobile: mesma lógica — resumo + expansível com modelo/IP/porta */}
                        <div
                          className={cn(
                            'rounded-lg border border-primary/20 md:hidden',
                            bgClass,
                            isTerminalSelected(config.terminalId) && 'ring-2 ring-primary'
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2">
                            <input
                              type="checkbox"
                              checked={isTerminalSelected(config.terminalId)}
                              onChange={() => toggleTerminalSelection(config.terminalId)}
                              className="h-4 w-4 shrink-0 cursor-pointer rounded border-primary bg-info text-primary focus:ring-2 focus:ring-primary"
                            />
                            <span className="font-nunito min-w-0 flex-[1_1_8rem] truncate text-sm font-medium text-primary-text">
                              {config.nome}
                            </span>
                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 sm:gap-4">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="font-nunito text-[10px] leading-none text-secondary-text">
                                  Modo Ficha
                                </span>
                                <JiffyIconSwitch
                                  checked={config.modoFicha}
                                  onChange={e =>
                                    updateTerminalConfig(index, 'modoFicha', e.target.checked)
                                  }
                                  size="sm"
                                  className="justify-center gap-0 px-0 py-0"
                                  inputProps={{
                                    'aria-label': `Modo ficha — ${config.nome}`,
                                  }}
                                />
                              </div>
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="font-nunito text-[10px] leading-none text-secondary-text">
                                  Ativo
                                </span>
                                <JiffyIconSwitch
                                  checked={config.ativo}
                                  onChange={e =>
                                    updateTerminalConfig(index, 'ativo', e.target.checked)
                                  }
                                  size="sm"
                                  className="justify-center gap-0 px-0 py-0"
                                  inputProps={{
                                    'aria-label': `Ativo — ${config.nome}`,
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleTerminalExpanded(config.terminalId)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-primary/15"
                                aria-expanded={isExpanded}
                                aria-label={
                                  isExpanded
                                    ? 'Ocultar modelo, IP e porta'
                                    : 'Mostrar modelo, IP e porta'
                                }
                              >
                                {isExpanded ? (
                                  <MdExpandLess className="h-6 w-6" />
                                ) : (
                                  <MdExpandMore className="h-6 w-6" />
                                )}
                              </button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="space-y-3 border-t border-primary/15 px-3 pb-3 pt-2">
                              <div className="space-y-1">
                                <label className="font-nunito text-xs text-primary-text">
                                  Modelo
                                </label>
                                <select
                                  value={config.modeloDisplay}
                                  onChange={e =>
                                    updateTerminalConfig(index, 'modeloDisplay', e.target.value)
                                  }
                                  className="font-nunito h-8 w-full rounded-lg border border-primary bg-info px-3 text-sm text-primary-text focus:border-primary focus:outline-none"
                                >
                                  {MODELOS_OPTIONS.map(modelo => (
                                    <option key={modelo} value={modelo}>
                                      {modelo}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="font-nunito text-xs text-primary-text">IP</label>
                                <input
                                  type="text"
                                  value={config.ip}
                                  onChange={e => updateTerminalConfig(index, 'ip', e.target.value)}
                                  onBlur={e => {
                                    const ip = e.target.value
                                    if (ip && !validateIPOnBlur(ip)) {
                                      // validação via toast
                                    }
                                  }}
                                  placeholder="192.168.1.100"
                                  className="font-nunito h-8 w-full rounded-lg border border-primary bg-info px-3 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-nunito text-xs text-primary-text">
                                  Porta
                                </label>
                                <input
                                  type="text"
                                  value={config.porta}
                                  onChange={e =>
                                    updateTerminalConfig(index, 'porta', e.target.value)
                                  }
                                  placeholder="9100"
                                  maxLength={5}
                                  className="font-nunito h-8 w-full rounded-lg border border-primary bg-info px-3 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {isLoadingMore && terminaisConfig.length > 0 && (
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <JiffyLoading />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Diálogo de confirmação para sair sem salvar */}
        {showConfirmDialog && (
          <div
            className={cn(
              'fixed inset-0 flex items-center justify-center bg-black/50 md:p-4',
              isEmbedded && hideEmbeddedChrome ? 'z-[1400]' : 'z-50'
            )}
          >
            <div className="w-[85vw] max-w-[85vw] rounded-lg bg-white p-6 shadow-lg md:w-auto md:max-w-md">
              <h3 className="mb-4 text-lg font-semibold text-primary-text">
                Alterações não salvas
              </h3>
              <p className="mb-6 text-secondary-text">
                Você tem alterações não salvas. Deseja salvar antes de sair?
              </p>
              <div className="flex flex-col justify-end gap-3 md:flex-row">
                <button
                  onClick={() => {
                    setShowConfirmDialog(false)
                    setPendingClose(null)
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-primary-text transition-colors hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmExit}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-primary-text transition-colors hover:bg-gray-300"
                >
                  Sair sem salvar
                </button>
                <button
                  onClick={handleCancelExit}
                  className="rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/90"
                >
                  Salvar e sair
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
)

NovaImpressora.displayName = 'NovaImpressora'

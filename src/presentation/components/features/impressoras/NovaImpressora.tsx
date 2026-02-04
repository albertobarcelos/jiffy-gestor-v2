'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Impressora } from '@/src/domain/entities/Impressora'
import { showToast } from '@/src/shared/utils/toast'

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

interface NovaImpressoraProps {
  impressoraId?: string
  isCopyMode?: boolean // Se true, carrega dados mas cria nova impressora ao salvar
  isEmbedded?: boolean
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
  'Genérico': 'generico',
  'Sunmi Integrada': 'sunmiIntegrada',
  'Stone Integrada': 'stoneIntegrada',
  'Pagbank Integrada': 'pagbankIntegrada',
}

const MODELOS_OPTIONS = ['Genérico', 'Sunmi Integrada', 'Stone Integrada', 'Pagbank Integrada']

/**
 * Componente para criar/editar impressora
 * Replica o design e funcionalidades do Flutter conforme prompt
 */
export function NovaImpressora({
  impressoraId,
  isCopyMode = false,
  isEmbedded = false,
  onClose,
  onSaved,
  onRequestClose,
}: NovaImpressoraProps) {
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
  
  const hasLoadedImpressoraRef = useRef(false)
  const hasLoadedTerminaisRef = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const pageSize = 10

  /**
   * Aplica máscara de IP (###.###.#.###)
   */
  const formatIP = (value: string): string => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '')
    
    // Limita a 11 dígitos (máximo para IP)
    const limited = digits.slice(0, 11)
    
    // Aplica máscara
    if (limited.length <= 3) return limited
    if (limited.length <= 6) return `${limited.slice(0, 3)}.${limited.slice(3)}`
    if (limited.length <= 9) return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}.${limited.slice(9)}`
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

        setTerminaisConfig((prev) => {
          if (reset) {
            return newConfigs
          }
          // Evita duplicatas
          const existingIds = new Set(prev.map((t) => t.terminalId))
          const unique = newConfigs.filter((t) => !existingIds.has(t.terminalId))
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

    // Carrega primeira página
    await loadTerminais(0, true)

    // Carrega páginas restantes sequencialmente
    let offset = pageSize
    let hasMore = true
    
    while (hasMore) {
      const token = auth?.getAccessToken()
      if (!token) break

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

        if (!response.ok) break

        const data = await response.json()
        const terminais = data.items || []

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

        setTerminaisConfig((prev) => {
          const existingIds = new Set(prev.map((t) => t.terminalId))
          const unique = newConfigs.filter((t) => !existingIds.has(t.terminalId))
          const combined = [...prev, ...unique]
          // Ordena por nome (case-insensitive)
          combined.sort((a, b) => a.nome.localeCompare(b.nome, undefined, { sensitivity: 'base' }))
          return combined
        })

        hasMore = terminais.length === pageSize
        if (hasMore) {
          offset += terminais.length
        }
      } catch (error) {
        console.error('Erro ao carregar terminais:', error)
        hasMore = false
      }
    }

    setHasMoreTerminals(false)
    setIsLoadingTerminais(false)
    hasLoadedTerminaisRef.current = true
  }, [isEditing, auth])

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
      console.log('Tipo de terminaisConfig:', typeof terminaisConfigData, Array.isArray(terminaisConfigData))
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
        const terminal = allTerminaisMap.get(terminalId.toString()) || allTerminaisMap.get(terminalId)
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
          modoFicha: config.modoFicha === true || config.modoFicha === 'true' || config.modoFicha === undefined,
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
    if (hasLoadedImpressoraRef.current && nome && terminaisConfig.length > 0 && nomeInicial === '') {
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
      if (
        scrollTop + clientHeight >= scrollHeight - 200 &&
        !isLoadingMore &&
        hasMoreTerminals
      ) {
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
      const inicial = terminaisConfigInicial.find((t) => t.terminalId === config.terminalId)
      
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
   * Atualiza configuração de um terminal
   */
  const updateTerminalConfig = (
    index: number,
    field: keyof TerminalConfig,
    value: string | boolean
  ) => {
    setTerminaisConfig((prev) => {
      const updated = [...prev]
      const config = { ...updated[index] }

      if (field === 'modeloDisplay') {
        config.modeloDisplay = value as string
        config.modelo = MODELO_REVERSE_MAP[value as string] || 'generico'
      } else if (field === 'ip') {
        config.ip = formatIP(value as string)
      } else if (field === 'porta') {
        // Limita porta a 5 dígitos e apenas números
        const digits = (value as string).replace(/\D/g, '').slice(0, 5)
        config.porta = digits
      } else {
        ;(config as any)[field] = value
      }

      updated[index] = config
      return updated
    })
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
      const terminais = terminaisConfig.map((config) => ({
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

      showToast.success(isEditing && !isCopyMode ? 'Impressora atualizada com sucesso!' : 'Impressora criada com sucesso!')
      
      // Atualiza estado inicial após salvar
      setNomeInicial(nome)
      setTerminaisConfigInicial(JSON.parse(JSON.stringify(terminaisConfig)))
      
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
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <img
          src="/images/jiffy-loading.gif"
          alt="Carregando..."
          className="w-20 h-20"
        />
        <span className="text-sm font-medium text-primary-text font-nunito">Carregando...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-primary-bg">
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-primary-bg md:px-[30px] px-1 py-2 border-b-2 border-primary/70">
        <div className="flex items-center justify-between">
          <h1 className="text-primary md:text-xl text-sm font-bold font-exo">{pageTitle}</h1>
          <div className="flex md:flex-row flex-col-reverse items-center gap-2">
          <button
            onClick={handleCancel}
            className="h-8 md:px-6 px-2 rounded-lg border border-primary/70 text-primary bg-primary/10 hover:bg-primary/20 font-semibold font-exo text-sm transition-colors"
          >
            Cancelar
          </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !nome.trim()}
              className="h-8 md:px-8 px-2 bg-primary text-info rounded-lg font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-info border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Impressora'
              )}
            </button>
            </div>
        </div>
      </div>

      {/* Conteúdo com scroll */}
      <div className="flex-1">
        <div className="md:px-[30px] px-1 py-2 space-y-3">
          {/* Campo Nome da Impressora */}
          <div>
            <label className="block text-sm font-medium text-primary-text mb-2">
              Nome da Impressora *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              placeholder="Digite o nome da impressora"
              className="w-full h-8 px-4 py-3 rounded-lg border border-primary-text/50 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary font-nunito text-sm"
            />
          </div>

          {/* Tabela Config. por Terminal */}
          <div className="md:overflow-visible overflow-x-auto">
            <div className="bg-info rounded-lg overflow-hidden md:w-full min-w-[800px]">
              <div className="px-4 py-3 border-b border-primary">
                <h2 className="text-primary text-lg font-semibold font-exo">
                  Config. por Terminal
                </h2>
              </div>

              {/* Cabeçalho da tabela */}
              <div className="px-4 py-3 bg-custom-2 border-b border-primary">
                <div className="grid grid-cols-[2fr_2fr_2fr_2fr_1fr_1fr] gap-4 items-center">
                  <div className="font-nunito font-semibold text-sm text-primary-text">Terminal</div>
                  <div className="font-nunito font-semibold text-sm text-primary-text">Modelo</div>
                  <div className="font-nunito font-semibold text-sm text-primary-text">IP</div>
                  <div className="font-nunito font-semibold text-sm text-primary-text">Porta</div>
                  <div className="font-nunito font-semibold text-sm text-primary-text text-center">Modo Ficha</div>
                  <div className="font-nunito font-semibold text-sm text-primary-text text-center">Ativo</div>
                </div>
              </div>

              {/* Lista de terminais com scroll */}
              <div
                ref={scrollContainerRef}
                className="max-h-[500px] overflow-y-auto"
              >
              {(isLoadingTerminais || !hasLoadedTerminaisRef.current) && terminaisConfig.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <img
                    src="/images/jiffy-loading.gif"
                    alt="Carregando..."
                    className="w-20 h-20"
                  />
                  <span className="text-sm font-medium text-primary-text font-nunito">Carregando...</span>
                </div>
              )}
              {terminaisConfig.length === 0 && !isLoadingTerminais && hasLoadedTerminaisRef.current && !isLoadingMore && (
                <div className="flex items-center justify-center py-12">
                  <p className="text-secondary-text">Nenhum terminal encontrado.</p>
                </div>
              )}

              {terminaisConfig.map((config, index) => {
                const isZebraEven = index % 2 === 0
                const bgClass = isZebraEven ? 'bg-gray-50' : 'bg-white'

                return (
                <div
                  key={config.terminalId}
                  className='px-2 py-2 gap-2'
                  onMouseEnter={() => {
                    setTerminaisConfig((prev) => {
                      const updated = [...prev]
                      updated[index] = { ...updated[index], isHovering: true }
                      return updated
                    })
                  }}
                  onMouseLeave={() => {
                    setTerminaisConfig((prev) => {
                      const updated = [...prev]
                      updated[index] = { ...updated[index], isHovering: false }
                      return updated
                    })
                  }}
                >
                  <div className={`${bgClass} grid grid-cols-[2fr_2fr_2fr_2fr_1fr_1fr] px-2 py-2 gap-2 items-center rounded-lg hover:bg-primary/10 transition-colors`}>
                    {/* Terminal */}
                    <div className="font-nunito text-sm text-primary-text">{config.nome}</div>

                    {/* Modelo */}
                    <div>
                      <select
                        value={config.modeloDisplay}
                        onChange={(e) => updateTerminalConfig(index, 'modeloDisplay', e.target.value)}
                        className="w-full h-8 px-3 rounded-lg border border-primary bg-info text-primary-text focus:outline-none focus:border-primary font-nunito text-sm"
                      >
                        {MODELOS_OPTIONS.map((modelo) => (
                          <option key={modelo} value={modelo}>
                            {modelo}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* IP */}
                    <div>
                      <input
                        type="text"
                        value={config.ip}
                        onChange={(e) => updateTerminalConfig(index, 'ip', e.target.value)}
                        placeholder="192.168.1.100"
                        className="w-full h-8 px-3 rounded-lg border border-primary bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary font-nunito text-sm"
                      />
                    </div>

                    {/* Porta */}
                    <div>
                      <input
                        type="text"
                        value={config.porta}
                        onChange={(e) => updateTerminalConfig(index, 'porta', e.target.value)}
                        placeholder="9100"
                        maxLength={5}
                        className="w-full h-8 px-3 rounded-lg border border-primary bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary font-nunito text-sm"
                      />
                    </div>

                    {/* Modo Ficha */}
                    <div className="flex justify-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.modoFicha}
                          onChange={(e) => updateTerminalConfig(index, 'modoFicha', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[28px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {/* Ativo */}
                    <div className="flex justify-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.ativo}
                          onChange={(e) => updateTerminalConfig(index, 'ativo', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[28px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>
                )
              })}

              {isLoadingMore && terminaisConfig.length > 0 && (
                <div className="flex flex-col items-center justify-center py-4 gap-2">
                  <img
                    src="/images/jiffy-loading.gif"
                    alt="Carregando..."
                    className="w-16 h-16"
                  />
                  <span className="text-sm font-medium text-primary-text font-nunito">Carregando mais...</span>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diálogo de confirmação para sair sem salvar */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 md:p-4">
          <div className="bg-white rounded-lg p-6 w-[85vw] max-w-[85vw] md:w-auto md:max-w-md shadow-lg">
            <h3 className="text-lg font-semibold text-primary-text mb-4">
              Alterações não salvas
            </h3>
            <p className="text-secondary-text mb-6">
              Você tem alterações não salvas. Deseja salvar antes de sair?
            </p>
            <div className="flex flex-col md:flex-row gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirmDialog(false)
                  setPendingClose(null)
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-primary-text hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmExit}
                className="px-4 py-2 rounded-lg bg-gray-200 text-primary-text hover:bg-gray-300 transition-colors"
              >
                Sair sem salvar
              </button>
              <button
                onClick={handleCancelExit}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
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

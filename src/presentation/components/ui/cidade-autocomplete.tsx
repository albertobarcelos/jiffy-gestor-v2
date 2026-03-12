'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Input } from './input'
import { Label } from './label'

interface Municipio {
  codigoCidadeIbge: string
  nomeCidade: string
}

interface CidadeAutocompleteProps {
  value: string
  onChange: (value: string) => void
  estado: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  onValidationChange?: (isValid: boolean) => void
  // Callback quando uma cidade é selecionada da lista (passa nome e código IBGE)
  onCidadeSelecionada?: (nomeCidade: string, codigoIbge: string) => void
  className?: string
  // Se true, usa input HTML nativo ao invés de Input do MUI
  useNativeInput?: boolean
  // Classes customizadas para o input nativo
  inputClassName?: string
}

// Limite de itens exibidos no dropdown quando não há filtro ativo (Infinity = sem limite)
const MAX_ITENS_SEM_FILTRO = Infinity

// Velocidade de scroll contínuo ao segurar o botão (px por tick)
const SCROLL_SPEED = 8
const SCROLL_INTERVAL_MS = 16 // ~60fps

/**
 * Componente de autocomplete de cidade via API do IBGE.
 *
 * Funcionalidades:
 * - Carrega todas as cidades do estado ao selecionar a UF
 * - Abre o dropdown ao focar no campo (sem precisar digitar)
 * - Filtra a lista localmente enquanto o usuário digita
 * - Botões ▲/▼ com scroll contínuo ao passar o mouse (igual ao Select de estado)
 * - Ao selecionar uma cidade da lista, marca como válido automaticamente
 * - Valida via API ao perder foco caso o usuário tenha digitado sem selecionar da lista
 * - Feedback visual de validação (verde=válido, vermelho=inválido)
 */
export function CidadeAutocomplete({
  value,
  onChange,
  estado,
  label = 'Cidade',
  placeholder = 'Selecione ou digite a cidade',
  required = false,
  disabled = false,
  onValidationChange,
  onCidadeSelecionada,
  className = '',
  useNativeInput = false,
  inputClassName = '',
}: CidadeAutocompleteProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // Lista completa de municípios do estado selecionado
  const [allMunicipios, setAllMunicipios] = useState<Municipio[]>([])
  const [isLoadingMunicipios, setIsLoadingMunicipios] = useState(false)

  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedFromList, setSelectedFromList] = useState(false)

  // Direção de abertura do dropdown: 'down' (abaixo) ou 'up' (acima)
  const [dropdownDirection, setDropdownDirection] = useState<'down' | 'up'>('down')

  // Controle dos botões de scroll do dropdown
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputWrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const valorNoBlurRef = useRef<string>('')
  const cidadeSelecionadaDuranteBlurRef = useRef<boolean>(false)

  // Altura máxima aproximada do dropdown (max-h-52 = 208px + botões de scroll)
  const DROPDOWN_HEIGHT = 260

  // Fechar dropdown ao clicar fora do componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      // Limpar timeout ao desmontar componente
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  /**
   * Normaliza texto para comparação (remove acentos, converte para maiúsculas)
   */
  const normalizar = useCallback((texto: string) => {
    return texto
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }, [])

  // Ao trocar o estado: recarrega os municípios e reseta validação
  useEffect(() => {
    setIsValid(null)
    setErro(null)
    setShowDropdown(false)
    setSelectedFromList(false)
    setAllMunicipios([])
    setCanScrollUp(false)
    setCanScrollDown(false)

    // Notifica o pai que a validação foi invalidada pela troca de UF
    if (estado) {
      onValidationChange?.(false)
      carregarMunicipios(estado)
    }
  }, [estado])

  // Validar automaticamente APENAS quando receber um valor inicial (ao carregar dados)
  // NÃO validar durante a digitação - validação acontece apenas no blur
  useEffect(() => {
    // Só valida se:
    // 1. Há um valor preenchido
    // 2. Há um estado selecionado
    // 3. Os municípios já foram carregados
    // 4. Ainda não foi validado (isValid === null)
    // 5. Não foi selecionado da lista (selectedFromList === false)
    // 6. O valor tem pelo menos 2 caracteres (evita validar "B", "b", etc)
    // 7. O valor não mudou recentemente (evita validar durante digitação)
    if (
      value &&
      value.trim().length >= 2 && // IMPORTANTE: Só validar se tiver pelo menos 2 caracteres
      estado &&
      allMunicipios.length > 0 &&
      !isLoadingMunicipios &&
      isValid === null &&
      !selectedFromList &&
      !cidadeSelecionadaDuranteBlurRef.current // Não validar se uma cidade foi selecionada
    ) {
      // Verifica se o valor está na lista de municípios carregados
      const municipioEncontrado = allMunicipios.find(
        (m) => normalizar(m.nomeCidade) === normalizar(value)
      )

      if (municipioEncontrado) {
        // Se encontrou na lista, marca como válido imediatamente
        setIsValid(true)
        setErro(null)
        onValidationChange?.(true)
      } else {
        // IMPORTANTE: Não validar via API automaticamente durante digitação
        // A validação via API acontece apenas no blur (handleBlur)
        // Isso evita múltiplas requisições enquanto o usuário digita
        // Apenas resetar o estado de validação
        setIsValid(null)
        setErro(null)
        onValidationChange?.(null)
      }
    }
  }, [value, estado, allMunicipios, isLoadingMunicipios, isValid, selectedFromList, onValidationChange, normalizar])

  /**
   * Verifica se a lista pode rolar para cima ou para baixo
   * e atualiza os estados dos botões de scroll
   */
  const checkScrollState = useCallback(() => {
    const el = listRef.current
    if (!el) return
    setCanScrollUp(el.scrollTop > 0)
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1)
  }, [])

  // Atualiza o estado dos botões quando o dropdown abre ou a lista muda
  useEffect(() => {
    if (showDropdown) {
      // Aguarda o DOM renderizar antes de checar o scroll
      requestAnimationFrame(checkScrollState)
    }
  }, [showDropdown, allMunicipios, value, checkScrollState])

  /**
   * Inicia scroll contínuo na direção indicada enquanto o mouse estiver sobre o botão
   */
  const startScrolling = (direction: 'up' | 'down') => {
    stopScrolling()
    scrollIntervalRef.current = setInterval(() => {
      const el = listRef.current
      if (!el) return
      el.scrollTop += direction === 'down' ? SCROLL_SPEED : -SCROLL_SPEED
      checkScrollState()
    }, SCROLL_INTERVAL_MS)
  }

  /**
   * Para o scroll contínuo ao sair do botão
   */
  const stopScrolling = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
  }

  /**
   * Carrega todos os municípios do estado selecionado via API.
   * Executado uma única vez por estado — a filtragem é feita localmente.
   */
  const carregarMunicipios = async (uf: string) => {
    try {
      setIsLoadingMunicipios(true)
      const response = await fetch(`/api/v1/ibge/municipios?uf=${uf}`)

      if (response.ok) {
        const data = await response.json()
        setAllMunicipios(data.municipios || [])
      } else {
        setAllMunicipios([])
      }
    } catch (error) {
      console.error('Erro ao carregar municípios:', error)
      setAllMunicipios([])
    } finally {
      setIsLoadingMunicipios(false)
    }
  }

  /**
   * Filtra a lista de municípios com base no texto digitado.
   * Normaliza acentos e maiúsculas/minúsculas para comparação.
   */
  const municipiosFiltrados = (() => {
    if (!value || value.trim() === '') {
      return allMunicipios.slice(0, MAX_ITENS_SEM_FILTRO)
    }
    const termo = normalizar(value)
    return allMunicipios.filter((m) => normalizar(m.nomeCidade).includes(termo))
  })()

  /**
   * Ao selecionar uma cidade do dropdown:
   * - Primeiro limpa o campo para evitar validação com texto digitado
   * - Depois preenche o campo com o nome oficial do IBGE
   * - Marca como válido imediatamente (sem nova chamada à API)
   * - Fecha o dropdown
   * - Chama onCidadeSelecionada com nome e código IBGE
   * - Cancela qualquer validação pendente do blur
   */
  const handleSelectSuggestion = (municipio: Municipio) => {
    // IMPORTANTE: Marcar ANTES de qualquer outra coisa que uma cidade foi selecionada
    // Isso garante que o handleBlur não execute nenhuma validação
    cidadeSelecionadaDuranteBlurRef.current = true
    
    // Cancelar validação pendente do blur se houver
    // Isso é CRÍTICO - cancela qualquer validação que possa estar aguardando
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    
    // Fechar dropdown imediatamente
    setShowDropdown(false)
    
    // Primeiro limpar o campo para evitar que validação use texto digitado
    // Isso garante que qualquer validação pendente não use o texto parcial digitado
    onChange('')
    setIsValid(null)
    setErro(null)
    setSelectedFromList(false) // Resetar temporariamente
    
    // Usar requestAnimationFrame duplo para garantir que o clear seja processado
    // antes de definir o novo valor, evitando que validações usem o texto digitado
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Agora definir o nome oficial da cidade
        onChange(municipio.nomeCidade)
        setIsValid(true)
        setErro(null)
        setSelectedFromList(true)
        valorNoBlurRef.current = municipio.nomeCidade // Atualizar valor de referência
        
        // IMPORTANTE: Chamar onCidadeSelecionada ANTES de onValidationChange
        // Isso garante que o componente pai atualize o estado antes da validação
        onCidadeSelecionada?.(municipio.nomeCidade, municipio.codigoCidadeIbge)
        
        // Chamar onValidationChange por último, após tudo estar atualizado
        // O componente pai deve verificar se já tem código IBGE antes de fazer qualquer validação
        onValidationChange?.(true)
      })
    })
  }

  /**
   * Calcula se o dropdown deve abrir para cima ou para baixo
   * com base no espaço disponível na viewport
   */
  const calcularDirecao = (): 'down' | 'up' => {
    if (!inputWrapperRef.current) return 'down'
    const rect = inputWrapperRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    return spaceBelow < DROPDOWN_HEIGHT && spaceAbove > spaceBelow ? 'up' : 'down'
  }

  /**
   * Ao digitar: filtra localmente, recalcula direção e reseta a validação anterior
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setIsValid(null)
    setErro(null)
    setSelectedFromList(false)
    setDropdownDirection(calcularDirecao())
    setShowDropdown(true)
    
    // Cancelar validação pendente do blur se usuário continuar digitando
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
  }

  /**
   * Ao focar no campo: calcula a direção e abre o dropdown com a lista de cidades
   */
  const handleFocus = () => {
    if (estado && allMunicipios.length > 0) {
      setDropdownDirection(calcularDirecao())
      setShowDropdown(true)
    }
  }

  /**
   * Ao perder foco: fecha o dropdown e valida a cidade via API
   * apenas se o usuário não selecionou da lista
   * Validação acontece APENAS no blur, não durante a digitação
   */
  const handleBlur = () => {
    // NÃO resetar a flag aqui - ela será verificada dentro do timeout
    // Se resetarmos aqui, perdemos a informação de que uma cidade foi selecionada
    
    // Salvar valor atual para comparar depois
    const valorNoMomentoDoBlur = value
    valorNoBlurRef.current = value
    
    // Limpar timeout anterior se houver
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
    }
    
    // Delay maior (600ms) para dar tempo suficiente para:
    // 1. O mouseDown no dropdown ser registrado
    // 2. O handleSelectSuggestion ser executado completamente
    // 3. O campo ser limpo e depois preenchido com o nome oficial
    // 4. Os callbacks onCidadeSelecionada e onValidationChange serem executados
    blurTimeoutRef.current = setTimeout(async () => {
      blurTimeoutRef.current = null
      
      setShowDropdown(false)

      // PRIORIDADE 1: Se uma cidade foi selecionada durante o delay, NÃO VALIDAR
      // Esta é a verificação mais importante - se uma cidade foi selecionada,
      // não devemos fazer nenhuma validação adicional
      if (cidadeSelecionadaDuranteBlurRef.current || selectedFromList) {
        // Resetar flags apenas após confirmar que não vamos validar
        cidadeSelecionadaDuranteBlurRef.current = false
        setSelectedFromList(false)
        return // SAIR IMEDIATAMENTE - não fazer nenhuma validação
      }

      // PRIORIDADE 2: Verificar se o valor mudou durante o delay
      // Se mudou significativamente, pode ser que uma cidade foi selecionada
      if (valorNoMomentoDoBlur !== value) {
        // Se o campo está vazio, não validar
        if (!value || value.trim() === '') {
          setIsValid(null)
          setErro(null)
          onValidationChange?.(null)
          return
        }
        
        // Se o valor mudou, verificar se corresponde a uma cidade da lista
        // Se corresponder, significa que foi selecionada da lista (mesmo que a flag não tenha sido setada)
        const normalizar = (str: string) => 
          str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        
        const cidadeEncontrada = allMunicipios.find((m) => 
          normalizar(m.nomeCidade) === normalizar(value)
        )
        
        if (cidadeEncontrada) {
          // Cidade encontrada na lista - foi selecionada da lista
          // Marcar como válida SEM chamar API
          setIsValid(true)
          setErro(null)
          onValidationChange?.(true)
          onCidadeSelecionada?.(cidadeEncontrada.nomeCidade, cidadeEncontrada.codigoCidadeIbge)
          return // SAIR - não validar via API
        }
        
        // Valor mudou mas não corresponde a nenhuma cidade da lista
        // Pode ser que o usuário editou manualmente, mas NÃO validar aqui
        // porque pode ser que ainda esteja sendo processada a seleção da lista
        // Deixar o usuário perder o foco novamente ou clicar em salvar para validar
        return
      }

      // PRIORIDADE 3: Verificar se o valor atual corresponde a uma cidade da lista
      // Se sim, não precisa validar via API (foi selecionada da lista ou digitada corretamente)
      const normalizar = (str: string) => 
        str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      
      const cidadeEncontrada = allMunicipios.find((m) => 
        normalizar(m.nomeCidade) === normalizar(value)
      )
      
      if (cidadeEncontrada) {
        // Cidade encontrada na lista, marcar como válida sem chamar API
        setIsValid(true)
        setErro(null)
        onValidationChange?.(true)
        // Passar código IBGE se disponível
        onCidadeSelecionada?.(cidadeEncontrada.nomeCidade, cidadeEncontrada.codigoCidadeIbge)
        return // SAIR - não validar via API
      }

      // PRIORIDADE 4: Validar via API apenas se:
      // - Não encontrou na lista
      // - O valor não mudou durante o delay (usuário digitou e perdeu foco sem selecionar)
      // - O valor tem pelo menos 2 caracteres (evita requisições desnecessárias)
      if (!value || !estado) {
        setIsValid(null)
        onValidationChange?.(null)
        return
      }

      // IMPORTANTE: Não validar valores com menos de 2 caracteres
      // Isso evita requisições desnecessárias como "B", "b", etc
      if (value.trim().length < 2) {
        setIsValid(null) // null = não validado ainda (não é erro, apenas aguardando mais caracteres)
        setErro(null)
        onValidationChange?.(null)
        return
      }

      // Apenas aqui validar via API - quando temos certeza de que:
      // 1. Nenhuma cidade foi selecionada da lista
      // 2. O valor não corresponde a nenhuma cidade da lista
      // 3. O usuário digitou algo (pelo menos 2 caracteres) e perdeu o foco sem selecionar
      await validarCidadeViaAPI(value.trim())
    }, 600) // Aumentado para 600ms para dar mais tempo para seleção da lista
  }

  /**
   * Função auxiliar para validar cidade via API
   * IMPORTANTE: Só deve ser chamada quando temos certeza de que nenhuma cidade foi selecionada da lista
   */
  const validarCidadeViaAPI = async (nomeCidade: string) => {
    if (!nomeCidade || !estado) return

    // Verificação de segurança: se uma cidade foi selecionada durante a validação,
    // não validar via API (pode estar usando texto digitado ao invés do nome oficial)
    if (cidadeSelecionadaDuranteBlurRef.current || selectedFromList) {
      // Cidade foi selecionada, não validar via API
      return
    }

    try {
      setIsValidating(true)
      const response = await fetch(
        `/api/v1/ibge/validar-cidade?cidade=${encodeURIComponent(nomeCidade)}&uf=${estado}`
      )

      if (response.ok) {
        const data = await response.json()
        const valido = data.valido === true

        // Verificar novamente antes de atualizar o estado
        // (pode ter sido selecionada durante a requisição)
        if (cidadeSelecionadaDuranteBlurRef.current || selectedFromList) {
          return // Cidade foi selecionada durante a validação, não atualizar
        }

        setIsValid(valido)
        setErro(valido ? null : `Cidade "${nomeCidade}" não encontrada no estado ${estado}`)
        onValidationChange?.(valido)
      } else {
        // Verificar novamente antes de atualizar o estado
        if (cidadeSelecionadaDuranteBlurRef.current || selectedFromList) {
          return
        }
        setIsValid(false)
        setErro('Erro ao validar cidade')
        onValidationChange?.(false)
      }
    } catch (error) {
      console.error('Erro ao validar cidade:', error)
      // Verificar novamente antes de atualizar o estado
      if (cidadeSelecionadaDuranteBlurRef.current || selectedFromList) {
        return
      }
      setIsValid(false)
      setErro('Erro ao validar cidade')
      onValidationChange?.(false)
    } finally {
      setIsValidating(false)
    }
  }

  const inputClasses = `
    ${useNativeInput ? 'w-full h-8 px-4 rounded-lg border bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50' : ''}
    ${isValid === false ? 'border-red-500 focus:border-red-500' : ''}
    ${isValid === true ? 'border-green-500 focus:border-green-500' : ''}
    ${inputClassName}
  `.trim()

  return (
    <div ref={containerRef} className={`space-y-2 ${className}`}>
      {useNativeInput ? (
        <label className="block text-sm font-medium text-primary-text">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      ) : (
        <Label htmlFor="cidade">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      <div ref={inputWrapperRef} className="relative">
        {useNativeInput ? (
          <input
            id="cidade"
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled || !estado || isLoadingMunicipios}
            className={inputClasses}
            autoComplete="off"
          />
        ) : (
          <Input
            id="cidade"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={isLoadingMunicipios ? 'Carregando cidades...' : placeholder}
            required={required}
            disabled={disabled || !estado || isLoadingMunicipios}
            autoComplete="off"
            className={
              isValid === false
                ? 'border-red-500 focus:border-red-500'
                : isValid === true
                  ? 'border-green-500 focus:border-green-500'
                  : ''
            }
          />
        )}

        {/* Indicadores visuais à direita do input */}
        {(isValidating || isLoadingMunicipios) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {isValid === true && !isValidating && !isLoadingMunicipios && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">✓</div>
        )}
        {isValid === false && !isValidating && !isLoadingMunicipios && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">✗</div>
        )}

        {/* Dropdown de cidades com botões de scroll */}
        {showDropdown && municipiosFiltrados.length > 0 && (
          <div
            className={`absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden ${
              dropdownDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
          >

            {/* Botão scroll para cima */}
            {canScrollUp && (
              <div
                className="flex cursor-default items-center justify-center py-1 hover:bg-gray-50 border-b border-gray-100"
                onMouseEnter={() => startScrolling('up')}
                onMouseLeave={stopScrolling}
              >
                <ChevronUp className="h-4 w-4 text-gray-400" />
              </div>
            )}

            {/* Contador de resultados quando há filtro ativo */}
            {value && value.trim() !== '' && (
              <div className="px-4 py-1 text-xs text-gray-400 border-b border-gray-100 bg-white">
                {municipiosFiltrados.length} cidade{municipiosFiltrados.length !== 1 ? 's' : ''}{' '}
                encontrada{municipiosFiltrados.length !== 1 ? 's' : ''}
              </div>
            )}

            {/* Lista de municípios */}
            <ul
              ref={listRef}
              className="max-h-52 overflow-y-auto"
              onScroll={checkScrollState}
            >
              {municipiosFiltrados.map((municipio) => (
                <li
                  key={municipio.codigoCidadeIbge}
                  onMouseDown={() => handleSelectSuggestion(municipio)}
                  className="px-4 py-2 text-sm text-gray-800 cursor-pointer hover:bg-gray-100"
                >
                  {municipio.nomeCidade}
                </li>
              ))}
            </ul>

            {/* Botão scroll para baixo */}
            {canScrollDown && (
              <div
                className="flex cursor-default items-center justify-center py-1 hover:bg-gray-50 border-t border-gray-100"
                onMouseEnter={() => startScrolling('down')}
                onMouseLeave={stopScrolling}
              >
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
        )}

        {/* Dropdown vazio com filtro ativo */}
        {showDropdown && value && value.trim() !== '' && municipiosFiltrados.length === 0 && !isLoadingMunicipios && (
          <div
            className={`absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm text-gray-500 ${
              dropdownDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
          >
            Nenhuma cidade encontrada para &quot;{value}&quot;
          </div>
        )}
      </div>

      {/* Mensagens de erro/validação */}
      {erro && <p className="text-sm text-red-500">{erro}</p>}
      {isValid === true && !erro && <p className="text-sm text-green-500">Cidade válida</p>}
      {!estado && <p className="text-sm text-yellow-500">Selecione o estado primeiro</p>}
    </div>
  )
}

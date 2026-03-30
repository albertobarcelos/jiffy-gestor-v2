'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { MdCheckCircle, MdBusiness, MdReceipt, MdAssessment, MdReceiptLong, MdKey, MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { ConfiguracaoImpostosView } from '@/src/presentation/components/features/impostos/ConfiguracaoImpostosView'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MapearProdutosView } from './MapearProdutosView'
import { Etapa1DadosFiscaisEmpresa } from './Etapa1DadosFiscaisEmpresa'
import { Etapa3EmissorFiscal } from './Etapa2EmissorFiscal'
import { Etapa5NumeracoesFiscais } from './Etapa4InutilizarNotas'
import { Etapa5TabelaIbpt } from './Etapa5TabelaIbpt'
import { ConfiguracaoEmpresaCompleta } from './ConfiguracaoEmpresaCompleta'
import { showToast } from '@/src/shared/utils/toast'

/**
 * Componente SectionBox para agrupar conteúdo com título separador
 */
interface SectionBoxProps {
  title: string
  children: React.ReactNode
}

function SectionBox({ title, children }: SectionBoxProps) {
  return (
    <div className="relative flex flex-col gap-3 border border-alternate/50 rounded-lg pt-4 pb-3 px-3">
      {/* Título posicionado acima da borda superior */}
      <div className="absolute -top-4 left-4 right-4 flex items-center justify-center">
        <h3 className="font-exo font-bold text-alternate text-xs sm:text-sm md:text-lg whitespace-nowrap px-2 bg-white">
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

/**
 * Página principal do Portal do Contador (conteúdo completo).
 * Mantém a lógica de abas no store, renderizando o painel ou a view de impostos.
 */
export function PainelContadorView() {
  const { addTab, activeTabId, setActiveTab: setActiveTabStore } = useTabsStore()
  const { isRehydrated } = useAuthStore()
  const [empresaNome, setEmpresaNome] = useState<string>('Empresa')
  const [empresaCnpj, setEmpresaCnpj] = useState<string>('--')
  
  // Estado para rastrear quais etapas estão concluídas
  const [etapasConcluidas, setEtapasConcluidas] = useState<Record<string, boolean>>({
    'etapa-1-dados-fiscais': false,
    'etapa-2-emissor-fiscal': false,
    'etapa-3-cenario-fiscal': false,
    'etapa-4-numeracoes-fiscais': false,
    'etapa-5-tabela-ibpt': false,
  })
  const [isVerificandoEtapas, setIsVerificandoEtapas] = useState(false)
  
  // Estado para rastrear qual etapa está sendo verificada no momento
  const [etapaVerificando, setEtapaVerificando] = useState<string | null>(null)
  
  // Estado para armazenar informações sobre o status do certificado
  const [certificadoStatus, setCertificadoStatus] = useState<{
    existe: boolean
    temValidade: boolean
    estaValido: boolean
    mensagem: string
  } | null>(null)
  
  // Estado para controlar se a mensagem da etapa 1 está expandida
  const [isEtapa1Expanded, setIsEtapa1Expanded] = useState(false)
  
  // Estado para controlar se a mensagem da etapa 2 está expandida
  const [isEtapa2Expanded, setIsEtapa2Expanded] = useState(false)
  
  // Estado para controlar se a mensagem da etapa 3 está expandida
  const [isEtapa3Expanded, setIsEtapa3Expanded] = useState(false)
  
  // Ref para controlar se já está verificando (evitar múltiplas execuções)
  const isVerificandoRef = useRef(false)
  const ultimaVerificacaoRef = useRef<number>(0)
  
  // Ref para rastrear a aba anterior (para detectar quando volta para painel-contador)
  const previousTabIdRef = useRef<string | null>(null)

  useEffect(() => {
    addTab({
      id: 'painel-contador',
      label: 'Portal do Contador',
      path: '/painel-contador',
      isFixed: true,
    })
  }, [addTab])

  useEffect(() => {
    if (activeTabId === 'painel-contador') {
      setActiveTabStore('painel-contador')
    }
  }, [activeTabId, setActiveTabStore])

  // Recarregar verificação quando voltar para a aba principal após estar em uma aba de configuração
  useEffect(() => {
    if (!isRehydrated) return
    
    // IDs das abas de configuração que devem triggerar recarregamento
    const abasConfiguracao = [
      'etapa-1-dados-fiscais',
      'etapa-2-emissor-fiscal',
      'etapa-3-cenario-fiscal',
    ]
    
    const estavaEmConfiguracao = previousTabIdRef.current && 
                                  abasConfiguracao.includes(previousTabIdRef.current)
    const voltouParaPrincipal = activeTabId === 'painel-contador'
    const eraPrincipalAntes = previousTabIdRef.current === 'painel-contador'
    
    // Se estava em uma aba de configuração e voltou para a principal, recarregar
    // Não recarregar se já estava na principal (evita loop no primeiro render)
    if (estavaEmConfiguracao && voltouParaPrincipal && !eraPrincipalAntes) {
      // Debounce de 500ms para evitar múltiplas execuções
      const timeoutId = setTimeout(() => {
        if (!isVerificandoRef.current) {
          verificarTodasEtapas()
        }
      }, 500)
      
      return () => clearTimeout(timeoutId)
    }
    
    // Atualizar referência da aba anterior
    previousTabIdRef.current = activeTabId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, isRehydrated]) // Removido verificarTodasEtapas das dependências para evitar loops

  // Função para verificar se a etapa 1 está concluída
  // Etapa 1: Dados fiscais completos + Certificado ativo e válido
  const verificarEtapa1 = useCallback(async (): Promise<boolean> => {
    try {
      // 1. Verificar dados fiscais
      const empresaResponse = await fetch('/api/empresas/me')
      if (!empresaResponse.ok) return false

      const empresaData = await empresaResponse.json()

      // Verificar campos obrigatórios da empresa
      const cnpjPreenchido = empresaData?.cnpj && empresaData.cnpj.trim().length >= 14
      const razaoSocialPreenchida = empresaData?.razaoSocial?.trim() || empresaData?.nome?.trim()
      const estadoPreenchido = empresaData?.endereco?.estado?.trim() || empresaData?.endereco?.uf?.trim()

      if (!cnpjPreenchido || !razaoSocialPreenchida || !estadoPreenchido) {
        return false
      }

      // Verificar configuração fiscal
      const fiscalResponse = await fetch('/api/v1/fiscal/empresas-fiscais/me')
      if (!fiscalResponse.ok) return false

      const configFiscal = await fiscalResponse.json()
      const inscricaoEstadualPreenchida = configFiscal?.inscricaoEstadual === 'ISENTO' || 
                                         (configFiscal?.inscricaoEstadual && configFiscal.inscricaoEstadual.trim().length > 0)
      const regimeTributarioPreenchido = configFiscal?.codigoRegimeTributario && 
                                        [1, 2, 3].includes(configFiscal.codigoRegimeTributario)

      if (!inscricaoEstadualPreenchida || !regimeTributarioPreenchido) {
        return false
      }

      // 2. Verificar certificado ativo e válido
      const certificadoResponse = await fetch('/api/certificado')
      if (!certificadoResponse.ok) {
        setCertificadoStatus({
          existe: false,
          temValidade: false,
          estaValido: false,
          mensagem: 'Certificado não encontrado. Cadastre um certificado digital para continuar.',
        })
        return false
      }

      const certificadoResult = await certificadoResponse.json()
      
      // Caso 1: Certificado não existe (empresa nova)
      if (!certificadoResult.success || !certificadoResult.data) {
        setCertificadoStatus({
          existe: false,
          temValidade: false,
          estaValido: false,
          mensagem: 'Certificado não encontrado. Cadastre um certificado digital para continuar.',
        })
        return false
      }

      const certificado = certificadoResult.data
      
      // Caso 2: Certificado existe mas não tem data de validade (recém-cadastrado)
      if (!certificado.validadeCertificado) {
        setCertificadoStatus({
          existe: true,
          temValidade: false,
          estaValido: true, // Consideramos válido se existe, mesmo sem validade
          mensagem: 'Certificado cadastrado. Aguardando processamento da validade.',
        })
        return true // Certificado existe, mesmo sem validade ainda é considerado válido
      }

      // Caso 3: Certificado existe e tem validade - verificar se não está expirado
      const hoje = new Date()
      const validade = new Date(certificado.validadeCertificado)
      const diasRestantes = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
      
      if (validade < hoje) {
        // Certificado expirado
        setCertificadoStatus({
          existe: true,
          temValidade: true,
          estaValido: false,
          mensagem: `Certificado expirado em ${validade.toLocaleDateString('pt-BR')}. Cadastre um novo certificado válido.`,
        })
        return false
      }

      // Caso 4: Certificado válido e não expirado
      setCertificadoStatus({
        existe: true,
        temValidade: true,
        estaValido: true,
        mensagem: diasRestantes <= 30 
          ? `Certificado válido até ${validade.toLocaleDateString('pt-BR')} (${diasRestantes} dias restantes).`
          : `Certificado válido até ${validade.toLocaleDateString('pt-BR')}.`,
      })
      return true
    } catch (error) {
      console.error('Erro ao verificar etapa 1:', error)
      return false
    }
  }, [])

  // Função para verificar se a etapa 2 está concluída
  // Etapa 2: Emissor Fiscal - pelo menos uma configuração (NF-e ou NFC-e) ativa e completa
  const verificarEtapa2 = useCallback(async (): Promise<boolean> => {
    try {
      // Buscar configurações de emissão
      const response = await fetch('/api/v1/fiscal/configuracoes/emissao')
      if (!response.ok) return false

      const numeracoes: Array<{
        modelo: number
        serie: number
        proximoNumero: number
        ambiente?: 'HOMOLOGACAO' | 'PRODUCAO'
        nfeAtivo?: boolean
        nfceAtivo?: boolean
        nfceCscId?: string
        nfceCscCodigo?: string
        terminalId?: string | null
      }> = await response.json()

      // Filtrar apenas configurações principais (terminalId = null)
      const configsPrincipais = numeracoes.filter((n) => !n.terminalId)

      // Buscar configuração NF-e (modelo 55)
      const nfe = configsPrincipais.find((n) => n.modelo === 55)
      
      // Buscar configuração NFC-e (modelo 65)
      const nfce = configsPrincipais.find((n) => n.modelo === 65)

      // Verificar se NF-e está completa (se estiver ativa)
      const nfeCompleta = nfe
        ? nfe.nfeAtivo === true &&
          !!nfe.ambiente &&
          nfe.serie > 0 &&
          nfe.proximoNumero > 0
        : false

      // Verificar se NFC-e está completa (se estiver ativa)
      const nfceCompleta = nfce
        ? nfce.nfceAtivo === true &&
          !!nfce.ambiente &&
          nfce.serie > 0 &&
          nfce.proximoNumero > 0 &&
          !!nfce.nfceCscId &&
          !!nfce.nfceCscCodigo &&
          nfce.nfceCscCodigo.trim().length >= 8
        : false

      // Etapa concluída se pelo menos uma estiver ativa e completa
      // Se nenhuma estiver ativa, não está concluída
      const peloMenosUmaAtiva = (nfe?.nfeAtivo === true) || (nfce?.nfceAtivo === true)
      
      if (!peloMenosUmaAtiva) {
        return false // Nenhuma está ativa
      }

      // Se pelo menos uma está ativa, verificar se está completa
      return nfeCompleta || nfceCompleta
    } catch (error) {
      console.error('Erro ao verificar etapa 2:', error)
      return false
    }
  }, [])

  // Função para verificar se a etapa 3 está concluída
  // Etapa 3: Cenário Fiscal (NCMs) - todos os NCMs devem ter configuração obrigatória preenchida
  const verificarEtapa3 = useCallback(async (): Promise<boolean> => {
    try {
      // 1. Buscar regime tributário da empresa
      const fiscalResponse = await fetch('/api/v1/fiscal/empresas-fiscais/me')
      if (!fiscalResponse.ok) return false

      const configFiscal = await fiscalResponse.json()
      const codigoRegime = configFiscal?.codigoRegimeTributario
      const regimeNumero =
        typeof codigoRegime === 'string'
          ? parseInt(codigoRegime, 10)
          : typeof codigoRegime === 'number'
          ? codigoRegime
          : null

      // Se não tiver regime tributário válido, não pode verificar
      if (!regimeNumero || ![1, 2, 3].includes(regimeNumero)) {
        return false
      }

      const isSimplesNacional = regimeNumero === 1 || regimeNumero === 2

      // 2. Buscar todos os NCMs configurados
      const ncmsResponse = await fetch('/api/v1/fiscal/configuracoes/ncms?page=0&size=1000')
      if (!ncmsResponse.ok) return false

      const ncmsData = await ncmsResponse.json()
      const ncms = Array.isArray(ncmsData?.content) ? ncmsData.content : []

      // Se não houver NCMs cadastrados, etapa não está concluída
      if (ncms.length === 0) {
        return false
      }

      // 3. Verificar cada NCM conforme o regime tributário
      for (const ncm of ncms) {
        const codigoNcm = ncm?.codigo
        if (!codigoNcm || codigoNcm.length !== 8) {
          continue // Pula NCMs inválidos
        }

        const impostos = ncm?.impostos || {}

        if (isSimplesNacional) {
          // Simples Nacional: CSOSN é obrigatório
          if (!impostos.csosn || impostos.csosn.trim().length === 0) {
            return false // NCM sem CSOSN configurado
          }
        } else {
          // Regime Normal: CST ICMS é obrigatório
          if (!impostos.icms?.cst || impostos.icms.cst.trim().length === 0) {
            return false // NCM sem CST ICMS configurado
          }
        }
      }

      // Todos os NCMs têm a configuração obrigatória preenchida
      return true
    } catch (error) {
      console.error('Erro ao verificar etapa 3:', error)
      return false
    }
  }, [])

  // Função para verificar todas as etapas
  const verificarTodasEtapas = useCallback(async () => {
    // Evitar múltiplas execuções simultâneas
    if (isVerificandoRef.current) {
      return
    }
    
    // Debounce: não executar se foi executado há menos de 2 segundos
    const agora = Date.now()
    if (agora - ultimaVerificacaoRef.current < 2000) {
      return
    }
    
    isVerificandoRef.current = true
    ultimaVerificacaoRef.current = agora
    setIsVerificandoEtapas(true)
    
    try {
      const novasEtapasConcluidas: Record<string, boolean> = {
        'etapa-1-dados-fiscais': false,
        'etapa-2-emissor-fiscal': false,
        'etapa-3-cenario-fiscal': false,
        'etapa-4-numeracoes-fiscais': false,
        'etapa-5-tabela-ibpt': false,
      }

      // Verificar etapa 1
      setEtapaVerificando('etapa-1-dados-fiscais')
      novasEtapasConcluidas['etapa-1-dados-fiscais'] = await verificarEtapa1()

      // Verificar etapa 2
      setEtapaVerificando('etapa-2-emissor-fiscal')
      novasEtapasConcluidas['etapa-2-emissor-fiscal'] = await verificarEtapa2()

      // Verificar etapa 3
      setEtapaVerificando('etapa-3-cenario-fiscal')
      novasEtapasConcluidas['etapa-3-cenario-fiscal'] = await verificarEtapa3()

      // TODO: Implementar verificações das outras etapas
      // setEtapaVerificando('etapa-4-numeracoes-fiscais')
      // novasEtapasConcluidas['etapa-4-numeracoes-fiscais'] = await verificarEtapa4()
      // setEtapaVerificando('etapa-5-tabela-ibpt')
      // novasEtapasConcluidas['etapa-5-tabela-ibpt'] = await verificarEtapa5()

      setEtapasConcluidas(novasEtapasConcluidas)
      setEtapaVerificando(null)
    } catch (error) {
      console.error('Erro ao verificar etapas:', error)
    } finally {
      setIsVerificandoEtapas(false)
      setEtapaVerificando(null)
      isVerificandoRef.current = false
    }
  }, [verificarEtapa1, verificarEtapa2, verificarEtapa3])

  // Busca dados da empresa para exibir nome e CNPJ
  useEffect(() => {
    // Aguardar reidratação do Zustand antes de fazer requisições
    if (!isRehydrated) return
    
    const loadEmpresa = async () => {
      try {
        const response = await fetch('/api/empresas/me')
        if (!response.ok) return
        const data = await response.json()
        // Usa os campos retornados para preencher nome e cnpj
        const nome =
          data?.nome ||
          data?.razaoSocial ||
          data?.nomeFantasia ||
          data?.empresa ||
          'Empresa'
        setEmpresaNome(nome)
        if (data?.cnpj) setEmpresaCnpj(data.cnpj)
      } catch (error) {
        console.error('Erro ao carregar empresa:', error)
      }
    }
    loadEmpresa()
    verificarTodasEtapas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRehydrated]) // Removido verificarTodasEtapas das dependências para evitar loops

  // Recarregar verificação quando a página receber foco (usuário voltou de outra tela)
  // Usar um debounce maior para evitar execuções desnecessárias
  useEffect(() => {
    if (!isRehydrated) return
    
    let timeoutId: NodeJS.Timeout | null = null
    
    const handleFocus = () => {
      if (!isVerificandoRef.current) {
        // Debounce de 1 segundo para evitar múltiplas execuções
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(() => {
          verificarTodasEtapas()
        }, 1000)
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRehydrated]) // Removido verificarTodasEtapas das dependências para evitar loops


  // Estrutura de dados das etapas
  const etapas = [
    {
      id: 'etapa-1-dados-fiscais',
      step: 1,
      title: 'Dados Fiscais e Certificado Digital',
      label: 'Dados Fiscais e Certificado Digital',
      path: '/painel-contador/etapa/dados-fiscais',
      component: Etapa1DadosFiscaisEmpresa,
      icon: MdBusiness,
    },
    {
      id: 'etapa-2-emissor-fiscal',
      step: 2,
      title: 'Emissor Fiscal',
      label: 'Emissor Fiscal',
      path: '/painel-contador/etapa/emissor-fiscal',
      component: Etapa3EmissorFiscal,
      icon: MdReceipt,
    },
    {
      id: 'etapa-3-cenario-fiscal',
      step: 3,
      title: 'Cenário Fiscal (NCMs)',
      label: 'Cenário Fiscal (NCMs)',
      path: '/painel-contador/etapa/cenario-fiscal',
      component: MapearProdutosView,
      icon: MdAssessment,
    },
    {
      id: 'etapa-4-numeracoes-fiscais',
      step: 4,
      title: 'Inutilizar Notas',
      label: 'Inutilizar Notas',
      path: '/painel-contador/etapa/inutilizar-notas',
      component: Etapa5NumeracoesFiscais,
      icon: MdReceiptLong,
    },
    {
      id: 'etapa-5-chave-ibpt',
      step: 5,
      title: 'Chave IBPT',
      label: 'Chave IBPT',
      path: '/painel-contador/etapa/chave-ibpt',
      component: Etapa5TabelaIbpt,
      icon: MdKey,
    },
  ]

  // Função para verificar se uma etapa está habilitada (pode ser acessada)
  const isEtapaHabilitada = useCallback((etapaId: string): boolean => {
    // Etapa 1 sempre está habilitada
    if (etapaId === 'etapa-1-dados-fiscais') {
      return true
    }
    
    // Etapa 2 só está habilitada se a etapa 1 estiver concluída
    if (etapaId === 'etapa-2-emissor-fiscal') {
      return etapasConcluidas['etapa-1-dados-fiscais'] === true
    }
    
    // Etapa 3 só está habilitada se a etapa 2 estiver concluída
    if (etapaId === 'etapa-3-cenario-fiscal') {
      return etapasConcluidas['etapa-2-emissor-fiscal'] === true
    }
    
    // Etapas 4 e 5 não têm bloqueio sequencial (são opcionais)
    return true
  }, [etapasConcluidas])

  // Função para obter mensagem de bloqueio para uma etapa
  const getMensagemBloqueio = useCallback((etapaId: string): string => {
    if (etapaId === 'etapa-2-emissor-fiscal') {
      return 'Complete primeiro a etapa "Dados Fiscais e Certificado Digital" para acessar o Emissor Fiscal.'
    }
    
    if (etapaId === 'etapa-3-cenario-fiscal') {
      return 'Complete primeiro a etapa "Emissor Fiscal" (ative pelo menos um modelo de nota) para acessar o Cenário Fiscal.'
    }
    
    return 'Esta etapa não está disponível no momento.'
  }, [])

  // Handler para abrir etapa em nova aba
  const handleOpenEtapa = (etapaId: string) => {
    // Verificar se a etapa está habilitada
    if (!isEtapaHabilitada(etapaId)) {
      const mensagem = getMensagemBloqueio(etapaId)
      showToast.warning(mensagem)
      return
    }
    
    const etapa = etapas.find((e) => e.id === etapaId)
    if (etapa) {
      addTab({
        id: etapa.id,
        label: etapa.label,
        path: etapa.path,
        isFixed: false,
      })
    }
  }

  // Renderização condicional para views específicas
  if (activeTabId === 'impostos') {
    return <ConfiguracaoImpostosView />
  }

  if (activeTabId === 'config-ncm-cest') {
    return <MapearProdutosView />
  }

  if (activeTabId === 'config-empresa-completa') {
    return <ConfiguracaoEmpresaCompleta />
  }

  // Renderização condicional para etapas
  const etapaAtiva = etapas.find((etapa) => etapa.id === activeTabId)
  if (etapaAtiva) {
    const EtapaComponent = etapaAtiva.component
    return <EtapaComponent />
  }

  const handleOpenNCMConfig = () => {
    addTab({
      id: 'config-ncm-cest',
      label: 'Configurar NCM/CEST',
      path: '/painel-contador/config/ncm-cest',
    })
  }

  const handleOpenImpostosConfig = () => {
    addTab({
      id: 'impostos',
      label: 'Impostos',
      path: '/painel-contador/impostos',
      isFixed: false,
    })
  }

  return (
    <div className="pb-2 flex w-full flex-col items-stretch bg-info lg:flex-row lg:h-full">
      {/* Painel Esquerdo - Roxo */}
      <div className="flex min-h-[300px] flex-1 md:w-[70%] lg:w-[72%] w-full flex-col overflow-hidden rounded-tr-none rounded-br-none bg-secondary lg:h-full lg:rounded-tr-[48px] lg:rounded-br-[48px]">
        {/* Seção Superior com Título e Ilustração */}
        <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6 border-b border-[#330468] bg-[rgba(131,56,236,0.4)] sm:rounded-tr-[24px] md:rounded-tr-[32px] lg:rounded-tr-[48px] p-3 sm:p-4">
          <div className="flex flex-row items-center justify-center gap-4 sm:gap-16">
            {/* Ilustração */}
            <div className="flex  aspect-square">
              <img
                src="/images/jiffy-contador.png"
                alt="Jiffy Contador"
                className="md:w-64 md:h-64 w-28 h-28 p-2 object-contain object-left-top"
              />
            </div>

            {/* Título e infos */}
            <div className=" flex flex-col gap-3 sm:gap-4">
              <h1 className="font-manrope font-bold text-white text-2xl sm:text-3xl md:text-4xl lg:text-6xl">
                Portal do <p className='md:py-2'>Contador</p>
              </h1>

              <div className="flex flex-col">
                <div className="flex flex-wrap items-start sm:items-center gap-2">
                  <span className="font-exo font-semibold text-white text-xs sm:text-lg md:text-xl lg:text-2xl">
                    Empresa:
                  </span>
                  <span className="font-exo font-normal text-white text-xs sm:text-lg md:text-xl lg:text-2xl">
                    {empresaNome}
                  </span>
                </div>

                <div className="flex flex-wrap items-start sm:items-center gap-2">
                  <span className="font-exo font-medium text-white text-xs sm:text-lg md:text-xl lg:text-2xl">
                    CNPJ:
                  </span>
                  <span className="font-exo font-normal text-white text-xs sm:text-lg md:text-xl lg:text-2xl">
                    {empresaCnpj}
                  </span>
                </div>

                <div className="flex flex-wrap items-start sm:items-center gap-2">
                  <span className="font-exo font-medium text-white text-xs sm:text-lg md:text-xl lg:text-2xl">
                    Regime:
                  </span>
                  <span className="font-exo font-normal text-white text-xs sm:text-lg md:text-xl lg:text-2xl">
                    Simples Nacional
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="mx-4 mt-4 flex flex-col">
          {(() => {
            // Apenas as 3 primeiras etapas contam para a progressão obrigatória
            const etapasObrigatorias = etapas.slice(0, 3)
            const totalConcluidas = etapasObrigatorias.filter((etapa) => etapasConcluidas[etapa.id]).length
            const porcentagem = (totalConcluidas / etapasObrigatorias.length) * 100
            
            return (
              <>
                <h2 className="font-manrope font-bold text-white text-[clamp(12px,2.5vw,16px)] sm:text-[clamp(14px,3vw,18px)] md:text-[clamp(16px,3.5vw,22px)] lg:text-[24px] tracking-[-0.32px] leading-[1.4] md:leading-[1.3] mb-1.5 sm:mb-1.75 md:mb-2 break-words">
                  Configuração Contábil: {totalConcluidas} de {etapasObrigatorias.length} Etapas concluídas
                </h2>

                <div className="w-full max-w-[947px] h-[18px] sm:h-[20px] md:h-[22px] lg:h-[26px] bg-[#f5f8fa] rounded-xl relative overflow-hidden mb-2 sm:mb-2.25 md:mb-2.5 lg:mb-3 flex-shrink-0">
                  <div 
                    className="h-full bg-accent1 rounded-xl transition-all duration-500 ease-out"
                    style={{ width: `${porcentagem}%`, maxWidth: '100%' }}
                  />
                </div>
              </>
            )
          })()}

          <div className="flex flex-col px-2 sm:px-3 md:px-4 gap-[0.5rem] sm:gap-[0.625rem] md:gap-[1.25rem] lg:gap-1.5rem">
            {etapas
              .filter((etapa) => etapa.step <= 3) // Apenas exibir as 3 primeiras etapas na lista de progressão
              .map((etapa) => {
              const estaConcluida = etapasConcluidas[etapa.id] || false
              const isEtapa1 = etapa.id === 'etapa-1-dados-fiscais'
              const isEtapa2 = etapa.id === 'etapa-2-emissor-fiscal'
              const isEtapa3 = etapa.id === 'etapa-3-cenario-fiscal'
              const temMensagemEtapa1 = isEtapa1 && !estaConcluida && certificadoStatus
              const temMensagemEtapa2 = isEtapa2 && !estaConcluida
              const temMensagemEtapa3 = isEtapa3 && !estaConcluida
              const estaVerificando = etapaVerificando === etapa.id
              const estaHabilitada = isEtapaHabilitada(etapa.id)
              
              return (
                <div key={etapa.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-[0.375rem] sm:gap-[0.5rem] md:gap-[0.75rem] group">
                    <button
                      onClick={() => handleOpenEtapa(etapa.id)}
                      className={`flex items-center gap-[0.375rem] sm:gap-[0.5rem] md:gap-[0.625rem] transition-opacity text-left ${
                        estaHabilitada 
                          ? 'hover:opacity-80 cursor-pointer' 
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {estaConcluida ? (
                        <MdCheckCircle className="flex-shrink-0 text-white group-hover:scale-110 transition-transform" size={16} />
                      ) : (
                        <div className="flex-shrink-0 w-4 h-4 rounded-full border-2 border-white/50 group-hover:border-white transition-colors" />
                      )}
                      <span className={`font-manrope font-bold text-white text-[clamp(10px,1.8vw,12px)] sm:text-[clamp(11px,2vw,13px)] md:text-[clamp(12px,2.2vw,14px)] lg:text-lg tracking-[-0.2px] leading-[1.3] ${
                        estaConcluida ? '' : 'opacity-75'
                      } ${
                        estaHabilitada ? 'group-hover:underline' : ''
                      }`}>
                       {etapa.step} - {etapa.title}
                      </span>
                      
                      {/* Seta para expandir/colapsar mensagem da etapa 1 - logo após o título */}
                      {temMensagemEtapa1 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={e => {
                            e.stopPropagation()
                            setIsEtapa1Expanded(!isEtapa1Expanded)
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              e.stopPropagation()
                              setIsEtapa1Expanded(!isEtapa1Expanded)
                            }
                          }}
                          className="flex-shrink-0 ml-1 inline-flex p-0.5 hover:bg-white/10 rounded transition-colors cursor-pointer"
                          aria-label={isEtapa1Expanded ? 'Ocultar detalhes' : 'Mostrar detalhes'}
                        >
                          {isEtapa1Expanded ? (
                            <MdKeyboardArrowUp className="text-white" size={16} />
                          ) : (
                            <MdKeyboardArrowDown className="text-white" size={16} />
                          )}
                        </span>
                      )}
                      
                      {/* Seta para expandir/colapsar mensagem da etapa 2 - logo após o título */}
                      {temMensagemEtapa2 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={e => {
                            e.stopPropagation()
                            setIsEtapa2Expanded(!isEtapa2Expanded)
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              e.stopPropagation()
                              setIsEtapa2Expanded(!isEtapa2Expanded)
                            }
                          }}
                          className="flex-shrink-0 ml-1 inline-flex p-0.5 hover:bg-white/10 rounded transition-colors cursor-pointer"
                          aria-label={isEtapa2Expanded ? 'Ocultar detalhes' : 'Mostrar detalhes'}
                        >
                          {isEtapa2Expanded ? (
                            <MdKeyboardArrowUp className="text-white" size={16} />
                          ) : (
                            <MdKeyboardArrowDown className="text-white" size={16} />
                          )}
                        </span>
                      )}
                      
                      {/* Seta para expandir/colapsar mensagem da etapa 3 - logo após o título */}
                      {temMensagemEtapa3 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={e => {
                            e.stopPropagation()
                            setIsEtapa3Expanded(!isEtapa3Expanded)
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              e.stopPropagation()
                              setIsEtapa3Expanded(!isEtapa3Expanded)
                            }
                          }}
                          className="flex-shrink-0 ml-1 inline-flex p-0.5 hover:bg-white/10 rounded transition-colors cursor-pointer"
                          aria-label={isEtapa3Expanded ? 'Ocultar detalhes' : 'Mostrar detalhes'}
                        >
                          {isEtapa3Expanded ? (
                            <MdKeyboardArrowUp className="text-white" size={16} />
                          ) : (
                            <MdKeyboardArrowDown className="text-white" size={16} />
                          )}
                        </span>
                      )}
                      
                      {/* Loading individual para cada etapa - após a seta (se existir) ou após o título */}
                      {estaVerificando && (
                        <div className="flex-shrink-0 ml-1">
                          <img 
                            src="/images/jiffy-loading.gif" 
                            alt="Carregando..." 
                            className="w-6 h-6"
                          />
                        </div>
                      )}
                    </button>
                  </div>
                  
                  {/* Mensagem informativa para etapa 1 quando não concluída e expandida */}
                  {temMensagemEtapa1 && isEtapa1Expanded && (
                    <div className="ml-5 sm:ml-6 md:ml-7 mt-0.5 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-200 ease-in-out">
                      <p className="font-inter text-[10px] sm:text-xs text-white/90 leading-relaxed">
                        {certificadoStatus.mensagem}
                      </p>
                    </div>
                  )}
                  
                  {/* Mensagem informativa para etapa 2 quando não concluída e expandida */}
                  {temMensagemEtapa2 && isEtapa2Expanded && (
                    <div className="ml-5 sm:ml-6 md:ml-7 mt-0.5 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-200 ease-in-out">
                      <p className="font-inter text-[10px] sm:text-xs text-white/90 leading-relaxed">
                        Pelo menos um modelo de nota (NF-e ou NFC-e) deve ser escolhido e configurado corretamente para que o passo seja concluído.
                      </p>
                    </div>
                  )}
                  
                  {/* Mensagem informativa para etapa 3 quando não concluída e expandida */}
                  {temMensagemEtapa3 && isEtapa3Expanded && (
                    <div className="ml-5 sm:ml-6 md:ml-7 mt-0.5 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-200 ease-in-out">
                      <p className="font-inter text-[10px] sm:text-xs text-white/90 leading-relaxed">
                        Todos os NCMs e suas configurações devem ser preenchidas para concluir o passo.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Painel Direito - Botões de Navegação */}
      <div className="flex md:w-[30%] lg:w-[28%] flex-col gap-4 p-4 sm:p-5 lg:h-full lg:overflow-y-auto">
        {/* Seção 1: Configuração Contábil (3 primeiros passos) */}
        <SectionBox title="Configuração Contábil">
          {etapas.slice(0, 3).map((etapa, index) => {
            const IconComponent = etapa.icon
            // Índice par = roxo forte (secondary); ímpar = verde accent1 (mesmo da barra de progresso)
            const usarAccentVerde = index % 2 === 1
            const bgColor = usarAccentVerde ? 'bg-white' : 'bg-secondary'
            const corConteudo = usarAccentVerde ? 'text-secondary' : 'text-white'

            const estaHabilitada = isEtapaHabilitada(etapa.id)

            return (
              <button
                key={etapa.id}
                onClick={() => handleOpenEtapa(etapa.id)}
                className={`relative w-full rounded-[16px] border-2 border-alternate ${bgColor} transition-transform duration-200 p-4 sm:p-5 shadow-sm text-center group flex flex-col items-center gap-3 ${
                  estaHabilitada
                    ? 'hover:scale-105 active:scale-100 hover:shadow-md cursor-pointer'
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <span className="absolute top-3 left-3 sm:top-4 sm:left-4 font-exo font-medium text-alternate text-sm sm:text-base md:text-lg rounded-full bg-white w-8 h-8 flex items-center justify-center">
                  {etapa.step}
                </span>

                <div className="flex flex-col items-center justify-center gap-2">
                  <IconComponent className={corConteudo} size={52} />

                  <span
                    className={`font-exo font-medium text-sm sm:text-base md:text-lg ${corConteudo}`}
                  >
                    {etapa.title}
                  </span>
                </div>
              </button>
            )
          })}
        </SectionBox>

        {/* Seção 2: Outras Configurações (2 últimos passos) */}
        <SectionBox title="Outras Configurações">
          {etapas.slice(3).map((etapa, index) => {
            const IconComponent = etapa.icon
            const usarAccentVerde = index % 2 === 1
            const bgColor = usarAccentVerde ? 'bg-secondary' : 'bg-white'
            const corConteudo = usarAccentVerde ? 'text-white' : 'text-secondary'

            return (
              <button
                key={etapa.id}
                onClick={() => handleOpenEtapa(etapa.id)}
                className={`relative w-full rounded-[16px] border-2 border-alternate ${bgColor} hover:scale-105 active:scale-100 transition-transform duration-200 p-4 sm:p-5 shadow-sm hover:shadow-md text-center group flex flex-col items-center gap-3`}
              >
                <span className="absolute top-3 left-3 sm:top-4 sm:left-4 font-exo font-medium text-alternate text-sm sm:text-base md:text-lg rounded-full bg-white w-8 h-8 flex items-center justify-center">
                  {etapa.step}
                </span>

                <div className="flex flex-col items-center justify-center gap-2">
                  <IconComponent className={corConteudo} size={52} />

                  <span
                    className={`font-exo font-medium text-sm sm:text-base md:text-lg ${corConteudo}`}
                  >
                    {etapa.title}
                  </span>
                </div>
              </button>
            )
          })}
        </SectionBox>
      </div>
    </div>
  )
}

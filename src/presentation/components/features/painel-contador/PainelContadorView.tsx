'use client'

import React, { useEffect, useState } from 'react'
import { MdCheckCircle, MdBusiness, MdReceipt, MdAssessment, MdNumbers, MdTableChart } from 'react-icons/md'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { ConfiguracaoImpostosView } from '@/src/presentation/components/features/impostos/ConfiguracaoImpostosView'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MapearProdutosView } from './MapearProdutosView'
import { Etapa1DadosFiscaisEmpresa } from './Etapa1DadosFiscaisEmpresa'
import { Etapa3EmissorFiscal } from './Etapa2EmissorFiscal'
import { Etapa5NumeracoesFiscais } from './Etapa5NumeracoesFiscais'
import { Etapa5TabelaIbpt } from './Etapa4TabelaIbpt'
import { ConfiguracaoEmpresaCompleta } from './ConfiguracaoEmpresaCompleta'

/**
 * Página principal do Portal do Contador (conteúdo completo).
 * Mantém a lógica de abas no store, renderizando o painel ou a view de impostos.
 */
export function PainelContadorView() {
  const { addTab, activeTabId, setActiveTab: setActiveTabStore } = useTabsStore()
  const { isRehydrated } = useAuthStore()
  const [empresaNome, setEmpresaNome] = useState<string>('Empresa')
  const [empresaCnpj, setEmpresaCnpj] = useState<string>('--')

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
  }, [isRehydrated])


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
      title: 'Numerações Fiscais',
      label: 'Numerações Fiscais',
      path: '/painel-contador/etapa/numeracoes-fiscais',
      component: Etapa5NumeracoesFiscais,
      icon: MdNumbers,
    },
    {
      id: 'etapa-5-tabela-ibpt',
      step: 5,
      title: 'Tabela IBPT',
      label: 'Tabela IBPT',
      path: '/painel-contador/etapa/tabela-ibpt',
      component: Etapa5TabelaIbpt,
      icon: MdTableChart,
    },
  ]

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

  // Handler para abrir etapa em nova aba
  const handleOpenEtapa = (etapaId: string) => {
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
      <div className="flex min-h-[350px] flex-1 md:w-[70%] lg:w-[72%] w-full flex-col overflow-hidden rounded-tr-none rounded-br-none bg-secondary lg:h-full lg:rounded-tr-[48px] lg:rounded-br-[48px]">
        {/* Seção Superior com Título e Ilustração */}
        <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6 border-b border-[#330468] bg-[rgba(131,56,236,0.4)] sm:rounded-tr-[24px] md:rounded-tr-[32px] lg:rounded-tr-[48px] p-3 sm:p-4">
          <div className="flex flex-row items-center justify-center gap-4 sm:gap-16">
            {/* Ilustração */}
            <div className="flex  aspect-square">
              <img
                src="/images/jiffy-contador.png"
                alt="Jiffy Contador"
                className="w-64 h-64 p-2 object-contain object-left-top"
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
        <div className="mx-4 mt-4 flex-1 flex flex-col min-h-0">
          <h2 className="font-manrope font-bold text-white text-[clamp(12px,2.5vw,16px)] sm:text-[clamp(14px,3vw,18px)] md:text-[clamp(16px,3.5vw,22px)] lg:text-[24px] tracking-[-0.32px] leading-[1.4] md:leading-[1.3] mb-1.5 sm:mb-1.75 md:mb-2 break-words">
            Configuração Contábil: 5 de 6 Etapas concluídas
          </h2>

          <div className="w-full max-w-[947px] h-[18px] sm:h-[20px] md:h-[22px] lg:h-[26px] bg-[#f5f8fa] rounded-xl relative overflow-hidden mb-2 sm:mb-2.25 md:mb-2.5 lg:mb-3">
            <div className="h-full w-[60%] max-w-[422px] bg-accent1 rounded-xl" />
          </div>

          <div className="flex flex-col px-4 gap-[0.75rem] sm:gap-1 md:gap-[1.25rem] lg:gap-[1.5rem]">
            {[
              'Dados Fiscais Configurados',
              'Certificado Cadastrado',
              'Emissor Fiscal Configurado',
              'Mapeamento dos NCMs',
              'Painel de Numerações Fiscais',
            ].map((etapa) => (
              <div key={etapa} className="flex items-center gap-[0.5rem] sm:gap-[0.75rem]">
                <MdCheckCircle className="flex-shrink-0 text-white" size={20} />
                <span className="font-manrope font-bold text-white text-[clamp(11px,2.2vw,14px)] sm:text-[clamp(12px,2.5vw,16px)] md:text-[clamp(14px,3vw,16px)] lg:text-[18px] tracking-[-0.2px] leading-[1.4] md:leading-[1.3]">
                  {etapa}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel Direito - Botões de Navegação */}
      <div className="flex md:w-[30%] lg:w-[28%] flex-col gap-3 p-4 sm:p-5 lg:h-full lg:overflow-y-auto">
        <div className="flex flex-col gap-3">
          {etapas.map((etapa, index) => {
            const IconComponent = etapa.icon
            // Intercalar cores: índice par = bg-alternate, ímpar = bg-text-secondary
            const bgColor = index % 2 === 0 
              ? 'bg-secondary' // Primeiro, terceiro, quinto botão
              : 'bg-alternate' // Segundo, quarto botão
            
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
                <IconComponent 
                  className="text-white" 
                  size={52}
                />
                
                <span className="font-exo font-medium text-white text-sm sm:text-base md:text-lg">
                  {etapa.title}
                </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useEffect } from 'react'
import { MdCheckCircle } from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { ConfiguracaoImpostosView } from '@/src/presentation/components/features/impostos/ConfiguracaoImpostosView'
import { useAuthStore } from '@/src/presentation/stores/authStore'

/**
 * Página principal do Portal do Contador (conteúdo completo).
 * Mantém a lógica de abas no store, renderizando o painel ou a view de impostos.
 */
export function PainelContadorView() {
  const { addTab, activeTabId, setActiveTab: setActiveTabStore } = useTabsStore()
  const { auth } = useAuthStore()
  const [empresaNome, setEmpresaNome] = React.useState<string>('Empresa')
  const [empresaCnpj, setEmpresaCnpj] = React.useState<string>('--')

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
    const loadEmpresa = async () => {
      const token = auth?.getAccessToken()
      if (!token) return
      try {
        const response = await fetch('/api/empresas/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
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
  }, [auth])

  if (activeTabId === 'impostos') {
    return <ConfiguracaoImpostosView />
  }

  const handleOpenCertificadoConfig = () => {
    addTab({
      id: 'config-certificado',
      label: 'Configurar Certificado',
      path: '/painel-contador/config/certificado',
    })
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
    <div className="pb-2 flex h-full w-full flex-col items-stretch bg-info overflow-y-auto lg:flex-row lg:overflow-hidden">
      {/* Painel Esquerdo - Roxo */}
      <div className="flex min-h-[350px] md:min-h-full flex-1 md:w-[58%] w-full flex-col overflow-hidden rounded-tr-none rounded-br-none bg-secondary lg:rounded-tr-[48px] lg:rounded-br-[48px]">
        {/* Seção Superior com Título e Ilustração */}
        <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6 border-b border-[#330468] bg-[rgba(131,56,236,0.4)] sm:rounded-tr-[24px] md:rounded-tr-[32px] lg:rounded-tr-[48px] p-3 sm:p-4">
          <div className="flex flex-row items-center gap-4 sm:gap-6">
            {/* Ilustração */}
            <div className="flex-shrink-0 w-[30%] sm:w-[35%] md:w-[38%] lg:w-[280px] max-w-[319px] aspect-square">
              <img
                src="/images/jiffy-contador.png"
                alt="Jiffy Contador"
                className="h-full w-full p-2 object-contain object-left-top"
              />
            </div>

            {/* Título e infos */}
            <div className="flex-1 flex flex-col gap-3 sm:gap-4">
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

          {/* Indicadores de paginação */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <span className="w-[8px] h-[8px] sm:w-[9px] sm:h-[9px] lg:w-[10px] lg:h-[10px] rounded-full bg-white" />
            {[1, 2].map((i) => (
              <span
                key={i}
                className="w-[8px] h-[8px] sm:w-[9px] sm:h-[9px] lg:w-[10px] lg:h-[10px] rounded-full border border-[rgba(255,255,255,0.5)]"
              />
            ))}
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="h-auto md:h-full mx-4 mt-4 flex-1 flex flex-col">
          <h2 className="font-manrope font-bold text-white text-[clamp(12px,2.5vw,16px)] sm:text-[clamp(14px,3vw,18px)] md:text-[clamp(16px,3.5vw,22px)] lg:text-[24px] tracking-[-0.32px] leading-[1.4] md:leading-[1.3] mb-1.5 sm:mb-1.75 md:mb-2 break-words">
            Configuração Contábil: 3 de 5 Etapas concluídas
          </h2>

          <div className="w-full max-w-[947px] h-[18px] sm:h-[20px] md:h-[22px] lg:h-[26px] bg-[#f5f8fa] rounded-xl relative overflow-hidden mb-2 sm:mb-2.25 md:mb-2.5 lg:mb-3">
            <div className="h-full w-[60%] max-w-[422px] bg-accent1 rounded-xl" />
          </div>

          <div className="flex flex-col py-4 px-2 gap-[0.75rem] sm:gap-1 md:gap-[1.25rem] lg:gap-[1.5rem]">
            {['Certificado Cadastrado', 'Regime Tributário Definido', 'Mapeamento dos NCMs'].map((etapa) => (
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

      {/* Painel Direito - Cards com stepper vertical */}
      <div className="flex w-[42%] flex-col gap-4 p-2 sm:p-3 lg:min-h-full lg:overflow-auto">
        {[
          {
            id: 1,
            title: 'Configurar Certificado Digital',
            content: (
              <>
              <div className="flex flex-row w-full mb-2 items-center rounded-[10px] px-3 py-1 gap-2">
                <div className="flex flex-col gap-1">
                <p className="font-inter font-medium text-secondary-text text-xs lg:text-sm">
                  Cadastre o certificado digital da empresa e deixe sua comunicação com a SEFAZ funcionando
                </p>
                  <span className="font-inter font-medium text-secondary-text text-xs lg:text-sm">
                    Tipo: A1
                  </span>
                  <span className="font-inter font-medium text-secondary-text text-xs lg:text-sm">
                    Validade: 22/12/2025
                  </span>
                </div>
                <div className="flex flex-col w-full mb-2 items-center rounded-[10px] px-3 py-1 gap-2">
                  <Button
                    onClick={handleOpenCertificadoConfig}
                    className="rounded-lg px-3 py-2 text-white text-sm font-medium"
                    sx={{
                      backgroundColor: 'var(--color-secondary)',
                      '&:hover': { backgroundColor: 'var(--color-alternate)' },
                    }}
                  >
                    Cadastrar Certificado
                  </Button>
                  <span className="font-inter font-medium text-[#f6f8fc] text-sm bg-accent1 rounded-lg px-3 py-1">
                    Expira em 27 dias
                  </span>
                  </div>
                </div>
              </>
            ),
          },
          {
            id: 2,
            title: 'Mapear NCM, Cest e CFOP',
            content: (
              <>
              <div className="flex flex-row w-full mb-2 items-center rounded-[10px] px-3 py-1 gap-2">
                <div className="flex flex-row justify-between gap-1">
                <p className="font-inter font-medium text-secondary-text text-xs lg:text-sm">
                  Classifique produtos para que notas e impostos sejam calculados corretamente
                </p>
                <div className="flex flex-col w-full mb-2 items-center rounded-[10px] px-3 py-1 gap-2">
                  <Button
                    onClick={handleOpenNCMConfig}
                    className="rounded-lg px-3 py-2 text-white text-sm font-medium"
                    sx={{
                      backgroundColor: 'var(--color-secondary)',
                      '&:hover': { backgroundColor: 'var(--color-alternate)' },
                    }}
                  >
                    Mapear Produtos
                  </Button>
                  <div className="inline-flex items-center rounded-lg bg-[#ffa3a3] px-3 py-1 h-[26px] sm:h-[28px] lg:h-[30px] w-fit">
                    <span className="font-inter font-medium text-[#dd1717] text-[11px] sm:text-[12px] leading-[1.4]">
                      8 PRODUTOS PENDENTES
                    </span>
                  </div>
                </div>
                </div>
              </div>
              </>
            ),
          },
          {
            id: 3,
            title: 'Configurar Impostos',
            content: (
              <>
              <div className="flex flex-row w-full mb-2 items-center rounded-[10px] px-3 py-1 gap-2">
                <div className="flex flex-col w-full mb-2 items-start rounded-[10px] px-3 py-1 gap-2">
                <p className="font-inter font-medium text-secondary-text text-xs lg:text-sm">
                  Configure os cenários fiscais e defina as regras de impostos para sua empresa
                </p>
                  <span className="font-inter font-medium text-secondary-text text-xs lg:text-sm">
                    Cenário: Padrão
                  </span>
                  <span className="font-inter font-medium text-secondary-text text-xs lg:text-sm">
                    Status: Ativo
                  </span>
                </div>
                <div className="flex flex-col w-full mb-2 items-center rounded-[10px] px-3 py-1 gap-2">
                  <Button
                    onClick={handleOpenImpostosConfig}
                    className="rounded-lg px-3 py-2 text-white text-sm font-medium"
                    sx={{
                      backgroundColor: 'var(--color-secondary)',
                      '&:hover': { backgroundColor: 'var(--color-alternate)' },
                    }}
                  >
                    Configurar Impostos
                  </Button>
                  <span className="font-inter font-medium text-[#f6f8fc] text-sm bg-accent1 rounded-lg px-3 py-1">
                    Configurado
                  </span>
                </div>
                </div>
              </>
            ),
          },
        ].map((step, index, arr) => (
          <div key={step.id} className="flex items-stretch gap-3">
            {/* coluna do stepper */}
            <div className="flex h-full flex-col items-center self-stretch">
              <div
                className={`w-[2px] flex-1 ${index === 0 ? 'bg-transparent' : 'bg-gradient-to-b from-primary/30 to-primary/60'}`}
              />
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary text-primary font-bold bg-white my-1">
                {step.id}
              </div>
              <div
                className={`w-[2px] flex-1 ${index === arr.length - 1 ? 'bg-transparent' : 'bg-gradient-to-b from-primary to-primary/40'}`}
              />
            </div>
            {/* card */}
            <div className="flex-1 rounded-[24px] border border-primary bg-[#f6f8fc] p-3 sm:p-3.5 md:p-4 shadow-sm">
              <h3 className="text-center font-exo font-medium text-primary text-sm sm:text-lg md:text-xl lg:text-2xl mb-2">
                {step.title}
              </h3>
              <div className="flex flex-col gap-2">{step.content}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

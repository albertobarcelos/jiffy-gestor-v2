'use client'

import React, { useEffect, useCallback } from 'react'
import { MdCheckCircle } from 'react-icons/md'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { ConfiguracaoImpostosView } from '@/src/presentation/components/features/impostos/ConfiguracaoImpostosView'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { ConfiguracaoEmpresaCompleta } from './ConfiguracaoEmpresaCompleta'
import { MapearProdutosView } from './MapearProdutosView'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { usePainelContadorProgress } from '@/src/presentation/hooks/painel-contador/usePainelContadorProgress'
import { useResumoEmpresaPainel } from '@/src/presentation/hooks/painel-contador/useResumoEmpresaPainel'
import {
  EtapaHabilitadaPolicy,
  type EtapaPainelId,
} from '@/src/domain/policies/painel-contador/EtapaHabilitadaPolicy'
import { PAINEL_CONTADOR_ETAPAS, PORTAL_CONTADOR_PATH } from './painelContadorEtapas'

interface SectionBoxProps {
  title: string
  children: React.ReactNode
}

function SectionBox({ title, children }: SectionBoxProps) {
  return (
    <div className="relative flex flex-col gap-3 border border-alternate/50 rounded-lg pt-4 pb-3 px-3">
      <div className="absolute -top-4 left-4 right-4 flex items-center justify-center">
        <h3 className="font-exo font-semibold text-alternate text-xs sm:text-sm md:text-lg whitespace-nowrap px-2 bg-white">
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

export function PainelContadorView() {
  const { addTab, activeTabId } = useTabsStore()
  const { isRehydrated } = useAuthStore()

  const { data: resumo } = useResumoEmpresaPainel()
  const { data: progresso, isFetching: isVerificandoEtapas, refetchProgresso } =
    usePainelContadorProgress()

  const etapasConcluidas = progresso?.etapasConcluidas ?? {
    'etapa-1-dados-fiscais': false,
    'etapa-2-emissor-fiscal': false,
    'etapa-3-cenario-fiscal': false,
    'etapa-4-numeracoes-fiscais': false,
    'etapa-5-chave-ibpt': false,
  }
  const certificadoStatus = progresso?.certificadoStatus ?? null

  const previousTabIdRef = React.useRef<string | null>(null)

  useEffect(() => {
    addTab({
      id: 'portal-contador',
      label: 'Portal do Contador',
      path: PORTAL_CONTADOR_PATH,
      isFixed: true,
    })
  }, [addTab])

  useEffect(() => {
    if (!isRehydrated) return

    const abasConfiguracao: EtapaPainelId[] = [
      'etapa-1-dados-fiscais',
      'etapa-2-emissor-fiscal',
      'etapa-3-cenario-fiscal',
    ]
    const estavaEmConfiguracao =
      previousTabIdRef.current && abasConfiguracao.includes(previousTabIdRef.current as EtapaPainelId)
    const voltouParaPrincipal = activeTabId === 'portal-contador'
    const eraPrincipalAntes = previousTabIdRef.current === 'portal-contador'

    if (estavaEmConfiguracao && voltouParaPrincipal && !eraPrincipalAntes) {
      const timeoutId = setTimeout(() => refetchProgresso(), 500)
      previousTabIdRef.current = activeTabId
      return () => clearTimeout(timeoutId)
    }

    previousTabIdRef.current = activeTabId
  }, [activeTabId, isRehydrated, refetchProgresso])

  useEffect(() => {
    if (!isRehydrated) return
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const handleFocus = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => refetchProgresso(), 1000)
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isRehydrated, refetchProgresso])

  const isEtapaHabilitada = useCallback(
    (etapaId: string) =>
      EtapaHabilitadaPolicy.check(etapaId as EtapaPainelId, etapasConcluidas),
    [etapasConcluidas]
  )

  const handleOpenEtapa = (etapaId: string, label: string) => {
    if (!isEtapaHabilitada(etapaId)) {
      showToast.warning(EtapaHabilitadaPolicy.mensagemBloqueio(etapaId as EtapaPainelId))
      return
    }
    addTab({ id: etapaId, label, path: PORTAL_CONTADOR_PATH, isFixed: false })
  }

  if (activeTabId === 'impostos') {
    return <ConfiguracaoImpostosView />
  }
  if (activeTabId === 'config-ncm-cest') {
    return <MapearProdutosView />
  }
  if (activeTabId === 'config-empresa-completa') {
    return <ConfiguracaoEmpresaCompleta />
  }

  const etapaAtiva = PAINEL_CONTADOR_ETAPAS.find((e) => e.id === activeTabId)
  if (etapaAtiva) {
    const EtapaComponent = etapaAtiva.component
    return <EtapaComponent />
  }

  const etapas = PAINEL_CONTADOR_ETAPAS.filter((e) => e.id !== 'reforma-tributaria')
  const porcentagem = progresso?.porcentagemObrigatorias ?? 0
  const totalConcluidas = progresso?.totalConcluidasObrigatorias ?? 0

  return (
    <div className="pb-2 flex w-full flex-col items-stretch bg-info lg:flex-row lg:h-full">
      <div className="flex min-h-[300px] flex-1 md:w-[70%] lg:w-[72%] w-full flex-col overflow-hidden rounded-tr-none rounded-br-none bg-secondary lg:h-full lg:rounded-tr-[48px] lg:rounded-br-[48px]">
        <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6 border-b border-[#330468] bg-[rgba(131,56,236,0.4)] sm:rounded-tr-[24px] md:rounded-tr-[32px] lg:rounded-tr-[48px] p-3 sm:p-4">
          <div className="flex flex-row items-center justify-center gap-4 sm:gap-16">
            <div className="flex aspect-square">
              <img
                src="/images/jiffy-contador.png"
                alt="Jiffy Contador"
                className="md:w-64 md:h-64 w-28 h-28 p-2 object-contain object-left-top"
              />
            </div>
            <div className="flex flex-col gap-3 sm:gap-4">
              <h1 className="font-manrope font-semibold text-white text-2xl sm:text-3xl md:text-4xl lg:text-6xl">
                Portal do <p className="md:py-2">Contador</p>
              </h1>
              <div className="flex flex-col">
                <div className="flex flex-wrap items-start sm:items-center gap-2">
                  <span className="font-exo font-semibold text-white text-xs sm:text-lg md:text-xl lg:text-2xl">
                    Empresa:
                  </span>
                  <span className="font-exo font-normal text-white text-xs sm:text-lg md:text-xl lg:text-2xl">
                    {resumo?.nomeExibicao ?? 'Empresa'}
                  </span>
                </div>
                <div className="flex flex-wrap items-start sm:items-center gap-2">
                  <span className="font-exo font-medium text-white text-xs sm:text-lg md:text-xl lg:text-2xl">
                    CNPJ:
                  </span>
                  <span className="font-exo font-normal text-white text-xs sm:text-lg md:text-xl lg:text-2xl">
                    {resumo?.cnpj ?? '--'}
                  </span>
                </div>
                <div className="flex flex-wrap items-start sm:items-center gap-2">
                  <span className="font-exo font-medium text-white text-xs sm:text-lg md:text-xl lg:text-2xl">
                    Regime:
                  </span>
                  <span className="font-exo font-normal text-white text-xs sm:text-lg md:text-xl lg:text-2xl">
                    {resumo?.regimeLabel ?? 'Não informado'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-4 mt-4 flex flex-col">
          <h2 className="font-manrope font-semibold text-white text-[clamp(12px,2.5vw,16px)] sm:text-[clamp(14px,3vw,18px)] md:text-[clamp(16px,3.5vw,22px)] lg:text-[24px] tracking-[-0.32px] leading-[1.4] md:leading-[1.3] mb-1.5 sm:mb-1.75 md:mb-2 break-words">
            Configuração Contábil: {totalConcluidas} de 3 Etapas concluídas
          </h2>
          <div className="w-full max-w-[947px] h-[18px] sm:h-[20px] md:h-[22px] lg:h-[26px] bg-[#f5f8fa] rounded-xl relative overflow-hidden mb-2 sm:mb-2.25 md:mb-2.5 lg:mb-3 flex-shrink-0">
            <div
              className="h-full bg-accent1 rounded-xl transition-all duration-500 ease-out"
              style={{ width: `${porcentagem}%`, maxWidth: '100%' }}
            />
          </div>

          <div className="flex flex-col px-2 sm:px-3 md:px-4 gap-[0.5rem] sm:gap-[0.625rem] md:gap-[1.25rem] lg:gap-1.5rem">
            {etapas
              .filter((etapa) => etapa.step <= 3)
              .map((etapa) => {
                const estaConcluida = etapasConcluidas[etapa.id as EtapaPainelId] || false
                const estaHabilitada = isEtapaHabilitada(etapa.id)

                return (
                  <div key={etapa.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-[0.375rem] sm:gap-[0.5rem] md:gap-[0.75rem] group">
                      <button
                        onClick={() => handleOpenEtapa(etapa.id, etapa.label)}
                        className={`flex items-center gap-[0.375rem] sm:gap-[0.5rem] md:gap-[0.625rem] transition-opacity text-left ${
                          estaHabilitada
                            ? 'hover:opacity-80 cursor-pointer'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        {estaConcluida ? (
                          <MdCheckCircle
                            className="flex-shrink-0 text-white group-hover:scale-110 transition-transform"
                            size={16}
                          />
                        ) : (
                          <div className="flex-shrink-0 w-4 h-4 rounded-full border-2 border-white/50 group-hover:border-white transition-colors" />
                        )}
                        <span
                          className={`font-manrope font-semibold text-white text-[clamp(10px,1.8vw,12px)] sm:text-[clamp(11px,2vw,13px)] md:text-[clamp(12px,2.2vw,14px)] lg:text-lg tracking-[-0.2px] leading-[1.3] ${
                            estaConcluida ? '' : 'opacity-75'
                          } ${estaHabilitada ? 'group-hover:underline' : ''}`}
                        >
                          {etapa.step} - {etapa.title}
                        </span>
                        {isVerificandoEtapas && (
                          <div className="ml-1 flex flex-shrink-0 items-center [&>div]:!gap-0 [&>div]:!py-0">
                            <JiffyLoading className="!gap-0 !py-0" size={24} />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      <div className="flex md:w-[30%] lg:w-[28%] flex-col gap-4 p-4 sm:p-5 lg:h-full lg:overflow-y-auto">
        <SectionBox title="Configuração Contábil">
          {etapas.slice(0, 3).map((etapa, index) => {
            const IconComponent = etapa.icon
            const usarAccentVerde = index % 2 === 1
            const bgColor = usarAccentVerde ? 'bg-white' : 'bg-secondary'
            const corConteudo = usarAccentVerde ? 'text-secondary' : 'text-white'
            const estaHabilitada = isEtapaHabilitada(etapa.id)

            return (
              <button
                key={etapa.id}
                onClick={() => handleOpenEtapa(etapa.id, etapa.label)}
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
                  <span className={`font-exo font-medium text-sm sm:text-base md:text-lg ${corConteudo}`}>
                    {etapa.title}
                  </span>
                </div>
              </button>
            )
          })}
        </SectionBox>

        <SectionBox title="Outras Configurações">
          {etapas.slice(3).map((etapa, index) => {
            const IconComponent = etapa.icon
            const usarAccentVerde = index % 2 === 1
            const bgColor = usarAccentVerde ? 'bg-secondary' : 'bg-white'
            const corConteudo = usarAccentVerde ? 'text-white' : 'text-secondary'

            return (
              <button
                key={etapa.id}
                onClick={() => handleOpenEtapa(etapa.id, etapa.label)}
                className={`relative w-full rounded-[16px] border-2 border-alternate ${bgColor} hover:scale-105 active:scale-100 transition-transform duration-200 p-4 sm:p-5 shadow-sm hover:shadow-md text-center group flex flex-col items-center gap-3`}
              >
                <span className="absolute top-3 left-3 sm:top-4 sm:left-4 font-exo font-medium text-alternate text-sm sm:text-base md:text-lg rounded-full bg-white w-8 h-8 flex items-center justify-center">
                  {etapa.step}
                </span>
                <div className="flex flex-col items-center justify-center gap-2">
                  <IconComponent className={corConteudo} size={52} />
                  <span className={`font-exo font-medium text-sm sm:text-base md:text-lg ${corConteudo}`}>
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

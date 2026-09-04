'use client'

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { MdCheckCircle, MdStorefront } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import {
  DELIVERY_HUB_ETAPAS,
  DELIVERY_HUB_PATH,
  DELIVERY_HUB_TAB_ID,
  getDeliveryEtapaById,
  isDeliveryEtapaId,
  isDeliveryTabId,
  type DeliveryEtapaId,
} from './deliveryHubEtapas'
import { calcularDeliveryHubProgresso } from './deliveryHubProgresso'
import { DeliveryTabBar } from './DeliveryTabBar'

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col gap-3 rounded-lg border border-alternate/50 px-3 pb-3 pt-4">
      <div className="absolute -top-4 left-4 right-4 flex items-center justify-center">
        <h3 className="whitespace-nowrap bg-white px-2 text-xs font-semibold text-alternate sm:text-sm md:text-lg">
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

/**
 * Hub Delivery (visual do portal) — nesta branch só a etapa Cobertura.
 * Sem loja pública / design / agenda.
 */
export function DeliveryHubView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toGestao } = useGestaoPath()
  const { addTab, activeTabId } = useTabsStore()
  const empresaDeliveryQuery = useEmpresaDeliveryMe()
  const previousTabIdRef = useRef<string | null>(null)

  const empresaDelivery = empresaDeliveryQuery.data
  const configurado = empresaDelivery != null
  const pendencias = empresaDelivery?.pendencias ?? []
  const progresso = useMemo(
    () => calcularDeliveryHubProgresso(pendencias, configurado),
    [pendencias, configurado]
  )

  useEffect(() => {
    addTab({
      id: DELIVERY_HUB_TAB_ID,
      label: 'Delivery',
      path: DELIVERY_HUB_PATH,
      isFixed: true,
    })
  }, [addTab])

  // Deep-link ?abrir=delivery-cobertura
  useEffect(() => {
    const abrir = searchParams.get('abrir')
    if (!abrir || !isDeliveryEtapaId(abrir)) return

    const etapa = getDeliveryEtapaById(abrir)
    if (!etapa) return

    addTab({ id: etapa.id, label: etapa.label, path: etapa.path })
    router.replace(DELIVERY_HUB_PATH, { scroll: false })
  }, [addTab, router, searchParams])

  useEffect(() => {
    const voltouParaHub = activeTabId === DELIVERY_HUB_TAB_ID
    const estavaEmEtapa =
      previousTabIdRef.current && isDeliveryEtapaId(previousTabIdRef.current)

    if (estavaEmEtapa && voltouParaHub) {
      const timeoutId = setTimeout(() => {
        void empresaDeliveryQuery.refetch()
      }, 400)
      previousTabIdRef.current = activeTabId
      return () => clearTimeout(timeoutId)
    }

    previousTabIdRef.current = activeTabId
  }, [activeTabId, empresaDeliveryQuery])

  const abrirEtapa = useCallback((etapaId: DeliveryEtapaId) => {
    const etapa = getDeliveryEtapaById(etapaId)
    if (!etapa) return
    addTab({ id: etapa.id, label: etapa.label, path: etapa.path })
  }, [addTab])

  const etapaAtiva =
    activeTabId && isDeliveryEtapaId(activeTabId)
      ? getDeliveryEtapaById(activeTabId)
      : undefined

  if (etapaAtiva) {
    const EtapaComponent = etapaAtiva.component
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DeliveryTabBar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <EtapaComponent />
        </div>
      </div>
    )
  }

  if (empresaDeliveryQuery.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <JiffyLoading />
      </div>
    )
  }

  if (empresaDeliveryQuery.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm font-semibold text-primary-text">
          Não foi possível carregar os dados do Delivery.
        </p>
        <p className="text-sm text-secondary-text">{empresaDeliveryQuery.error.message}</p>
        <button
          type="button"
          onClick={() => void empresaDeliveryQuery.refetch()}
          className="mt-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <DeliveryTabBar />
      <DeliveryHubEnsureActive />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-info lg:flex-row lg:overflow-hidden">
        <div className="flex min-h-[300px] w-full flex-1 flex-col overflow-hidden rounded-br-none rounded-tr-none bg-secondary lg:h-full lg:w-[72%] lg:rounded-br-[48px] lg:rounded-tr-[48px]">
          <div className="flex min-h-0 flex-[2] flex-col justify-center gap-3 overflow-hidden border-b border-[#330468] bg-[rgba(131,56,236,0.4)] p-4 sm:gap-4 sm:rounded-tr-[24px] sm:p-5 md:rounded-tr-[32px] md:p-6 lg:rounded-tr-[48px] lg:p-7">
            <div className="flex flex-row items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-row items-center gap-4 sm:gap-8">
                <div className="flex aspect-square shrink-0 items-center justify-center rounded-2xl bg-white/15 p-3 sm:p-4">
                  <MdStorefront className="h-14 w-14 text-white sm:h-20 sm:w-20 md:h-24 md:w-24" aria-hidden />
                </div>
                <div className="flex min-w-0 flex-col gap-2 sm:gap-3">
                  <h1 className="text-2xl font-semibold text-white sm:text-3xl md:text-4xl lg:text-5xl">
                    Delivery
                  </h1>
                  <p className="text-sm text-white/90 sm:text-base">
                    Configure a cobertura de entrega (áreas e raios) usada no pedido gestor.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-4 mb-3 mt-3 flex min-h-0 flex-[3] flex-col overflow-hidden">
            <h2 className="mb-1.5 shrink-0 text-[clamp(12px,2.5vw,16px)] font-semibold leading-[1.3] tracking-[-0.32px] text-white sm:text-[clamp(14px,3vw,18px)] md:text-[clamp(15px,3.2vw,20px)] lg:text-[22px]">
              Configuração Delivery: {progresso.concluidosObrigatorios} de{' '}
              {progresso.totalObrigatorios} etapas obrigatórias concluídas
            </h2>
            <div className="relative mb-2 h-[14px] w-full max-w-[947px] shrink-0 overflow-hidden rounded-xl bg-[#f5f8fa] sm:h-[16px] md:h-[18px] lg:h-[20px]">
              <div
                className="h-full rounded-xl bg-accent1 transition-all duration-500 ease-out"
                style={{ width: `${progresso.porcentagemObrigatorias}%`, maxWidth: '100%' }}
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 sm:px-3 md:px-4">
              {progresso.passos.map((passo, index) => (
                <div key={passo.id} className="group flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (passo.etapaId) {
                        abrirEtapa(passo.etapaId)
                        return
                      }
                      if (passo.href) {
                        router.push(toGestao(passo.href))
                      }
                    }}
                    className="flex items-center gap-2 text-left transition-opacity hover:opacity-80"
                  >
                    {passo.concluido ? (
                      <MdCheckCircle
                        className="flex-shrink-0 text-white transition-transform group-hover:scale-110"
                        size={16}
                      />
                    ) : (
                      <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-white/50 transition-colors group-hover:border-white" />
                    )}
                    <span
                      className={`text-[clamp(10px,1.8vw,12px)] font-semibold leading-[1.3] tracking-[-0.2px] text-white sm:text-[clamp(11px,2vw,13px)] md:text-[clamp(12px,2.2vw,14px)] lg:text-base ${
                        passo.concluido ? '' : 'opacity-75'
                      } group-hover:underline`}
                    >
                      {index + 1} - {passo.label}
                      {!passo.obrigatoria ? ' (opcional)' : ''}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 p-4 sm:p-5 md:w-[30%] lg:h-full lg:w-[28%] lg:overflow-y-auto">
          <SectionBox title="Configuração Delivery">
            {DELIVERY_HUB_ETAPAS.map((etapa, index) => {
              const IconComponent = etapa.icon
              const usarAccentVerde = index % 2 === 1
              const bgColor = usarAccentVerde ? 'bg-white' : 'bg-secondary'
              const corConteudo = usarAccentVerde ? 'text-secondary' : 'text-white'

              return (
                <button
                  key={etapa.id}
                  type="button"
                  onClick={() => abrirEtapa(etapa.id)}
                  className={`group relative flex w-full cursor-pointer flex-col items-center gap-3 rounded-[16px] border-2 border-alternate p-4 text-center shadow-sm transition-transform duration-200 hover:scale-105 hover:shadow-md active:scale-100 sm:p-5 ${bgColor}`}
                >
                  <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-medium text-alternate sm:left-4 sm:top-4 sm:text-base md:text-lg">
                    {etapa.step}
                  </span>
                  <div className="flex flex-col items-center justify-center gap-2">
                    <IconComponent className={corConteudo} size={52} />
                    <span className={`text-sm font-medium sm:text-base md:text-lg ${corConteudo}`}>
                      {etapa.title}
                    </span>
                    {etapa.botaoLabel ? (
                      <span
                        className={`rounded-md px-3 py-1 text-xs font-semibold ${
                          usarAccentVerde
                            ? 'bg-secondary/10 text-secondary'
                            : 'bg-white/20 text-white'
                        }`}
                      >
                        {etapa.botaoLabel}
                      </span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </SectionBox>

          <p className="text-center text-[11px] text-secondary-text">
            Geolocalização da empresa fica em{' '}
            <Link
              href={toGestao('/configuracoes/empresa')}
              className="font-semibold text-secondary underline-offset-2 hover:underline"
            >
              Configurações → Empresa
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

function DeliveryHubEnsureActive() {
  const { activeTabId, setActiveTab, tabs } = useTabsStore()

  useEffect(() => {
    if (!isDeliveryTabId(activeTabId)) {
      const hub = tabs.find(t => t.id === DELIVERY_HUB_TAB_ID)
      if (hub) setActiveTab(DELIVERY_HUB_TAB_ID)
    }
  }, [activeTabId, setActiveTab, tabs])

  return null
}

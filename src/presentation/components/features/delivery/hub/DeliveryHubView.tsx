'use client'

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useAreasEntregaDelivery } from '@/src/presentation/hooks/useAreasEntregaDelivery'
import { useCanalWhatsAppDelivery, useCanalWhatsAppStatus } from '@/src/presentation/hooks/useCanalWhatsAppDelivery'
import { useDeliveryHubCadastrosRecomendados } from '@/src/presentation/hooks/useDeliveryHubCadastrosRecomendados'
import { useRaiosEntregaDelivery } from '@/src/presentation/hooks/useRaiosEntregaDelivery'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { EMPRESA_DELIVERY_PENDENCIA_TYPES } from '@/src/shared/constants/empresaDeliveryPendencias'
import {
  DELIVERY_HUB_PATH,
  DELIVERY_HUB_TAB_ID,
  getDeliveryEtapaById,
  isDeliveryEtapaId,
  isDeliveryTabId,
  type DeliveryEtapaId,
} from './deliveryHubEtapas'
import { calcularDeliveryHubProgresso } from './deliveryHubProgresso'
import { DeliveryTabBar } from './DeliveryTabBar'
import { DeliveryHubHome } from './DeliveryHubHome'
import type { DeliveryHubPassoUi } from './deliveryHubPassosUi'
import { resumirCoberturaHub } from './deliveryHubResumoCobertura'

/**
 * Hub Delivery ÔÇö home de setup (checklist + resumo).
 * A cobertura em tela cheia continua em `/config/delivery/cobertura`.
 */
export function DeliveryHubView({ etapaId = null }: { etapaId?: DeliveryEtapaId | null }) {
  const router = useRouter()
  const { toGestao } = useGestaoPath()
  const { addTab, setActiveTab, activeTabId } = useTabsStore()
  const empresaDeliveryQuery = useEmpresaDeliveryMe()
  const empresaMe = useEmpresaMe()
  const previousTabIdRef = useRef<string | null>(null)

  const empresaDelivery = empresaDeliveryQuery.data
  const configurado = empresaDelivery != null
  const pendencias = empresaDelivery?.pendencias ?? []
  const progresso = useMemo(
    () => calcularDeliveryHubProgresso(pendencias, configurado),
    [pendencias, configurado]
  )

  const coberturaHabilitada = empresaDeliveryQuery.isSuccess && empresaDelivery != null
  const raiosQuery = useRaiosEntregaDelivery({ enabled: coberturaHabilitada })
  const areasQuery = useAreasEntregaDelivery({ enabled: coberturaHabilitada })
  const resumoCobertura = useMemo(
    () => resumirCoberturaHub(raiosQuery.data ?? [], areasQuery.data ?? []),
    [raiosQuery.data, areasQuery.data]
  )
  const canalWhatsAppQuery = useCanalWhatsAppDelivery()
  const statusWhatsAppQuery = useCanalWhatsAppStatus({
    enabled: !etapaId && canalWhatsAppQuery.data != null,
    pollar: false,
  })
  const cadastrosRecomendados = useDeliveryHubCadastrosRecomendados(!etapaId)
  const refetchCadastros = cadastrosRecomendados.refetch
  const whatsappConectado =
    statusWhatsAppQuery.data != null
      ? statusWhatsAppQuery.data.conectado === true
      : canalWhatsAppQuery.data?.conectado === true
  const passosExtras = useMemo(
    () => ({
      ...cadastrosRecomendados.extras,
      whatsappConectado,
      empresaDeliveryConfigurada: configurado,
      agendaConfigurada:
        configurado &&
        !pendencias.some(
          p => p.type === EMPRESA_DELIVERY_PENDENCIA_TYPES.FUNCIONAMENTO_AGENDA_NAO_CONFIGURADA
        ),
    }),
    [cadastrosRecomendados.extras, configurado, pendencias, whatsappConectado]
  )

  useEffect(() => {
    addTab({
      id: DELIVERY_HUB_TAB_ID,
      label: 'Delivery',
      path: DELIVERY_HUB_PATH,
      isFixed: true,
    })
    if (etapaId) {
      const etapa = getDeliveryEtapaById(etapaId)
      if (etapa) {
        addTab({ id: etapa.id, label: etapa.label, path: etapa.path })
      }
    } else {
      setActiveTab(DELIVERY_HUB_TAB_ID)
    }
  }, [addTab, etapaId, setActiveTab])

  useEffect(() => {
    const voltouParaHub = activeTabId === DELIVERY_HUB_TAB_ID
    const estavaEmEtapa =
      previousTabIdRef.current && isDeliveryEtapaId(previousTabIdRef.current)

    if (estavaEmEtapa && voltouParaHub) {
      const timeoutId = setTimeout(() => {
        void empresaDeliveryQuery.refetch()
        void canalWhatsAppQuery.refetch()
        void statusWhatsAppQuery.refetch()
        void refetchCadastros()
      }, 400)
      previousTabIdRef.current = activeTabId
      return () => clearTimeout(timeoutId)
    }

    previousTabIdRef.current = activeTabId
  }, [activeTabId, canalWhatsAppQuery, empresaDeliveryQuery, refetchCadastros, statusWhatsAppQuery])

  const abrirEtapa = useCallback(
    (proximaEtapaId: DeliveryEtapaId) => {
      const etapa = getDeliveryEtapaById(proximaEtapaId)
      if (!etapa) return
      addTab({ id: etapa.id, label: etapa.label, path: etapa.path })
      router.push(toGestao(etapa.path))
    },
    [addTab, router, toGestao]
  )

  const abrirPasso = useCallback(
    (passo: DeliveryHubPassoUi) => {
      abrirEtapa(passo.etapaId)
    },
    [abrirEtapa]
  )

  const etapaAtiva = etapaId ? getDeliveryEtapaById(etapaId) : undefined

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
      <DeliveryTabBar />
      <DeliveryHubEnsureActive />
      <DeliveryHubHome
        progresso={progresso}
        resumoCobertura={resumoCobertura}
        endereco={empresaMe.empresa?.endereco ?? null}
        nomeEmpresa={empresaMe.empresa?.nomeExibicao ?? null}
        passosExtras={passosExtras}
        onAbrirPasso={abrirPasso}
      />
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

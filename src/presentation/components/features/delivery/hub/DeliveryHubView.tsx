'use client'

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { useCanalWhatsAppDelivery, useCanalWhatsAppStatus } from '@/src/presentation/hooks/useCanalWhatsAppDelivery'
import { useDeliveryHubCadastrosRecomendados } from '@/src/presentation/hooks/useDeliveryHubCadastrosRecomendados'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { usePedirSaidaCobertura } from '@/src/presentation/components/features/configuracoes/coberturaSairGuard'
import { EMPRESA_DELIVERY_PENDENCIA_TYPES } from '@/src/shared/constants/empresaDeliveryPendencias'
import {
  getDeliveryEtapaById,
  type DeliveryEtapaId,
} from './deliveryHubEtapas'
import { deliveryHubDesignSectionPath } from '@/src/presentation/components/features/delivery-publico/shared/constants/designTabs'
import { calcularDeliveryHubProgresso } from './deliveryHubProgresso'
import { DeliveryHubHome } from './DeliveryHubHome'

/**
 * Hub Delivery — menu lateral + painel direito inline (sem TabBar de etapas).
 */
export function DeliveryHubView({ etapaId = null }: { etapaId?: DeliveryEtapaId | null }) {
  const router = useRouter()
  const { toGestao } = useGestaoPath()
  const pedirSaida = usePedirSaidaCobertura()
  const empresaDeliveryQuery = useEmpresaDeliveryMe()
  const previousEtapaRef = useRef<DeliveryEtapaId | null>(null)

  const activeEtapaId =
    etapaId && etapaId !== 'delivery-loja' ? etapaId : null

  const empresaDelivery = empresaDeliveryQuery.data
  const configurado = empresaDelivery != null
  const pendencias = empresaDelivery?.pendencias ?? []
  const progresso = useMemo(
    () => calcularDeliveryHubProgresso(pendencias, configurado),
    [pendencias, configurado]
  )

  const canalWhatsAppQuery = useCanalWhatsAppDelivery()
  const statusWhatsAppQuery = useCanalWhatsAppStatus({
    enabled: canalWhatsAppQuery.data != null,
    pollar: false,
  })
  const cadastrosRecomendados = useDeliveryHubCadastrosRecomendados(true)
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
    if (etapaId === 'delivery-nome-cardapio') {
      router.replace(toGestao(deliveryHubDesignSectionPath('cardapio')))
      return
    }
    /** Hub sem etapa (ou legado /loja): abre Personalizar Loja direto. */
    if (etapaId == null || etapaId === 'delivery-loja') {
      const design = getDeliveryEtapaById('delivery-design')
      if (design) {
        router.replace(toGestao(design.path))
      }
    }
  }, [etapaId, router, toGestao])

  useEffect(() => {
    const saiuDaEtapa = previousEtapaRef.current != null && activeEtapaId == null
    if (saiuDaEtapa) {
      const timeoutId = setTimeout(() => {
        void empresaDeliveryQuery.refetch()
        void canalWhatsAppQuery.refetch()
        void statusWhatsAppQuery.refetch()
        void refetchCadastros()
      }, 400)
      previousEtapaRef.current = activeEtapaId
      return () => clearTimeout(timeoutId)
    }
    previousEtapaRef.current = activeEtapaId
  }, [
    activeEtapaId,
    canalWhatsAppQuery,
    empresaDeliveryQuery,
    refetchCadastros,
    statusWhatsAppQuery,
  ])

  const abrirEtapa = useCallback(
    (proximaEtapaId: DeliveryEtapaId) => {
      if (proximaEtapaId === activeEtapaId) return
      const etapa = getDeliveryEtapaById(proximaEtapaId)
      if (!etapa || etapa.id === 'delivery-loja') return
      pedirSaida(() => {
        router.push(toGestao(etapa.path))
      })
    },
    [activeEtapaId, pedirSaida, router, toGestao]
  )

  if (
    etapaId == null ||
    etapaId === 'delivery-loja' ||
    etapaId === 'delivery-nome-cardapio'
  ) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <JiffyLoading />
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

  const etapaAtiva = activeEtapaId ? getDeliveryEtapaById(activeEtapaId) : undefined
  const EtapaComponent = etapaAtiva?.component
  const panel =
    EtapaComponent != null ? (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <EtapaComponent />
      </div>
    ) : null

  return (
    <DeliveryHubHome
      progresso={progresso}
      passosExtras={passosExtras}
      activeEtapaId={activeEtapaId}
      onAbrirEtapa={abrirEtapa}
      panel={panel}
    />
  )
}

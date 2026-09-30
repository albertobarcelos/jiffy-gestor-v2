'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { useCanalWhatsAppDelivery, useCanalWhatsAppStatus } from '@/src/presentation/hooks/useCanalWhatsAppDelivery'
import { useDeliveryHubCadastrosRecomendados } from '@/src/presentation/hooks/useDeliveryHubCadastrosRecomendados'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { usePedirSaidaCobertura } from '@/src/presentation/components/features/configuracoes/coberturaSairGuard'
import { EMPRESA_DELIVERY_PENDENCIA_TYPES } from '@/src/shared/constants/empresaDeliveryPendencias'
import { getDeliveryEtapaById, type DeliveryEtapaId } from './deliveryHubEtapas'
import { calcularDeliveryHubProgresso } from './deliveryHubProgresso'
import { DeliveryHubHome } from './DeliveryHubHome'
import type { DeliveryHubPassoUi } from './deliveryHubPassosUi'

const ETAPA_PADRAO: DeliveryEtapaId = 'delivery-cobertura'

/**
 * Hub Delivery: menu à esquerda; o painel da direita renderiza a etapa ativa
 * (`/config/delivery/:etapa`). Sem etapa na URL, redireciona para a padrão.
 */
export function DeliveryHubView({ etapaId = null }: { etapaId?: DeliveryEtapaId | null }) {
  const router = useRouter()
  const { toGestao } = useGestaoPath()
  const pedirSaida = usePedirSaidaCobertura()
  const empresaDeliveryQuery = useEmpresaDeliveryMe()
  const etapaAnteriorRef = useRef<DeliveryEtapaId | null>(etapaId)

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
  const refetchEmpresa = empresaDeliveryQuery.refetch
  const refetchCanal = canalWhatsAppQuery.refetch
  const refetchStatus = statusWhatsAppQuery.refetch
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
    if (etapaId) return
    const etapa = getDeliveryEtapaById(ETAPA_PADRAO)
    if (!etapa) return
    router.replace(toGestao(etapa.path), { scroll: false })
  }, [etapaId, router, toGestao])

  useEffect(() => {
    const anterior = etapaAnteriorRef.current
    etapaAnteriorRef.current = etapaId
    if (!anterior || !etapaId || anterior === etapaId) return

    const timeoutId = setTimeout(() => {
      void refetchEmpresa()
      void refetchCanal()
      void refetchStatus()
      void refetchCadastros()
    }, 400)
    return () => clearTimeout(timeoutId)
  }, [etapaId, refetchCadastros, refetchCanal, refetchEmpresa, refetchStatus])

  const selecionarPasso = useCallback(
    (passo: DeliveryHubPassoUi) => {
      if (passo.etapaId === etapaId) return
      const etapa = getDeliveryEtapaById(passo.etapaId)
      if (!etapa) return
      pedirSaida(() => {
        router.replace(toGestao(etapa.path), { scroll: false })
      })
    },
    [etapaId, pedirSaida, router, toGestao]
  )

  const etapaAtiva = etapaId ? getDeliveryEtapaById(etapaId) : undefined

  if (!etapaId || empresaDeliveryQuery.isPending) {
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

  const EtapaComponent = etapaAtiva?.component
  if (!etapaAtiva || !EtapaComponent) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <DeliveryHubHome
        progresso={progresso}
        passosExtras={passosExtras}
        selecionadoId={etapaId}
        onSelecionarPasso={selecionarPasso}
      >
        <div key={etapaAtiva.id} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <EtapaComponent />
        </div>
      </DeliveryHubHome>
    </div>
  )
}

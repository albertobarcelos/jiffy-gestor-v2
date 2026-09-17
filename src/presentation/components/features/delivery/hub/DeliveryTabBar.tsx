'use client'

import { useRouter } from 'next/navigation'
import { MdClose, MdDesignServices } from 'react-icons/md'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { DELIVERY_HUB_PATH } from '@/src/shared/constants/configuracoesRoutes'
import { usePedirSaidaCobertura } from '@/src/presentation/components/features/configuracoes/coberturaSairGuard'
import {
  DELIVERY_HUB_ETAPAS,
  DELIVERY_HUB_TAB_ID,
  getDeliveryEtapaById,
  isDeliveryTabId,
} from './deliveryHubEtapas'

/**
 * TabBar filtrada só com abas do hub Delivery (evita misturar com Portal do Contador).
 */
export function DeliveryTabBar() {
  const router = useRouter()
  const { toGestao } = useGestaoPath()
  const { tabs, activeTabId, setActiveTab, removeTab } = useTabsStore()
  const pedirSaida = usePedirSaidaCobertura()
  const deliveryTabs = tabs.filter(t => isDeliveryTabId(t.id))

  if (deliveryTabs.length === 0) return null

  const irParaHub = () => {
    pedirSaida(() => {
      setActiveTab(DELIVERY_HUB_TAB_ID)
      router.push(toGestao(DELIVERY_HUB_PATH))
    })
  }

  const irParaAba = (tabId: string, path: string) => {
    setActiveTab(tabId)
    router.push(toGestao(path))
  }

  /** Fecha a aba e navega para a guia Delivery anterior (ou o hub se não houver outra). */
  const fecharAba = (tabId: string) => {
    pedirSaida(() => {
      const wasActive = activeTabId === tabId
      const index = deliveryTabs.findIndex(t => t.id === tabId)
      const previousDelivery =
        index > 0
          ? deliveryTabs[index - 1]
          : deliveryTabs.find(t => t.id !== tabId && t.id !== DELIVERY_HUB_TAB_ID) ??
            deliveryTabs.find(t => t.id === DELIVERY_HUB_TAB_ID)

      removeTab(tabId)
      if (!wasActive) return

      if (!previousDelivery || previousDelivery.id === DELIVERY_HUB_TAB_ID) {
        irParaAba(DELIVERY_HUB_TAB_ID, DELIVERY_HUB_PATH)
        return
      }

      const etapa = getDeliveryEtapaById(previousDelivery.id)
      const path = previousDelivery.path || etapa?.path
      if (path) {
        irParaAba(previousDelivery.id, path)
        return
      }

      irParaAba(DELIVERY_HUB_TAB_ID, DELIVERY_HUB_PATH)
    })
  }

  return (
    <div className="shrink-0 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="flex items-center gap-2 overflow-x-auto px-2 scrollbar-hide">
        {deliveryTabs.map(tab => {
          const isActive = activeTabId === tab.id
          const etapa = getDeliveryEtapaById(tab.id)
          const Icon =
            tab.id === DELIVERY_HUB_TAB_ID
              ? MdDesignServices
              : (etapa?.icon ?? MdDesignServices)

          return (
            <div
              key={tab.id}
              className={`group relative mt-2 flex min-w-fit cursor-pointer items-center gap-1.5 rounded-t-lg border-x border-t bg-alternate/15 px-1.5 py-1 transition-all duration-200 sm:gap-2 sm:px-2 ${
                isActive
                  ? 'border-secondary'
                  : 'border-alternate/30 hover:bg-alternate/20'
              }`}
              onClick={() => {
                if (tab.id === activeTabId) return
                if (tab.id === DELIVERY_HUB_TAB_ID) {
                  irParaHub()
                  return
                }
                if (etapa) {
                  pedirSaida(() => {
                    irParaAba(etapa.id, etapa.path)
                  })
                } else if (tab.path) {
                  pedirSaida(() => {
                    irParaAba(tab.id, tab.path)
                  })
                }
              }}
              title={tab.label}
              role="tab"
              aria-selected={isActive}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? 'text-secondary' : 'text-alternate group-hover:text-secondary'
                }`}
                aria-hidden
              />
              <span
                className={`hidden whitespace-nowrap text-sm font-medium sm:inline ${
                  isActive ? 'text-secondary' : 'text-alternate hover:text-secondary'
                }`}
              >
                {tab.label}
              </span>
              {!tab.isFixed ? (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    fecharAba(tab.id)
                  }}
                  className={`rounded-full p-0.5 hover:bg-alternate/20 ${
                    isActive ? 'text-secondary' : 'text-alternate'
                  }`}
                  title="Fechar aba"
                >
                  <MdClose className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
      <span className="sr-only">{DELIVERY_HUB_ETAPAS.map(e => e.label).join(', ')}</span>
    </div>
  )
}

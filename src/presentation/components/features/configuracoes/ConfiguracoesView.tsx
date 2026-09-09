'use client'

import { useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { EmpresaTab } from './tabs/EmpresaTab'
import { DeliveryHubView } from '@/src/presentation/components/features/delivery/hub/DeliveryHubView'
import { TerminaisTab } from './tabs/TerminaisTab'
import { ImpressorasList } from '@/src/presentation/components/features/impressoras/ImpressorasList'
import { MeiosPagamentosList } from '@/src/presentation/components/features/meios-pagamentos/MeiosPagamentosList'
import { TaxasList } from '@/src/presentation/components/features/taxas/TaxasList'
import { MenusList } from '@/src/presentation/components/features/menus/MenusList'
import {
  CoberturaSairGuardProvider,
  usePedirSaidaCobertura,
} from '@/src/presentation/components/features/configuracoes/coberturaSairGuard'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'
import { cn } from '@/src/shared/utils/cn'
import {
  CONFIGURACOES_DELIVERY_TAB,
  configuracoesTabPath,
  DELIVERY_HUB_PATH,
  type ConfiguracoesTabSlug,
  type ConfiguracoesViewTab,
  type DeliveryEtapaId,
} from '@/src/shared/constants/configuracoesRoutes'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'

const CadastroPorPlanilha = dynamic(
  () =>
    import(
      '@/src/presentation/components/features/cadastro-por-planilha/cadastro-por-planilha'
    ).then(m => ({ default: m.CadastroPorPlanilha })),
  { ssr: false, loading: () => <PageLoading /> }
)

type ConfiguracoesViewProps = {
  activeTab: ConfiguracoesViewTab
  deliveryEtapaId?: DeliveryEtapaId | null
}

/**
 * Configurações — abas em `/configuracoes/:aba`.
 * Delivery: hub em `/configuracoes/empresa-delivery` (e alias `/config/delivery`).
 */
export function ConfiguracoesView({
  activeTab,
  deliveryEtapaId = null,
}: ConfiguracoesViewProps) {
  return (
    <CoberturaSairGuardProvider>
      <ConfiguracoesViewInner activeTab={activeTab} deliveryEtapaId={deliveryEtapaId} />
    </CoberturaSairGuardProvider>
  )
}

function ConfiguracoesViewInner({
  activeTab,
  deliveryEtapaId = null,
}: ConfiguracoesViewProps) {
  const router = useRouter()
  const { toGestao } = useGestaoPath()
  const pedirSaida = usePedirSaidaCobertura()

  const deliveryAtivo =
    activeTab === 'empresa-delivery' || activeTab === CONFIGURACOES_DELIVERY_TAB

  const goToTab = useCallback(
    (tab: ConfiguracoesViewTab) => {
      const path =
        tab === CONFIGURACOES_DELIVERY_TAB || tab === 'empresa-delivery'
          ? DELIVERY_HUB_PATH
          : configuracoesTabPath(tab as ConfiguracoesTabSlug)
      pedirSaida(() => router.replace(toGestao(path), { scroll: false }))
    },
    [pedirSaida, router, toGestao]
  )

  const tabBtn = (tab: ConfiguracoesViewTab, label: string) => {
    const isActive =
      tab === 'empresa-delivery' || tab === CONFIGURACOES_DELIVERY_TAB
        ? deliveryAtivo
        : activeTab === tab
    return (
      <button
        key={tab}
        type="button"
        onClick={() => goToTab(tab)}
        className={cn(
          'rounded-t-lg px-4 py-2 text-xs font-semibold transition-colors md:text-sm',
          isActive
            ? 'bg-primary text-white'
            : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
        )}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="flex h-full flex-col pt-2">
      <div className="w-full shrink-0 border-b border-gray-200 bg-gray-50 px-4 md:px-4">
        <div className="flex flex-wrap gap-1 pt-2">
          {tabBtn('empresa', 'Empresa')}
          {tabBtn('empresa-delivery', 'Delivery')}
          {tabBtn('terminais', 'Terminais')}
          {tabBtn('impressoras', 'Impressoras')}
          {tabBtn('meios-pagamentos', 'Meios de pagamento')}
          {tabBtn('taxas', 'Taxas')}
          {tabBtn('menus', 'Menus')}
          {tabBtn('importar-dados', 'Importar Dados')}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden rounded-b-[10px] bg-info">
          {activeTab === 'empresa' && <EmpresaTab />}
          {deliveryAtivo && <DeliveryHubView etapaId={deliveryEtapaId} />}
          {activeTab === 'terminais' && <TerminaisTab />}
          {activeTab === 'impressoras' && <ImpressorasList />}
          {activeTab === 'meios-pagamentos' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <MeiosPagamentosList />
            </div>
          )}
          {activeTab === 'taxas' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <TaxasList />
            </div>
          )}
          {activeTab === 'menus' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <MenusList />
            </div>
          )}
          {activeTab === 'importar-dados' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CadastroPorPlanilha />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

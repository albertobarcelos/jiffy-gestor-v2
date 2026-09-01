'use client'

import { useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { EmpresaTab } from './tabs/EmpresaTab'
import { TerminaisTab } from './tabs/TerminaisTab'
import { ImpressorasList } from '@/src/presentation/components/features/impressoras/ImpressorasList'
import { MeiosPagamentosList } from '@/src/presentation/components/features/meios-pagamentos/MeiosPagamentosList'
import { TaxasList } from '@/src/presentation/components/features/taxas/TaxasList'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'
import { cn } from '@/src/shared/utils/cn'
import {
  configuracoesTabPath,
  type ConfiguracoesTabSlug,
} from '@/src/shared/constants/configuracoesRoutes'

const CadastroPorPlanilha = dynamic(
  () =>
    import(
      '@/src/presentation/components/features/cadastro-por-planilha/cadastro-por-planilha'
    ).then(m => ({ default: m.CadastroPorPlanilha })),
  { ssr: false, loading: () => <PageLoading /> }
)

type ConfiguracoesViewProps = {
  activeTab: ConfiguracoesTabSlug
}

/**
 * Configurações — abas em `/configuracoes/:aba` (ex.: `/configuracoes/taxas`).
 */
export function ConfiguracoesView({ activeTab }: ConfiguracoesViewProps) {
  const router = useRouter()

  const goToTab = useCallback(
    (tab: ConfiguracoesTabSlug) => {
      router.replace(configuracoesTabPath(tab), { scroll: false })
    },
    [router]
  )

  const tabBtn = (tab: ConfiguracoesTabSlug, label: string) => (
    <button
      key={tab}
      type="button"
      onClick={() => goToTab(tab)}
      className={cn(
        'rounded-t-lg px-4 py-2 text-xs font-semibold transition-colors md:text-sm',
        activeTab === tab
          ? 'bg-primary text-white'
          : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
      )}
    >
      {label}
    </button>
  )

  return (
    <div className="flex h-full flex-col pt-2">
      <div className="w-full shrink-0 border-b border-gray-200 bg-gray-50 px-4 md:px-4">
        <div className="flex flex-wrap gap-1 pt-2">
          {tabBtn('empresa', 'Empresa')}
          {tabBtn('terminais', 'Terminais')}
          {tabBtn('impressoras', 'Impressoras')}
          {tabBtn('meios-pagamentos', 'Meios de pagamento')}
          {tabBtn('taxas', 'Taxas')}
          {tabBtn('importar-dados', 'Importar Dados')}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden rounded-b-[10px] bg-info">
          {activeTab === 'empresa' && <EmpresaTab />}
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

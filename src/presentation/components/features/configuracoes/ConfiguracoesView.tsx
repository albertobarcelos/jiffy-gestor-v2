'use client'

import { useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { EmpresaTab } from './tabs/EmpresaTab'
import { TerminaisTab } from './tabs/TerminaisTab'
import { ImpressorasList } from '@/src/presentation/components/features/impressoras/ImpressorasList'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'
import { cn } from '@/src/shared/utils/cn'

const CadastroPorPlanilha = dynamic(
  () =>
    import(
      '@/src/presentation/components/features/cadastro-por-planilha/cadastro-por-planilha'
    ).then(m => ({ default: m.CadastroPorPlanilha })),
  { ssr: false, loading: () => <PageLoading /> }
)

type ConfigTab = 'empresa' | 'terminais' | 'impressoras' | 'planilha'

const TAB_QUERY_VALUES: readonly ConfigTab[] = ['empresa', 'terminais', 'impressoras', 'planilha']

function parseTabParam(value: string | null): ConfigTab {
  if (value && TAB_QUERY_VALUES.includes(value as ConfigTab)) {
    return value as ConfigTab
  }
  return 'empresa'
}

/**
 * Componente principal de Configurações
 * Replica o design e funcionalidades do Flutter
 */
export function ConfiguracoesView() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Fonte única: ?tab= na URL (ex.: /configuracoes?tab=planilha)
  const activeTab = useMemo(() => parseTabParam(searchParams.get('tab')), [searchParams])

  const goToTab = useCallback(
    (tab: ConfigTab) => {
      const q = new URLSearchParams(searchParams.toString())
      if (tab === 'empresa') {
        q.delete('tab')
      } else {
        q.set('tab', tab)
      }
      const qs = q.toString()
      router.replace(qs ? `/configuracoes?${qs}` : '/configuracoes', { scroll: false })
    },
    [router, searchParams]
  )

  const tabBtn = (tab: ConfigTab, label: string) => (
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
      {/* Mesmo padrão visual das abas em modais (ex.: NovoGrupo, Grupo de Complementos) */}
      <div className="w-full shrink-0 border-b border-gray-200 bg-gray-50 px-4 md:px-4">
        <div className="flex flex-wrap gap-1 pt-2">
          {tabBtn('empresa', 'Empresa')}
          {tabBtn('terminais', 'Terminais')}
          {tabBtn('impressoras', 'Impressoras')}
          {tabBtn('planilha', 'Importar Dados')}
        </div>
      </div>

      {/* Conteúdo das tabs - ocupa todo o espaço restante */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden rounded-b-[10px] bg-info">
          {activeTab === 'empresa' && <EmpresaTab />}
          {activeTab === 'terminais' && <TerminaisTab />}
          {activeTab === 'impressoras' && <ImpressorasList />}
          {activeTab === 'planilha' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CadastroPorPlanilha />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

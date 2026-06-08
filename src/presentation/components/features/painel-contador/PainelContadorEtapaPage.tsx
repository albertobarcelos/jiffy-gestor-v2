'use client'

import { Suspense, useEffect } from 'react'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'
import type { EtapaPainelConfig } from './painelContadorEtapas'

interface PainelContadorEtapaPageProps {
  etapa: EtapaPainelConfig
}

export function PainelContadorEtapaPage({ etapa }: PainelContadorEtapaPageProps) {
  const { addTab } = useTabsStore()
  const EtapaComponent = etapa.component

  useEffect(() => {
    addTab({
      id: etapa.id,
      label: etapa.label,
      path: etapa.path,
      isFixed: false,
    })
  }, [addTab, etapa.id, etapa.label, etapa.path])

  return (
    <Suspense fallback={<PageLoading />}>
      <EtapaComponent />
    </Suspense>
  )
}

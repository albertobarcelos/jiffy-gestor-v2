'use client'

import { Suspense, useEffect } from 'react'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { MapearProdutosView } from '@/src/presentation/components/features/painel-contador/MapearProdutosView'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function ConfigNcmCestPage() {
  const { addTab } = useTabsStore()

  useEffect(() => {
    addTab({
      id: 'config-ncm-cest',
      label: 'Configurar NCM/CEST',
      path: '/portal-contador/config/ncm-cest',
    })
  }, [addTab])

  return (
    <Suspense fallback={<PageLoading />}>
      <MapearProdutosView />
    </Suspense>
  )
}

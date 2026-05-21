'use client'

import { Suspense } from 'react'
import { PainelContadorView } from '@/src/presentation/components/features/painel-contador/PainelContadorView'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

/**
 * Rota /painel-contador: apenas casca.
 * Conteúdo real vive em src/presentation/components/features/painel-contador.
 */
export default function PainelContadorPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PainelContadorView />
    </Suspense>
  )
}

'use client'

import { Suspense } from 'react'
import { PainelContadorView } from '@/src/presentation/components/features/painel-contador/PainelContadorView'

/**
 * Rota /painel-contador: apenas casca.
 * Conteúdo real vive em src/presentation/components/features/painel-contador.
 */
export default function PainelContadorPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<div>Carregando painel...</div>}>
        <PainelContadorView />
      </Suspense>
    </div>
  )
}

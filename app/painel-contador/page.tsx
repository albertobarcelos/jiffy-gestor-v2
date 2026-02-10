'use client'

import { Suspense } from 'react'
import { PainelContadorView } from '@/src/presentation/components/features/painel-contador/PainelContadorView'
import { useRequirePermission } from '@/src/presentation/hooks/useRequirePermission'

/**
 * Rota /painel-contador: apenas casca.
 * Conteúdo real vive em src/presentation/components/features/painel-contador.
 */
export default function PainelContadorPage() {
  // Protege a página exigindo permissão de FINANCEIRO
  useRequirePermission({ permission: 'FINANCEIRO' })

  return (
    <div className="h-full">
      <Suspense fallback={<div>Carregando painel...</div>}>
        <PainelContadorView />
      </Suspense>
    </div>
  )
}

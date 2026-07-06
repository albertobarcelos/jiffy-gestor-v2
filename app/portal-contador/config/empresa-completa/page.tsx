'use client'

import { Suspense } from 'react'
import { ConfiguracaoEmpresaCompleta } from '@/src/presentation/components/features/painel-contador/ConfiguracaoEmpresaCompleta'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

/**
 * Rota /portal-contador/config/empresa-completa
 * Página de configuração completa da empresa (dados do backend + dados fiscais)
 */
export default function ConfiguracaoEmpresaCompletaPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ConfiguracaoEmpresaCompleta />
    </Suspense>
  )
}

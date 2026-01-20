'use client'

import { Suspense } from 'react'
import { ConfiguracaoEmpresaCompleta } from '@/src/presentation/components/features/painel-contador/ConfiguracaoEmpresaCompleta'

/**
 * Rota /painel-contador/config/empresa-completa
 * Página de configuração completa da empresa (dados do backend + dados fiscais)
 */
export default function ConfiguracaoEmpresaCompletaPage() {
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <Suspense fallback={<div className="p-4">Carregando configuração...</div>}>
        <ConfiguracaoEmpresaCompleta />
      </Suspense>
    </div>
  )
}

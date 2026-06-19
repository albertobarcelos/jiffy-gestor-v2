'use client'

import { Suspense } from 'react'
import { Perfil } from '@/src/presentation/components/features/perfil/Perfil'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

/**
 * Página de perfil do usuário
 * Client Component para evitar RSC overhead e melhorar performance
 */
export default function PerfilPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Perfil />
    </Suspense>
  )
}


'use client'

import { Suspense } from 'react'
import { RelatorioPecaTambemPage } from '@/src/presentation/components/features/relatorios-peca-tambem/RelatorioPecaTambemPage'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function RelatoriosPecaTambemRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RelatorioPecaTambemPage />
    </Suspense>
  )
}

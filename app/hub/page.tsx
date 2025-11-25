'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

// Dynamic import para code-splitting
const HubView = dynamic(
  () => import('@/src/presentation/components/features/hub/HubView').then((mod) => ({ default: mod.HubView })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function HubPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <HubView />
    </Suspense>
  )
}


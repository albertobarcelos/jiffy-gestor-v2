import { Suspense } from 'react'
import { ComplementosList } from '@/src/presentation/components/features/complementos/ComplementosList'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function ComplementosPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <ComplementosList />
      </Suspense>
    </div>
  )
}


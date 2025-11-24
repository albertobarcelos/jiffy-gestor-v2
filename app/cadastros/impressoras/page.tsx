import { Suspense } from 'react'
import { ImpressorasList } from '@/src/presentation/components/features/impressoras/ImpressorasList'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function ImpressorasPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <ImpressorasList />
      </Suspense>
    </div>
  )
}


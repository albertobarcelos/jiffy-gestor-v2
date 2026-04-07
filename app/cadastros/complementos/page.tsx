import { Suspense } from 'react'
import { ComplementosList } from '@/src/presentation/components/features/complementos/ComplementosList'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function ComplementosPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense
        fallback={
          <div className="flex min-h-0 flex-1 items-center justify-center py-12">
            <PageLoading />
          </div>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ComplementosList />
        </div>
      </Suspense>
    </div>
  )
}

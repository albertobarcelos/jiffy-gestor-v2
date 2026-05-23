import { Suspense } from 'react'
import { TaxasList } from '@/src/presentation/components/features/taxas/TaxasList'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function TaxasPage() {
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
          <TaxasList />
        </div>
      </Suspense>
    </div>
  )
}

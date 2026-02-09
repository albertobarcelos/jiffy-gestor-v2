import { Suspense } from 'react'
import { PerfisGestorList } from '@/src/presentation/components/features/perfis-gestor/PerfisGestorList'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function PerfisGestorPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <PerfisGestorList />
      </Suspense>
    </div>
  )
}

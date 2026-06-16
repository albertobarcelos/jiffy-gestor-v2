import { Suspense } from 'react'
import { EntregadoresList } from '@/src/presentation/components/features/entregadores/EntregadoresList'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function EntregadoresPage() {
  return (
    <div className="h-full px-2 pt-4">
      <Suspense fallback={<PageLoading />}>
        <EntregadoresList />
      </Suspense>
    </div>
  )
}

import { Suspense } from 'react'
import { ClientesList } from '@/src/presentation/components/features/clientes/ClientesList'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function ClientesPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <ClientesList />
      </Suspense>
    </div>
  )
}


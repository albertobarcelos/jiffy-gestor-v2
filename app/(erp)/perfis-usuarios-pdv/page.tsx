import { Suspense } from 'react'
import { PerfisUsuariosList } from '@/src/presentation/components/features/perfis-usuarios-pdv/PerfisUsuariosList'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function PerfisUsuariosPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <PerfisUsuariosList />
      </Suspense>
    </div>
  )
}


import { Suspense } from 'react'
import { UsuariosGestorList } from '@/src/presentation/components/features/usuarios-gestor/UsuariosGestorList'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function UsuariosGestorPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <UsuariosGestorList />
      </Suspense>
    </div>
  )
}

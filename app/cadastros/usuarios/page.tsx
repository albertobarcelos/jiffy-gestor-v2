import { Suspense } from 'react'
import { UsuariosList } from '@/src/presentation/components/features/usuarios/UsuariosList'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function UsuariosPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <UsuariosList />
      </Suspense>
    </div>
  )
}


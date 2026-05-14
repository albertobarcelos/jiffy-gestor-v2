import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'
import { UsuariosGestorRedirect } from '@/src/presentation/components/features/usuarios-gestor/components/UsuariosGestorRedirect'

/** Sem slug: redireciona para `/meus-apps/usuarios-gestor/<slug>` derivado do nome da empresa. */
export default function UsuariosGestorIndexPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <UsuariosGestorRedirect />
      </Suspense>
    </div>
  )
}

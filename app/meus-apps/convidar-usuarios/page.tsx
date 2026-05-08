import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'
import { ConvidarUsuariosRedirect } from '@/src/presentation/components/features/convites-gestao/components/ConvidarUsuariosRedirect'

/** Sem slug: redireciona para `/meus-apps/convidar-usuarios/<slug>` derivado do nome da empresa. */
export default function ConvidarUsuariosIndexPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <ConvidarUsuariosRedirect />
      </Suspense>
    </div>
  )
}

import { Suspense } from 'react'
import ConvitesGestaoPage from '@/src/presentation/components/features/convites-gestao/ConvitesGestaoPage'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function ConvitesGestorRoutePage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <ConvitesGestaoPage />
      </Suspense>
    </div>
  )
}

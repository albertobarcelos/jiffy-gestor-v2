import { Suspense } from 'react'
import { MeiosPagamentosList } from '@/src/presentation/components/features/meios-pagamentos/MeiosPagamentosList'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function MeiosPagamentosPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <MeiosPagamentosList />
      </Suspense>
    </div>
  )
}


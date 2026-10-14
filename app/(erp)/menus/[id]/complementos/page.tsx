'use client'

import dynamic from 'next/dynamic'
import { Suspense, use } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

const MenuAlterarValorComplementos = dynamic(
  () =>
    import('@/src/presentation/components/features/menus/MenuAlterarValorComplementos').then(mod => ({
      default: mod.MenuAlterarValorComplementos,
    })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function MenuComplementosPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={<PageLoading />}>
        <MenuAlterarValorComplementos menuId={id} />
      </Suspense>
    </div>
  )
}

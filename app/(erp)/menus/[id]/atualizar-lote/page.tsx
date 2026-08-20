'use client'

import dynamic from 'next/dynamic'
import { Suspense, use } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

const MenuProdutosLote = dynamic(
  () =>
    import('@/src/presentation/components/features/menus/MenuProdutosLote').then(mod => ({
      default: mod.MenuProdutosLote,
    })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function MenuAtualizarLotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <Suspense fallback={<PageLoading />}>
      <MenuProdutosLote menuId={id} />
    </Suspense>
  )
}

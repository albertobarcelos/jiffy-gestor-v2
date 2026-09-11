'use client'

import { use } from 'react'
import { MenuCategoriasEditor } from '@/src/presentation/components/features/menus/MenuCategoriasEditor'

export default function MenuCategoriasPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MenuCategoriasEditor menuId={id} />
    </div>
  )
}

'use client'

import { use } from 'react'
import { MenuEditor } from '@/src/presentation/components/features/menus/MenuEditor'

export default function MenuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MenuEditor menuId={id} />
    </div>
  )
}

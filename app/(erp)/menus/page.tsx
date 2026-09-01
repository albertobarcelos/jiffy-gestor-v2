'use client'

import { Suspense } from 'react'
import { MenusList } from '@/src/presentation/components/features/menus/MenusList'

export default function MenusPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={<div className="p-6 text-sm text-slate-500">Carregando menus...</div>}>
        <MenusList />
      </Suspense>
    </div>
  )
}

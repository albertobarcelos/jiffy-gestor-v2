'use client'

import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

/** Suspense para searchParams; TopNav vem do `ErpAppShell`. */
export default function ClientesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <div className="md:px-4 px-0">{children}</div>
    </Suspense>
  )
}

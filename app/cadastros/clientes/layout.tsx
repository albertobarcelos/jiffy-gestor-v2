'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { TopNav } from '@/src/presentation/components/layouts/TopNav'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function ClientesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className='px-6'>
        <Suspense fallback={<PageLoading />}>
          {children}
        </Suspense>
      </main>
    </div>
  )
}

'use client'

import { usePathname } from 'next/navigation'
import { TopNav } from '@/src/presentation/components/layouts/TopNav'

export default function MeiosPagamentosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      
      <main className='px-6 py-4'>
        {children}
      </main>
    </div>
  )
}

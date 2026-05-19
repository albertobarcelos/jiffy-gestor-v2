'use client'

import { usePathname } from 'next/navigation'
import { TopNav } from '@/src/presentation/components/layouts/TopNav'

export default function ImpressorasLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className='md:px-6 px-1'>
        {children}
      </main>
    </div>
  )
}

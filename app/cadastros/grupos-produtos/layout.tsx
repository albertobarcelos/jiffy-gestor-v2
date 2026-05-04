'use client'

import { usePathname } from 'next/navigation'
import { TopNav } from '@/src/presentation/components/layouts/TopNav'

export default function GruposProdutosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="fixed inset-0 z-[40] flex flex-col overflow-hidden overscroll-none bg-gray-50">
     <div className="shrink-0">
       <TopNav />
     </div>
     <main className="flex min-h-0 flex-1 flex-col overflow-hidden md:px-6 px-1">
       {children}
     </main>
   </div>
  )
}

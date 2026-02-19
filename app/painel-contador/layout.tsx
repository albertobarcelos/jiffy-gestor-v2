'use client'

import { TopNav } from '@/src/presentation/components/layouts/TopNav'
import { TabBar } from '@/src/presentation/components/ui/TabBar'

export default function PainelContadorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-gray-50">
      {/* TopNav fixo no topo */}
      <div className="flex-shrink-0 z-10">
        <TopNav />
      </div>
      
      {/* Container abaixo do TopNav com altura fixa e scroll */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-shrink-0 z-10">
          <TabBar />
        </div>
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  )
}


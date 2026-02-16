'use client'

import { TopNav } from '@/src/presentation/components/layouts/TopNav'
import { TabBar } from '@/src/presentation/components/ui/TabBar'

export default function PainelContadorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav />
      <TabBar />
      <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
    </div>
  )
}


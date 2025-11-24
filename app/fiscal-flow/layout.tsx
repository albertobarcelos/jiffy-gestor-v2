'use client'

import { TopNav } from '@/src/presentation/components/layouts/TopNav'

export default function FiscalFlowLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-screen">
      <TopNav />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}


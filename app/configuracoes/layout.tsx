'use client'

import { TopNav } from '@/src/presentation/components/layouts/TopNav'

export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <TopNav />
      <main className="flex-1 overflow-hidden px-6">
        {children}
      </main>
    </div>
  )
}

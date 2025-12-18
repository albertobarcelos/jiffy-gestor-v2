'use client'

import { TopNav } from '@/src/presentation/components/layouts/TopNav'

export default function RelatoriosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className="px-6">
        {children}
      </main>
    </div>
  )
}

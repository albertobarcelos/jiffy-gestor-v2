'use client'

import { TopNav } from '@/src/presentation/components/layouts/TopNav'

export default function VendasLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className="px-6 py-2">
        {children}
      </main>
    </div>
  )
}


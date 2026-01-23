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
      <main className="px-2 md:px-6">
        {children}
      </main>
    </div>
  )
}


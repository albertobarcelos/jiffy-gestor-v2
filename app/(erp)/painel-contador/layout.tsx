'use client'

import { TabBar } from '@/src/presentation/components/ui/TabBar'

/** TabBar local; TopNav vem do `ErpAppShell` em `app/(erp)/layout.tsx`. */
export default function PainelContadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="z-10 shrink-0">
        <TabBar />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}

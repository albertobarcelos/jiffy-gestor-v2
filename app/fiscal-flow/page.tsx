'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Skeleton, Box } from '@mui/material'

// Versão ultra-leve do Kanban (sem DnD) para carregamento instantâneo
const NFeKanbanSimple = dynamic(
  () => import('@/src/presentation/components/features/nfe/NFeKanbanSimple').then((mod) => ({ default: mod.NFeKanbanSimple })),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 2 }} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" width={320} height={600} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
      </Box>
    ),
  }
)

export default function FiscalFlowPage() {
  return (
    <div className="h-full">
      <Suspense
        fallback={
          <Box sx={{ p: 3 }}>
            <Skeleton variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 2 }} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" width={320} height={600} sx={{ borderRadius: 3 }} />
              ))}
            </Box>
          </Box>
        }
      >
        <NFeKanbanSimple />
      </Suspense>
    </div>
  )
}


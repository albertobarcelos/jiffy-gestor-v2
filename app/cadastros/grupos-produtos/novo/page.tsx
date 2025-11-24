'use client'

import dynamic from 'next/dynamic'
import { Box, CircularProgress } from '@mui/material'

const NovoGrupo = dynamic(
  () => import('@/src/presentation/components/features/grupos-produtos/NovoGrupo').then((mod) => ({ default: mod.NovoGrupo })),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    ),
  }
)

export default function NovoGrupoPage() {
  return <NovoGrupo />
}


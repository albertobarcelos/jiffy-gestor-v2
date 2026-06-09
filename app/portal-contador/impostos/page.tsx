'use client'

import { Box } from '@mui/material'
import { ConfiguracaoImpostosView } from '@/src/presentation/components/features/impostos/ConfiguracaoImpostosView'

/**
 * Página de Configuração de Impostos
 * Esta página é renderizada condicionalmente na página principal do painel-contador
 * quando a aba "impostos" está ativa (estilo SPA)
 */
export default function ImpostosPage() {
  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        backgroundColor: '#f6f8fc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        overflow: 'auto',
      }}
    >
      <ConfiguracaoImpostosView />
    </Box>
  )
}


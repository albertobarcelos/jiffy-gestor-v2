'use client'

import type { ReactNode } from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import { Button } from '@/src/presentation/components/ui/button'

/** Azul institucional — Avançar etapa, Emitir nota e ações primárias do card. */
const KANBAN_CARD_ACAO_COLOR = '#003366'

export function KanbanCardAcaoButton(props: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  startIcon?: ReactNode
}) {
  const { children, onClick, disabled, loading, startIcon } = props
  const bloqueado = Boolean(disabled || loading)

  return (
    <Button
      size="sm"
      variant="contained"
      className="flex-1 min-w-0 !bg-[#003366] !text-white hover:!bg-[#003366] hover:!text-white"
      sx={{
        backgroundColor: `${KANBAN_CARD_ACAO_COLOR} !important`,
        py: 0.375,
        px: 1,
        display: 'inline-flex',
        minHeight: 'auto',
        fontFamily: 'var(--font-general-sans), system-ui, sans-serif',
        fontSize: '13px',
        fontWeight: 500,
        textTransform: 'none',
        boxShadow: 'none',
        color: '#ffffff',
        WebkitTextFillColor: '#ffffff',
        '& .MuiButton-startIcon': {
          color: '#ffffff',
        },
        '&:hover': {
          backgroundColor: `${KANBAN_CARD_ACAO_COLOR} !important`,
          filter: bloqueado ? 'none' : 'brightness(0.92)',
          boxShadow: 'none',
          color: '#ffffff',
          WebkitTextFillColor: '#ffffff',
        },
        '&.MuiButton-contained.Mui-disabled': {
          backgroundColor: `${KANBAN_CARD_ACAO_COLOR} !important`,
          opacity: loading ? 0.55 : 0.72,
          color: 'rgba(255,255,255,0.96)',
          WebkitTextFillColor: 'rgba(255,255,255,0.96)',
          cursor: loading ? 'wait' : 'default',
        },
      }}
      startIcon={
        loading ? (
          <CircularProgress size={14} sx={{ color: '#ffffff' }} aria-hidden />
        ) : (
          startIcon
        )
      }
      onClick={onClick}
      disabled={bloqueado}
      aria-busy={loading || undefined}
    >
      {children}
    </Button>
  )
}

'use client'

import type { ReactNode } from 'react'
import { Button } from '@/src/presentation/components/ui/button'

/** Azul institucional — Avançar etapa, Emitir nota e ações primárias do card. */
const KANBAN_CARD_ACAO_COLOR = '#003366'

export function KanbanCardAcaoButton(props: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  startIcon?: ReactNode
}) {
  const { children, onClick, disabled, startIcon } = props

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
          filter: 'brightness(0.92)',
          boxShadow: 'none',
          color: '#ffffff',
          WebkitTextFillColor: '#ffffff',
        },
        '&.MuiButton-contained.Mui-disabled': {
          backgroundColor: `${KANBAN_CARD_ACAO_COLOR} !important`,
          opacity: 0.72,
          color: 'rgba(255,255,255,0.96)',
          WebkitTextFillColor: 'rgba(255,255,255,0.96)',
        },
      }}
      startIcon={startIcon}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}

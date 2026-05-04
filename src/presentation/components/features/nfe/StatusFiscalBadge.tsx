'use client'

import { Badge } from '@/src/presentation/components/ui/badge'
import { MdSchedule, MdCheckCircle, MdError, MdWarning, MdCancel } from 'react-icons/md'
import { CircularProgress } from '@mui/material'

type StatusFiscal =
  | 'PENDENTE'
  | 'PENDENTE_EMISSAO'
  | 'EMITINDO'
  | 'PENDENTE_AUTORIZACAO'
  | 'CONTINGENCIA'
  | 'EMITIDA'
  | 'REJEITADA'
  | 'CANCELADA'

interface StatusFiscalBadgeProps {
  status: StatusFiscal | string | null | undefined
  className?: string
  /** Sem fundo colorido; ícone e texto em preto (ex.: cards do Kanban) */
  tone?: 'default' | 'neutral'
}

/**
 * Componente Badge para exibir status fiscal com cores e ícones
 */
export function StatusFiscalBadge({ status, className, tone = 'default' }: StatusFiscalBadgeProps) {
  if (status == null || status === '') return null

  const statusUpper = String(status).trim().toUpperCase() as StatusFiscal

  const getStatusConfig = (status: StatusFiscal) => {
    switch (status) {
      case 'PENDENTE':
        return {
          label: 'Aguardando SEFAZ...',
          color: '#3B82F6', // Azul
          bgColor: '#DBEAFE',
          icon: <CircularProgress size={12} sx={{ color: '#3B82F6' }} />,
        }
      case 'PENDENTE_EMISSAO':
        return {
          label: 'Pendente Emissão',
          color: '#F59E0B', // Amarelo
          bgColor: '#FEF3C7',
          icon: <MdSchedule className="h-3.5 w-3.5" />,
        }
      case 'EMITINDO':
        return {
          label: 'Emitindo...',
          color: '#3B82F6', // Azul
          bgColor: '#DBEAFE',
          icon: <CircularProgress size={12} sx={{ color: '#3B82F6' }} />,
        }
      case 'PENDENTE_AUTORIZACAO':
        return {
          label: 'Aguardando SEFAZ...',
          color: '#3B82F6', // Azul
          bgColor: '#DBEAFE',
          icon: <CircularProgress size={12} sx={{ color: '#3B82F6' }} />,
        }
      case 'CONTINGENCIA':
        return {
          label: 'Em contingência',
          color: '#F97316', // Laranja
          bgColor: '#FFEDD5',
          icon: <MdWarning className="h-3.5 w-3.5" />,
        }
      case 'EMITIDA':
        return {
          label: 'Emitida',
          color: '#10B981', // Verde
          bgColor: '#D1FAE5',
          icon: <MdCheckCircle className="h-3.5 w-3.5" />,
        }
      case 'REJEITADA':
        return {
          label: 'Rejeitada',
          color: '#EF4444', // Vermelho
          bgColor: '#FEE2E2',
          icon: <MdError className="h-3.5 w-3.5" />,
        }
      case 'CANCELADA':
        return {
          label: 'Cancelada',
          color: '#EF4444',
          bgColor: '#FEE2E2',
          icon: <MdCancel className="h-3.5 w-3.5" />,
        }
      default:
        return {
          label: status,
          color: '#6B7280',
          bgColor: '#F3F4F6',
          icon: null,
        }
    }
  }

  const config = getStatusConfig(statusUpper)
  const isNeutral = tone === 'neutral'

  return (
    <Badge
      className={className}
      sx={{
        fontWeight: 600,
        fontSize: '0.75rem',
        ...(isNeutral
          ? {
              backgroundColor: 'transparent',
              color: '#111827',
              border: 'none',
              boxShadow: 'none',
              paddingLeft: 0,
              paddingRight: 0,
              '& .MuiChip-icon': {
                color: '#111827',
                marginLeft: 0,
                marginRight: '4px',
              },
              '& .MuiChip-label': { color: '#111827', paddingLeft: 0 },
              '& .MuiCircularProgress-root': { color: '#111827' },
            }
          : {
              backgroundColor: config.bgColor,
              color: config.color,
              '& .MuiChip-icon': {
                color: config.color,
                marginLeft: '4px',
              },
            }),
      }}
      {...(config.icon && { icon: config.icon })}
      label={config.label}
    />
  )
}

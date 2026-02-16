'use client'

import { Badge } from '@/src/presentation/components/ui/badge'
import { MdSchedule, MdCheckCircle, MdError, MdCancel, MdWarning } from 'react-icons/md'
import { CircularProgress } from '@mui/material'

type StatusFiscal = 
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
}

/**
 * Componente Badge para exibir status fiscal com cores e ícones
 */
export function StatusFiscalBadge({ status, className }: StatusFiscalBadgeProps) {
  if (!status) return null

  const statusUpper = status.toUpperCase() as StatusFiscal

  const getStatusConfig = (status: StatusFiscal) => {
    switch (status) {
      case 'PENDENTE_EMISSAO':
        return {
          label: 'Pendente Emissão',
          color: '#F59E0B', // Amarelo
          bgColor: '#FEF3C7',
          icon: <MdSchedule className="w-3.5 h-3.5" />,
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
          icon: <MdWarning className="w-3.5 h-3.5" />,
        }
      case 'EMITIDA':
        return {
          label: 'Emitida',
          color: '#10B981', // Verde
          bgColor: '#D1FAE5',
          icon: <MdCheckCircle className="w-3.5 h-3.5" />,
        }
      case 'REJEITADA':
        return {
          label: 'Rejeitada',
          color: '#EF4444', // Vermelho
          bgColor: '#FEE2E2',
          icon: <MdError className="w-3.5 h-3.5" />,
        }
      case 'CANCELADA':
        return {
          label: 'Cancelada',
          color: '#6B7280', // Cinza
          bgColor: '#F3F4F6',
          icon: <MdCancel className="w-3.5 h-3.5" />,
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

  return (
    <Badge
      className={className}
      sx={{
        backgroundColor: config.bgColor,
        color: config.color,
        fontWeight: 600,
        fontSize: '0.75rem',
        '& .MuiChip-icon': {
          color: config.color,
          marginLeft: '4px',
        },
      }}
      {...(config.icon && { icon: config.icon })}
      label={config.label}
    />
  )
}

'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { NFe, NFeStatus } from '@/src/domain/entities/NFe'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material'
import { DragIndicator, Receipt as ReceiptIcon } from '@mui/icons-material'

interface NFeKanbanCardProps {
  nfe: NFe
  onVerDetalhes: (nfe: NFe) => void
  getStatusBadge: (status: NFeStatus) => React.ReactNode
}

/**
 * Card arrastável para o Kanban de NFes
 * Design moderno usando Material UI
 */
export function NFeKanbanCard({ nfe, onVerDetalhes, getStatusBadge }: NFeKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: nfe.getId(),
    data: {
      type: 'nfe',
      nfe,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        cursor: 'pointer',
        mb: 2,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)',
          borderColor: 'primary.main',
        },
        ...(isDragging && {
          boxShadow: 8,
          borderColor: 'primary.main',
          borderWidth: 2,
        }),
      }}
      onClick={() => onVerDetalhes(nfe)}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Header do Card */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <Tooltip title="Arrastar para mover">
                <IconButton
                  {...attributes}
                  {...listeners}
                  size="small"
                  sx={{
                    p: 0.5,
                    cursor: 'grab',
                    '&:active': { cursor: 'grabbing' },
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                  }}
                >
                  <DragIndicator sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    fontFamily: 'Exo, sans-serif',
                    color: 'text.primary',
                  }}
                >
                  NFe #{nfe.getNumero()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Série {nfe.getSerie()}
                </Typography>
              </Box>
            </Box>
            <Box>{getStatusBadge(nfe.getStatus())}</Box>
          </Box>

          {/* Informações do Cliente */}
          <Box>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: 'text.primary',
                mb: 0.5,
              }}
            >
              {nfe.getClienteNome()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {nfe.getClienteCpfCnpj()}
            </Typography>
          </Box>

          <Divider />

          {/* Valor e Data */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Valor Total
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: 'primary.main',
                  fontFamily: 'Exo, sans-serif',
                }}
              >
                {transformarParaReal(nfe.getValorTotal())}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {nfe.getDataEmissao().toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {nfe.getDataEmissao().toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
            </Box>
          </Box>

          {/* Informações adicionais */}
          {nfe.getItens().length > 0 && (
            <>
              <Divider />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {nfe.getItens().length} {nfe.getItens().length === 1 ? 'item' : 'itens'}
                </Typography>
              </Box>
            </>
          )}

          {/* Motivo de Rejeição */}
          {nfe.getStatus() === 'REJEITADA' && nfe.getMotivoRejeicao() && (
            <>
              <Divider />
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'error.light',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'error.main',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 500,
                    color: 'error.dark',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {nfe.getMotivoRejeicao()}
                </Typography>
              </Box>
            </>
          )}

          {/* Chave de Acesso */}
          {nfe.getStatus() === 'AUTORIZADA' && nfe.getChaveAcesso() && (
            <>
              <Divider />
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'success.light',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'success.main',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 500,
                    color: 'success.dark',
                    fontFamily: 'monospace',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  Chave: {nfe.getChaveAcesso()}
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { NFe, NFeStatus } from '@/src/domain/entities/NFe'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import {
  Paper,
  Typography,
  Box,
  Chip,
  Fade,
} from '@mui/material'
import { Receipt as ReceiptIcon } from '@mui/icons-material'
import { NFeKanbanCard } from './NFeKanbanCard'

interface DroppableColumnProps {
  id: NFeStatus
  titulo: string
  bgColor: string
  borderColor: string
  textColor: string
  icone: React.ReactNode
  nfes: NFe[]
  onVerDetalhes: (nfe: NFe) => void
  getStatusBadge: (status: NFeStatus) => React.ReactNode
}

/**
 * Coluna droppable do Kanban
 * Design moderno e profissional
 */
export function DroppableColumn({
  id,
  titulo,
  bgColor,
  borderColor,
  textColor,
  icone,
  nfes,
  onVerDetalhes,
  getStatusBadge,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  const total = nfes.reduce((sum, nfe) => sum + nfe.getValorTotal(), 0)
  const nfeIds = nfes.map((nfe) => nfe.getId())

  return (
    <Paper
      ref={setNodeRef}
      elevation={isOver ? 8 : 2}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: 320,
        minWidth: 320,
        maxhtht: 'calc(100vh - 200px)',
        borderRadius: 3,
        border: 2,
        borderColor: isOver ? 'primary.main' : 'divider',
        transition: 'all 0.3s ease-in-out',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        ...(isOver && {
          transform: 'scale(1.02)',
          boxShadow: 8,
        }),
      }}
    >
      {/* Header da Coluna compacto - 20px de altura */}
      <Box
        sx={{
          height: 35,
          px: 1,
          bgcolor: bgColor,
          borderBottom: 2,
          borderColor: borderColor,
          position: 'sticky',
          top: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              color: textColor,
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              '& svg': {
                fontSize: 12,
              },
            }}
          >
            {icone}
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: textColor,
              fontFamily: 'Exo, sans-serif',
              fontSize: '0.7rem',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {titulo}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {total > 0 && (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: textColor,
                fontSize: '0.65rem',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {transformarParaReal(total)}
            </Typography>
          )}
          <Chip
            label={nfes.length}
            size="small"
            sx={{
              height: 14,
              minWidth: 20,
              bgcolor: 'white',
              color: textColor,
              fontWeight: 600,
              border: 1,
              borderColor: borderColor,
              fontSize: '0.6rem',
              lineHeight: 1,
              '& .MuiChip-label': {
                px: 0.5,
                py: 0,
                lineHeight: 1,
              },
            }}
          />
        </Box>
      </Box>

      {/* Cards da Coluna */}
      <SortableContext id={id} items={nfeIds} strategy={verticalListSortingStrategy}>
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 2,
            minHeight: 200,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              bgcolor: 'grey.100',
              borderRadius: 1,
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'grey.400',
              borderRadius: 1,
              '&:hover': {
                bgcolor: 'grey.500',
              },
            },
          }}
        >
          {nfes.length === 0 ? (
            <Fade in={true}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 8,
                  color: 'text.secondary',
                }}
              >
                <ReceiptIcon
                  sx={{
                    fontSize: 64,
                    opacity: 0.3,
                    mb: 2,
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  Nenhuma NFe
                </Typography>
              </Box>
            </Fade>
          ) : (
            nfes.map((nfe) => (
              <NFeKanbanCard
                key={nfe.getId()}
                nfe={nfe}
                onVerDetalhes={onVerDetalhes}
                getStatusBadge={getStatusBadge}
              />
            ))
          )}
        </Box>
      </SortableContext>
    </Paper>
  )
}

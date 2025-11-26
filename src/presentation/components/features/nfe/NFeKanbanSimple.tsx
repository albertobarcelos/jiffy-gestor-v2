'use client'

import { NFe } from '@/src/domain/entities/NFe'
import { useNfes } from '@/src/presentation/hooks/useNfes'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { showToast } from '@/src/shared/utils/toast'
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Container,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
} from '@mui/material'
import {
  Receipt as ReceiptIcon,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  Cancel,
  Refresh,
  Add,
  Visibility,
} from '@mui/icons-material'

/**
 * Componente simplificado do Kanban de NFes (sem drag and drop)
 * Design moderno e profissional usando Material UI
 */
export function NFeKanbanSimple() {
  // Hook React Query para buscar NFes (com cache)
  const { data: nfes, isLoading, refetch } = useNfes()

  // Configuração das colunas do Kanban
  const colunas = [
    {
      id: 'PENDENTE',
      titulo: 'Pendente',
      bgColor: '#FEF3C7',
      borderColor: '#F59E0B',
      textColor: '#92400E',
      icone: <Schedule sx={{ fontSize: 20 }} />,
    },
    {
      id: 'EM_PROCESSAMENTO',
      titulo: 'Em Processamento',
      bgColor: '#DBEAFE',
      borderColor: '#3B82F6',
      textColor: '#1E40AF',
      icone: <Refresh sx={{ fontSize: 20 }} />,
    },
    {
      id: 'AUTORIZADA',
      titulo: 'Autorizada',
      bgColor: '#D1FAE5',
      borderColor: '#10B981',
      textColor: '#065F46',
      icone: <CheckCircle sx={{ fontSize: 20 }} />,
    },
    {
      id: 'REJEITADA',
      titulo: 'Rejeitada',
      bgColor: '#FEE2E2',
      borderColor: '#EF4444',
      textColor: '#991B1B',
      icone: <ErrorIcon sx={{ fontSize: 20 }} />,
    },
    {
      id: 'CANCELADA',
      titulo: 'Cancelada',
      bgColor: '#F3F4F6',
      borderColor: '#9CA3AF',
      textColor: '#374151',
      icone: <Cancel sx={{ fontSize: 20 }} />,
    },
  ]

  const handleEmitirNFe = () => {
    showToast.info('Funcionalidade de emissão será implementada em breve')
  }

  const handleVerDetalhes = (nfe: NFe) => {
    showToast.info(`Visualizando NFe #${nfe.getNumero()}`)
  }

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          p: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        }}
      >
        <Container maxWidth={false} sx={{ px: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <ReceiptIcon sx={{ fontSize: 28 }} />
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    fontFamily: 'Exo, sans-serif',
                    color: 'text.primary',
                  }}
                >
                  Pedidos e Clientes
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  ml: 7,
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                Emissão e gerenciamento de Notas Fiscais Eletrônicas
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Tooltip title="Atualizar lista">
                <IconButton
                  onClick={() => refetch()}
                  disabled={isLoading}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Refresh sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleEmitirNFe}
                sx={{
                  px: 3,
                  py: 1.5,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 2,
                  boxShadow: 2,
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
              >
                Nova NFe
              </Button>
            </Box>
          </Box>
        </Container>
      </Paper>

      {/* Kanban Board */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 3,
          bgcolor: 'background.default',
        }}
      >
        <Container maxWidth={false} sx={{ px: 0 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 3,
              minWidth: 'max-content',
            }}
          >
            {colunas.map((coluna) => (
              <Paper
                key={coluna.id}
                elevation={0}
                sx={{
                  minWidth: 280,
                  bgcolor: coluna.bgColor,
                  border: 2,
                  borderColor: coluna.borderColor,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                {/* Header da coluna */}
                <Box
                  sx={{
                    p: 2,
                    borderBottom: 2,
                    borderColor: coluna.borderColor,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  {coluna.icone}
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: coluna.textColor,
                      fontSize: '1rem',
                    }}
                  >
                    {coluna.titulo}
                  </Typography>
                  <Chip
                    label={nfes?.[coluna.id as keyof typeof nfes]?.length || 0}
                    size="small"
                    sx={{
                      ml: 'auto',
                      bgcolor: coluna.borderColor,
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                </Box>

                {/* Lista de NFes */}
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {nfes?.[coluna.id as keyof typeof nfes]?.map((nfe: NFe) => (
                    <Card
                      key={nfe.getId()}
                      elevation={2}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 4,
                        },
                      }}
                    >
                      <CardContent sx={{ pb: 1 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'start',
                            mb: 1.5,
                          }}
                        >
                          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                            NFe #{nfe.getNumero()}
                          </Typography>
                          <Chip
                            label={`Série ${nfe.getSerie()}`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>

                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {nfe.getClienteNome()}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mb: 1.5 }}
                        >
                          {nfe.getClienteCpfCnpj()}
                        </Typography>

                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            pt: 1.5,
                            borderTop: 1,
                            borderColor: 'divider',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Total
                          </Typography>
                          <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700 }}>
                            {transformarParaReal(nfe.getValorTotal())}
                          </Typography>
                        </Box>
                      </CardContent>

                      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => handleVerDetalhes(nfe)}
                          sx={{ textTransform: 'none' }}
                        >
                          Ver Detalhes
                        </Button>
                      </CardActions>
                    </Card>
                  ))}

                  {(!nfes?.[coluna.id as keyof typeof nfes] ||
                    nfes[coluna.id as keyof typeof nfes].length === 0) && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textAlign: 'center', py: 4 }}
                    >
                      Nenhuma NFe nesta coluna
                    </Typography>
                  )}
                </Box>
              </Paper>
            ))}
          </Box>
        </Container>
      </Box>
    </Box>
  )
}

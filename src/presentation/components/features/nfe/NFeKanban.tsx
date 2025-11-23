'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { NFe, NFeStatus } from '@/src/domain/entities/NFe'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { showToast, handleApiError } from '@/src/shared/utils/toast'
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Fade,
  Container,
} from '@mui/material'
import {
  Receipt as ReceiptIcon,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  Cancel,
  Refresh,
  Add,
  Send,
  Download,
  Close,
} from '@mui/icons-material'
import { DroppableColumn } from './DroppableColumn'
import { NFeKanbanCard } from './NFeKanbanCard'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'

/**
 * Componente Kanban para gerenciamento de NFes
 * Design moderno e profissional usando Material UI
 */
export function NFeKanban() {
  const { auth } = useAuthStore()
  const [nfes, setNfes] = useState<Record<NFeStatus, NFe[]>>({
    PENDENTE: [],
    EM_PROCESSAMENTO: [],
    AUTORIZADA: [],
    REJEITADA: [],
    CANCELADA: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [nfeSelecionada, setNfeSelecionada] = useState<NFe | null>(null)
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Configuração das colunas do Kanban com cores Material UI
  const colunas: Array<{
    id: NFeStatus
    titulo: string
    cor: string
    bgColor: string
    borderColor: string
    textColor: string
    icone: React.ReactNode
  }> = [
    {
      id: 'PENDENTE',
      titulo: 'Pendente',
      cor: 'warning',
      bgColor: '#FEF3C7',
      borderColor: '#F59E0B',
      textColor: '#92400E',
      icone: <Schedule sx={{ fontSize: 20 }} />,
    },
    {
      id: 'EM_PROCESSAMENTO',
      titulo: 'Em Processamento',
      cor: 'info',
      bgColor: '#DBEAFE',
      borderColor: '#3B82F6',
      textColor: '#1E40AF',
      icone: <Refresh sx={{ fontSize: 20, animation: 'spin 2s linear infinite' }} />,
    },
    {
      id: 'AUTORIZADA',
      titulo: 'Autorizada',
      cor: 'success',
      bgColor: '#D1FAE5',
      borderColor: '#10B981',
      textColor: '#065F46',
      icone: <CheckCircle sx={{ fontSize: 20 }} />,
    },
    {
      id: 'REJEITADA',
      titulo: 'Rejeitada',
      cor: 'error',
      bgColor: '#FEE2E2',
      borderColor: '#EF4444',
      textColor: '#991B1B',
      icone: <ErrorIcon sx={{ fontSize: 20 }} />,
    },
    {
      id: 'CANCELADA',
      titulo: 'Cancelada',
      cor: 'default',
      bgColor: '#F3F4F6',
      borderColor: '#9CA3AF',
      textColor: '#374151',
      icone: <Cancel sx={{ fontSize: 20 }} />,
    },
  ]

  // Buscar NFes
  const buscarNfes = async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoading(true)

    try {
      // TODO: Implementar chamada à API quando disponível
      const mockNfes: NFe[] = [
        NFe.fromJSON({
          id: '1',
          numero: '000001',
          serie: '1',
          clienteId: '1',
          clienteNome: 'Cliente Exemplo 1',
          clienteCpfCnpj: '123.456.789-00',
          dataEmissao: new Date().toISOString(),
          status: 'PENDENTE',
          valorTotal: 1500.00,
          itens: [
            {
              produtoId: '1',
              produtoNome: 'Produto A',
              quantidade: 2,
              valorUnitario: 750.00,
              valorTotal: 1500.00,
            },
          ],
        }),
        NFe.fromJSON({
          id: '2',
          numero: '000002',
          serie: '1',
          clienteId: '2',
          clienteNome: 'Cliente Exemplo 2',
          clienteCpfCnpj: '987.654.321-00',
          dataEmissao: new Date().toISOString(),
          status: 'EM_PROCESSAMENTO',
          valorTotal: 2300.50,
          itens: [
            {
              produtoId: '2',
              produtoNome: 'Produto B',
              quantidade: 5,
              valorUnitario: 460.10,
              valorTotal: 2300.50,
            },
          ],
        }),
        NFe.fromJSON({
          id: '3',
          numero: '000003',
          serie: '1',
          clienteId: '3',
          clienteNome: 'Cliente Exemplo 3',
          clienteCpfCnpj: '111.222.333-44',
          dataEmissao: new Date().toISOString(),
          status: 'AUTORIZADA',
          valorTotal: 890.00,
          chaveAcesso: '35210712345678901234567890123456789012345678',
          protocolo: '123456789012345',
          dataAutorizacao: new Date().toISOString(),
          itens: [
            {
              produtoId: '3',
              produtoNome: 'Produto C',
              quantidade: 1,
              valorUnitario: 890.00,
              valorTotal: 890.00,
            },
          ],
        }),
      ]

      // Agrupar por status
      const nfesAgrupadas: Record<NFeStatus, NFe[]> = {
        PENDENTE: [],
        EM_PROCESSAMENTO: [],
        AUTORIZADA: [],
        REJEITADA: [],
        CANCELADA: [],
      }

      mockNfes.forEach((nfe) => {
        nfesAgrupadas[nfe.getStatus()].push(nfe)
      })

      setNfes(nfesAgrupadas)
    } catch (error) {
      console.error('Erro ao buscar NFes:', error)
      const errorMessage = handleApiError(error)
      showToast.error(errorMessage || 'Erro ao carregar NFes')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    buscarNfes()
  }, [auth])

  const handleEmitirNFe = () => {
    showToast.info('Funcionalidade de emissão será implementada em breve')
  }

  const handleVerDetalhes = (nfe: NFe) => {
    setNfeSelecionada(nfe)
    setMostrarDetalhes(true)
  }

  const getStatusBadge = (status: NFeStatus) => {
    const coluna = colunas.find((c) => c.id === status)
    if (!coluna) return null

    return (
      <Chip
        icon={coluna.icone as React.ReactElement}
        label={coluna.titulo}
        size="small"
        color={coluna.cor as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
        sx={{
          fontWeight: 600,
          fontSize: '0.75rem',
        }}
      />
    )
  }

  // Handlers de drag and drop
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    const colunaDestino = colunas.find((c) => c.id === (overId as NFeStatus))
    if (colunaDestino) {
      let nfeArrastada: NFe | null = null
      let statusOrigem: NFeStatus | null = null

      for (const [status, nfesList] of Object.entries(nfes)) {
        const nfe = nfesList.find((n) => n.getId() === activeId)
        if (nfe) {
          nfeArrastada = nfe
          statusOrigem = status as NFeStatus
          break
        }
      }

      if (nfeArrastada && statusOrigem && statusOrigem !== colunaDestino.id) {
        const novasNfes = { ...nfes }
        novasNfes[statusOrigem] = novasNfes[statusOrigem].filter((n) => n.getId() !== activeId)
        novasNfes[colunaDestino.id].push(nfeArrastada)

        setNfes(novasNfes)
        showToast.success(`NFe movida para ${colunaDestino.titulo}`)
      }
    }

    setActiveId(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Lógica adicional se necessário
  }

  const activeNfe = activeId
    ? Object.values(nfes)
        .flat()
        .find((nfe) => nfe.getId() === activeId)
    : null

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
      {/* Header melhorado */}
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
                  Fiscal Flow
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
                  onClick={buscarNfes}
                  disabled={isLoading}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Refresh
                    sx={{
                      fontSize: 20,
                      animation: isLoading ? 'spin 1s linear infinite' : 'none',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' },
                      },
                    }}
                  />
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

      {/* Kanban Board melhorado */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 3,
          bgcolor: 'background.default',
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <Container maxWidth={false} sx={{ px: 0 }}>
            <Box
              sx={{
                display: 'flex',
                gap: 3,
                minWidth: 'max-content',
                height: '100%',
              }}
            >
              {colunas.map((coluna) => (
                <DroppableColumn
                  key={coluna.id}
                  id={coluna.id}
                  titulo={coluna.titulo}
                  bgColor={coluna.bgColor}
                  borderColor={coluna.borderColor}
                  textColor={coluna.textColor}
                  icone={coluna.icone}
                  nfes={nfes[coluna.id]}
                  onVerDetalhes={handleVerDetalhes}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </Box>
          </Container>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeNfe ? (
              <Box sx={{ width: 320 }}>
                <NFeKanbanCard
                  nfe={activeNfe}
                  onVerDetalhes={() => {}}
                  getStatusBadge={getStatusBadge}
                />
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>
      </Box>

      {/* Modal de Detalhes melhorado */}
      <Dialog open={mostrarDetalhes} onOpenChange={setMostrarDetalhes}>
        <DialogContent sx={{ maxWidth: 800, maxHeight: '80vh' }}>
          <DialogHeader>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <ReceiptIcon color="primary" />
              <DialogTitle>
                Detalhes da NFe #{nfeSelecionada?.getNumero()}
              </DialogTitle>
            </Box>
            <DialogDescription>
              Informações completas da Nota Fiscal Eletrônica
            </DialogDescription>
          </DialogHeader>

          {nfeSelecionada && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Informações Gerais */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Informações Gerais
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Número
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {nfeSelecionada.getNumero()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Série
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {nfeSelecionada.getSerie()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Data de Emissão
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {nfeSelecionada.getDataEmissao().toLocaleString('pt-BR')}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>{getStatusBadge(nfeSelecionada.getStatus())}</Box>
                  </Box>
                  {nfeSelecionada.getProtocolo() && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Protocolo
                      </Typography>
                      <Typography variant="body1" fontWeight={500} fontFamily="monospace">
                        {nfeSelecionada.getProtocolo()}
                      </Typography>
                    </Box>
                  )}
                  {nfeSelecionada.getDataAutorizacao() && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Data de Autorização
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {nfeSelecionada.getDataAutorizacao()?.toLocaleString('pt-BR')}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>

              {/* Cliente */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Cliente
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Nome
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {nfeSelecionada.getClienteNome()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      CPF/CNPJ
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {nfeSelecionada.getClienteCpfCnpj()}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Itens */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Itens ({nfeSelecionada.getItens().length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                  {nfeSelecionada.getItens().map((item, index) => (
                    <Paper
                      key={index}
                      elevation={0}
                      sx={{
                        p: 2,
                        bgcolor: 'white',
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          {item.produtoNome}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Qtd: {item.quantidade} x {transformarParaReal(item.valorUnitario)}
                        </Typography>
                      </Box>
                      <Typography variant="body1" fontWeight={600} color="primary.main">
                        {transformarParaReal(item.valorTotal)}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pt: 2,
                    borderTop: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="h6" fontWeight={600}>
                    Total
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="primary.main">
                    {transformarParaReal(nfeSelecionada.getValorTotal())}
                  </Typography>
                </Box>
              </Paper>

              {/* Chave de Acesso */}
              {nfeSelecionada.getChaveAcesso() && (
                <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Chave de Acesso
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: 'white',
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontFamily="monospace"
                      sx={{ wordBreak: 'break-all', fontSize: '0.75rem' }}
                    >
                      {nfeSelecionada.getChaveAcesso()}
                    </Typography>
                  </Paper>
                </Paper>
              )}

              {/* Motivo de Rejeição */}
              {nfeSelecionada.getMotivoRejeicao() && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: 'error.light',
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'error.main',
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: 'error.dark' }}>
                    Motivo da Rejeição
                  </Typography>
                  <Typography variant="body2" color="error.dark">
                    {nfeSelecionada.getMotivoRejeicao()}
                  </Typography>
                </Paper>
              )}

              {/* Observações */}
              {nfeSelecionada.getObservacoes() && (
                <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Observações
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {nfeSelecionada.getObservacoes()}
                  </Typography>
                </Paper>
              )}
            </Box>
          )}

          <DialogFooter>
            <Button variant="outlined" startIcon={<Close />} onClick={() => setMostrarDetalhes(false)}>
              Fechar
            </Button>
            {nfeSelecionada?.getStatus() === 'PENDENTE' && (
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={() => showToast.info('Funcionalidade de emissão será implementada')}
              >
                Emitir NFe
              </Button>
            )}
            {nfeSelecionada?.getStatus() === 'AUTORIZADA' && (
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => showToast.info('Funcionalidade de download será implementada')}
              >
                Download XML
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Box>
  )
}

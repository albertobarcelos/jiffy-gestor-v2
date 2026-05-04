'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader } from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

interface ConfiguracaoImpostoNcmHistorico {
  id: string
  configuracaoId: string
  ncm: {
    codigo: string
    descricao?: string
  }
  empresaId: string
  usuarioId?: string
  acao: 'CRIADO' | 'ATUALIZADO' | 'REMOVIDO'
  dataAlteracao: string
  cfop?: string
  csosn?: string
  icms?: {
    origem?: number
    cst?: string
    aliquota?: number
    baseCalculoModo?: number
  }
  ipi?: {
    cst?: string
    aliquota?: number
    codigoEnquadramento?: string
    unidade?: string
    quantidadeUnidade?: number
  }
  pis?: {
    cst?: string
    aliquota?: number
    baseCalculoModo?: number
    quantidadeUnidade?: number
    aliquotaReais?: number
  }
  cofins?: {
    cst?: string
    aliquota?: number
    baseCalculoModo?: number
    quantidadeUnidade?: number
    aliquotaReais?: number
  }
  observacoes?: string
}

interface HistoricoConfiguracaoNcmModalProps {
  open: boolean
  onClose: () => void
  codigoNcm: string
}

export function HistoricoConfiguracaoNcmModal({
  open,
  onClose,
  codigoNcm,
}: HistoricoConfiguracaoNcmModalProps) {
  const { auth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [historico, setHistorico] = useState<ConfiguracaoImpostoNcmHistorico[]>([])
  /** Mobile: detalhes do card expandidos por id do registro */
  const [mobileExpandidoPorId, setMobileExpandidoPorId] = useState<Record<string, boolean>>({})

  // Ref para armazenar o AbortController e cancelar requisições pendentes
  const abortControllerRef = useRef<AbortController | null>(null)

  // Memoizar loadHistorico para evitar recriações desnecessárias
  const loadHistorico = useCallback(async () => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Criar novo AbortController para esta requisição
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/v1/fiscal/configuracoes/ncms/${codigoNcm}/impostos/historico`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: abortController.signal, // Adicionar signal para permitir cancelamento
      })

      // Verificar se foi cancelado
      if (abortController.signal.aborted) {
        return
      }

      // Se for 404, trata como "sem histórico" (caso válido para NCM novo)
      if (response.status === 404) {
        if (!abortController.signal.aborted) {
          setHistorico([])
        }
        return
      }

      if (!response.ok) {
        throw new Error('Erro ao carregar histórico')
      }

      const data = await response.json()
      
      // Verificar novamente se foi cancelado antes de atualizar estado
      if (!abortController.signal.aborted) {
        setHistorico(data || [])
      }
    } catch (error: any) {
      // Ignorar erros de cancelamento (AbortError)
      if (error.name === 'AbortError' || abortController.signal.aborted) {
        return
      }
      console.error('Erro ao carregar histórico:', error)
      showToast.error(error.message || 'Erro ao carregar histórico')
    } finally {
      // Só atualizar loading se não foi cancelado
      if (!abortController.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [auth, codigoNcm])

  useEffect(() => {
    if (open && codigoNcm) {
      loadHistorico()
    } else {
      // Limpar estado quando o modal fechar
      setHistorico([])
      setIsLoading(false)
      setMobileExpandidoPorId({})
    }

    // Cleanup: cancelar requisições pendentes quando o componente desmontar ou o modal fechar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [open, codigoNcm, loadHistorico])

  const formatarData = (data: string) => {
    try {
      return new Date(data).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return data
    }
  }

  const getAcaoColor = (acao: string) => {
    switch (acao) {
      case 'CRIADO':
        return 'bg-green-100 text-green-700'
      case 'ATUALIZADO':
        return 'bg-blue-100 text-blue-700'
      case 'REMOVIDO':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const formatarAliquota = (aliquota?: number): string => {
    if (aliquota === undefined || aliquota === null) return '--'
    return `${aliquota.toFixed(2)}%`
  }

  const toggleMobileDetalhes = (id: string) => {
    setMobileExpandidoPorId(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => !open && onClose()}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: '#ffffff',
          width: { xs: '95vw', sm: 'auto' },
          maxWidth: { xs: '95vw !important', sm: undefined },
          height: { xs: '95vh', sm: 'auto' },
          maxHeight: { xs: '95vh', sm: undefined },
          margin: { xs: 'auto', sm: undefined },
          display: { xs: 'flex', sm: 'block' },
          flexDirection: { xs: 'column', sm: 'initial' },
        },
      }}
    >
      <DialogContent
        sx={{
          flex: { xs: 1, sm: 'none' },
          minHeight: { xs: 0, sm: 'auto' },
          maxHeight: { xs: '100%', sm: '90vh' },
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
          <h1 className="text-alternate font-exo font-semibold text-sm sm:text-xl">Histórico de Alterações - NCM {codigoNcm}</h1>
          <Button 
            onClick={onClose} 
            variant="outlined"
            sx={{
              backgroundColor: 'rgba(131, 56, 236, 0.1)',
              color: 'var(--color-alternate)',
              borderColor: 'var(--color-alternate)',
              '&:hover': { 
                backgroundColor: 'rgba(131, 56, 236, 0.2)' 
              },
            }}
          >
            Fechar
          </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <JiffyLoading />
          </div>
        ) : historico.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-secondary-text/70 text-center">
              <p className="font-medium mb-2">Este NCM ainda não possui histórico de configurações.</p>
              <p className="text-sm">Após realizar a primeira configuração, o histórico de alterações será exibido aqui.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {historico.map((item) => {
              const mobileExpandido = Boolean(mobileExpandidoPorId[item.id])

              return (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 bg-white"
              >
                {/* Mobile: só status + data + Exibir/Ocultar */}
                <div className="flex items-start justify-between gap-2 md:mb-3">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`shrink-0 px-2 py-1 text-xs font-semibold rounded ${getAcaoColor(item.acao)}`}>
                      {item.acao}
                    </span>
                    <span className="text-sm text-secondary-text">
                      {formatarData(item.dataAlteracao)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.usuarioId && (
                      <span className="hidden text-xs text-secondary-text/70 md:inline">
                        Usuário: {item.usuarioId}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleMobileDetalhes(item.id)}
                      className="rounded border border-alternate/40 px-2.5 py-1 text-xs font-medium text-alternate hover:bg-alternate/10 md:hidden"
                    >
                      {mobileExpandido ? 'Ocultar' : 'Exibir'}
                    </button>
                  </div>
                </div>

                {/* Mobile: observações e impostos só expandidos; uma coluna */}
                <div
                  className={`md:hidden ${mobileExpandido ? 'mt-3 space-y-3 border-t border-gray-100 pt-3' : 'hidden'}`}
                >
                  {item.usuarioId && (
                    <p className="text-xs text-secondary-text/70">
                      <span className="font-semibold text-secondary-text">Usuário:</span>{' '}
                      {item.usuarioId}
                    </p>
                  )}
                  {item.observacoes && (
                    <div className="rounded bg-gray-50 p-2 text-sm text-secondary-text">
                      {item.observacoes}
                    </div>
                  )}
                  <div className="space-y-2 text-sm">
                    <div className="break-words">
                      <span className="font-semibold text-secondary-text">CFOP:</span>{' '}
                      <span className="text-secondary-text/70">{item.cfop || '--'}</span>
                    </div>
                    <div className="break-words">
                      <span className="font-semibold text-secondary-text">CSOSN:</span>{' '}
                      <span className="text-secondary-text/70">{item.csosn || '--'}</span>
                    </div>
                    {item.icms && (
                      <>
                        <div className="break-words">
                          <span className="font-semibold text-secondary-text">ICMS CST:</span>{' '}
                          <span className="text-secondary-text/70">{item.icms.cst || '--'}</span>
                        </div>
                        <div className="break-words">
                          <span className="font-semibold text-secondary-text">ICMS Alíquota:</span>{' '}
                          <span className="text-secondary-text/70">{formatarAliquota(item.icms.aliquota)}</span>
                        </div>
                      </>
                    )}
                    {item.pis && (
                      <div className="break-words">
                        <span className="font-semibold text-secondary-text">PIS CST:</span>{' '}
                        <span className="text-secondary-text/70">{item.pis.cst || '--'}</span>
                      </div>
                    )}
                    {item.cofins && (
                      <div className="break-words">
                        <span className="font-semibold text-secondary-text">COFINS CST:</span>{' '}
                        <span className="text-secondary-text/70">{item.cofins.cst || '--'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop: layout original em grade */}
                <div className="hidden md:block">
                  {item.observacoes && (
                    <div className="mb-3 rounded bg-gray-50 p-2 text-sm text-secondary-text">
                      {item.observacoes}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
                    <div>
                      <span className="font-semibold text-secondary-text">CFOP:</span>{' '}
                      <span className="text-secondary-text/70">{item.cfop || '--'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-secondary-text">CSOSN:</span>{' '}
                      <span className="text-secondary-text/70">{item.csosn || '--'}</span>
                    </div>
                    {item.icms && (
                      <>
                        <div>
                          <span className="font-semibold text-secondary-text">ICMS CST:</span>{' '}
                          <span className="text-secondary-text/70">{item.icms.cst || '--'}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-secondary-text">ICMS Alíquota:</span>{' '}
                          <span className="text-secondary-text/70">{formatarAliquota(item.icms.aliquota)}</span>
                        </div>
                      </>
                    )}
                    {item.pis && (
                      <div>
                        <span className="font-semibold text-secondary-text">PIS CST:</span>{' '}
                        <span className="text-secondary-text/70">{item.pis.cst || '--'}</span>
                      </div>
                    )}
                    {item.cofins && (
                      <div>
                        <span className="font-semibold text-secondary-text">COFINS CST:</span>{' '}
                        <span className="text-secondary-text/70">{item.cofins.cst || '--'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

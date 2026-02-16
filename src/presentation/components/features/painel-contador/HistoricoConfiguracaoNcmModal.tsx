'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { extractTokenInfo } from '@/src/shared/utils/validateToken'

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

  useEffect(() => {
    if (open && codigoNcm) {
      loadHistorico()
    }
  }, [open, codigoNcm])

  const loadHistorico = async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/v1/fiscal/configuracoes/ncms/${codigoNcm}/impostos/historico`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar histórico')
      }

      const data = await response.json()
      setHistorico(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error)
      showToast.error(error.message || 'Erro ao carregar histórico')
    } finally {
      setIsLoading(false)
    }
  }

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

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => !open && onClose()}
      maxWidth="md"
      fullWidth
    >
      <DialogContent sx={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <DialogHeader>
          <DialogTitle>Histórico de Alterações - NCM {codigoNcm}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-secondary-text">Carregando histórico...</div>
          </div>
        ) : historico.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-secondary-text/70">Nenhum histórico encontrado</div>
          </div>
        ) : (
          <div className="space-y-4">
            {historico.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 bg-white"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getAcaoColor(item.acao)}`}>
                      {item.acao}
                    </span>
                    <span className="text-sm text-secondary-text">
                      {formatarData(item.dataAlteracao)}
                    </span>
                  </div>
                  {item.usuarioId && (
                    <span className="text-xs text-secondary-text/70">
                      Usuário: {item.usuarioId}
                    </span>
                  )}
                </div>

                {item.observacoes && (
                  <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-secondary-text">
                    {item.observacoes}
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
            ))}
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} variant="outlined">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

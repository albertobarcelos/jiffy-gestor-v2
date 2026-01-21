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
import { Input } from '@/src/presentation/components/ui/input'
import { Label } from '@/src/presentation/components/ui/label'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { extractTokenInfo } from '@/src/shared/utils/validateToken'

interface ConfiguracaoImpostoNcm {
  ncm?: {
    codigo: string
    descricao?: string
  }
  cfop?: string
  csosn?: string
  icms?: {
    origem?: number
    cst?: string
    aliquota?: number
  }
  pis?: {
    cst?: string
    aliquota?: number
  }
  cofins?: {
    cst?: string
    aliquota?: number
  }
}

interface CopiarConfiguracaoNcmModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  codigoNcmOrigem: string
  todasConfiguracoes: ConfiguracaoImpostoNcm[]
}

export function CopiarConfiguracaoNcmModal({
  open,
  onClose,
  onSuccess,
  codigoNcmOrigem,
  todasConfiguracoes,
}: CopiarConfiguracaoNcmModalProps) {
  const { auth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [ncmsDestino, setNcmsDestino] = useState<string>('')
  const [observacao, setObservacao] = useState<string>('')

  useEffect(() => {
    if (open) {
      setNcmsDestino('')
      setObservacao('')
    }
  }, [open])

  const handleCopiar = async () => {
    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token de autenticação não encontrado')
      return
    }

    // Validar e processar NCMs destino
    const ncmsList = ncmsDestino
      .split(/[,\n]/)
      .map(ncm => ncm.trim())
      .filter(ncm => ncm.length === 8 && /^\d{8}$/.test(ncm))

    if (ncmsList.length === 0) {
      showToast.error('Informe pelo menos um NCM válido (8 dígitos)')
      return
    }

    // Remover NCM origem da lista
    const ncmsFiltrados = ncmsList.filter(ncm => ncm !== codigoNcmOrigem)

    if (ncmsFiltrados.length === 0) {
      showToast.error('Não é possível copiar para o mesmo NCM')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/v1/fiscal/configuracoes/ncms/${codigoNcmOrigem}/impostos/copiar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ncmsDestino: ncmsFiltrados,
          observacao: observacao || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao copiar configuração')
      }

      const configsCriadas = await response.json()
      showToast.success(`Configuração copiada para ${configsCriadas.length} NCM(s) com sucesso!`)
      onSuccess()
    } catch (error: any) {
      console.error('Erro ao copiar configuração:', error)
      showToast.error(error.message || 'Erro ao copiar configuração')
    } finally {
      setIsLoading(false)
    }
  }

  // Obter NCMs disponíveis (excluindo o origem)
  const ncmsDisponiveis = todasConfiguracoes
    .map(config => config.ncm?.codigo)
    .filter((codigo): codigo is string => !!codigo && codigo !== codigoNcmOrigem)

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => !open && onClose()}
      maxWidth="sm"
      fullWidth
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copiar Configuração de Impostos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm font-semibold text-secondary-text">
              NCM Origem: <span className="font-mono">{codigoNcmOrigem}</span>
            </Label>
          </div>

          <div>
            <Label htmlFor="ncms-destino" className="text-sm font-semibold text-secondary-text mb-2 block">
              NCMs Destino (separados por vírgula ou quebra de linha)
            </Label>
            <Input
              id="ncms-destino"
              value={ncmsDestino}
              onChange={(e) => setNcmsDestino(e.target.value)}
              placeholder="12345678, 87654321, 11223344"
              className="font-mono"
            />
            <p className="text-xs text-secondary-text/70 mt-1">
              Informe os códigos NCM (8 dígitos) para os quais a configuração será copiada
            </p>
          </div>

          {ncmsDisponiveis.length > 0 && (
            <div>
              <Label className="text-sm font-semibold text-secondary-text mb-2 block">
                NCMs Disponíveis (clique para adicionar)
              </Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded">
                {ncmsDisponiveis.map((ncm) => (
                  <button
                    key={ncm}
                    type="button"
                    onClick={() => {
                      const atual = ncmsDestino.split(/[,\n]/).map(n => n.trim()).filter(Boolean)
                      if (!atual.includes(ncm)) {
                        setNcmsDestino([...atual, ncm].join(', '))
                      }
                    }}
                    className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors font-mono"
                  >
                    {ncm}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="observacao" className="text-sm font-semibold text-secondary-text mb-2 block">
              Observação (opcional)
            </Label>
            <Input
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Configuração copiada do NCM 12345678"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outlined" disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleCopiar} disabled={isLoading}>
            {isLoading ? 'Copiando...' : 'Copiar Configuração'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/presentation/components/ui/select'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'

interface ProdutoFiscal {
  id: string
  produtoId: string
  ncm?: string
  cest?: string
  origemMercadoria?: number
  tipoProduto?: string
  indicadorProducaoEscala?: string
}

interface ConfigurarNcmModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  produtoFiscal?: ProdutoFiscal | null
}

export function ConfigurarNcmModal({
  open,
  onClose,
  onSuccess,
  produtoFiscal,
}: ConfigurarNcmModalProps) {
  const { auth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    produtoId: '',
    ncm: '',
    cest: '',
    origemMercadoria: '0',
    tipoProduto: '00',
    indicadorProducaoEscala: '0',
  })

  useEffect(() => {
    if (produtoFiscal) {
      setFormData({
        produtoId: produtoFiscal.produtoId,
        ncm: produtoFiscal.ncm || '',
        cest: produtoFiscal.cest || '',
        origemMercadoria: String(produtoFiscal.origemMercadoria ?? 0),
        tipoProduto: produtoFiscal.tipoProduto || '00',
        indicadorProducaoEscala: produtoFiscal.indicadorProducaoEscala || '0',
      })
    } else {
      setFormData({
        produtoId: '',
        ncm: '',
        cest: '',
        origemMercadoria: '0',
        tipoProduto: '00',
        indicadorProducaoEscala: '0',
      })
    }
  }, [produtoFiscal, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.produtoId.trim()) {
      showToast.error('ID do produto é obrigatório')
      return
    }

    if (!formData.ncm || formData.ncm.length !== 8) {
      showToast.error('NCM deve conter exatamente 8 dígitos')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      return
    }

    setIsLoading(true)
    const toastId = showToast.loading('Salvando configuração...')

    try {
      const payload = {
        produtoId: formData.produtoId.trim(),
        ncm: formData.ncm,
        cest: formData.cest || undefined,
        origemMercadoria: parseInt(formData.origemMercadoria),
        tipoProduto: formData.tipoProduto,
        indicadorProducaoEscala: formData.indicadorProducaoEscala,
      }

      const response = await fetch('/api/produtos-fiscais', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao salvar configuração')
      }

      showToast.successLoading(toastId, 'Configuração salva com sucesso!')
      onSuccess()
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error)
      showToast.errorLoading(toastId, error.message || 'Erro ao salvar configuração')
    } finally {
      setIsLoading(false)
    }
  }

  const origemOptions = [
    { value: '0', label: 'Nacional' },
    { value: '1', label: 'Estrangeira - Importação direta' },
    { value: '2', label: 'Estrangeira - Adquirida no mercado interno' },
    { value: '3', label: 'Nacional - Mercadoria com >40% de conteúdo estrangeiro' },
    { value: '4', label: 'Nacional - Produzida em conformidade com processos produtivos' },
    { value: '5', label: 'Nacional - Mercadoria com <40% de conteúdo estrangeiro' },
    { value: '6', label: 'Estrangeira - Importação direta sem similar nacional' },
    { value: '7', label: 'Estrangeira - Adquirida no mercado interno sem similar nacional' },
    { value: '8', label: 'Nacional - Mercadoria com >70% de conteúdo estrangeiro' },
  ]

  const tipoProdutoOptions = [
    { value: '00', label: 'Mercadoria para Revenda' },
    { value: '01', label: 'Matéria Prima' },
    { value: '02', label: 'Embalagem' },
    { value: '03', label: 'Produto em Processo' },
    { value: '04', label: 'Produto Acabado' },
    { value: '05', label: 'Subproduto' },
    { value: '06', label: 'Produto Intermediário' },
    { value: '07', label: 'Material de Uso e Consumo' },
    { value: '08', label: 'Ativo Imobilizado' },
    { value: '09', label: 'Serviços' },
    { value: '10', label: 'Outros Insumos' },
    { value: '99', label: 'Outros' },
    { value: 'KT', label: 'Kit' },
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {produtoFiscal ? 'Editar Configuração Fiscal' : 'Nova Configuração Fiscal'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="produtoId">ID do Produto *</Label>
            <Input
              id="produtoId"
              value={formData.produtoId}
              onChange={(e) => setFormData({ ...formData, produtoId: e.target.value })}
              placeholder="Ex: produto-123"
              required
              disabled={!!produtoFiscal}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ncm">NCM *</Label>
              <Input
                id="ncm"
                value={formData.ncm}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 8)
                  setFormData({ ...formData, ncm: value })
                }}
                placeholder="12345678"
                maxLength={8}
                required
              />
              <p className="text-xs text-secondary-text/70">8 dígitos</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cest">CEST</Label>
              <Input
                id="cest"
                value={formData.cest}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 7)
                  setFormData({ ...formData, cest: value })
                }}
                placeholder="1234567"
                maxLength={7}
              />
              <p className="text-xs text-secondary-text/70">Até 7 dígitos</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origemMercadoria">Origem da Mercadoria</Label>
              <Select
                value={formData.origemMercadoria}
                onValueChange={(value) =>
                  setFormData({ ...formData, origemMercadoria: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {origemOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoProduto">Tipo do Produto</Label>
              <Select
                value={formData.tipoProduto}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipoProduto: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tipoProdutoOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="indicadorProducaoEscala">
              Indicador de Produção em Escala Relevante
            </Label>
            <Select
              value={formData.indicadorProducaoEscala}
              onValueChange={(value) =>
                setFormData({ ...formData, indicadorProducaoEscala: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Não</SelectItem>
                <SelectItem value="1">Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outlined"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

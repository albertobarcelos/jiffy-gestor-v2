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

interface ConfiguracaoReformaTributaria {
  id?: string
  ncm?: {
    codigo: string
    descricao?: string
  }
  cst?: string
  codigoClassificacaoFiscal?: string
}

interface ConfigurarReformaTributariaModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  configuracao?: ConfiguracaoReformaTributaria | null
}

export function ConfigurarReformaTributariaModal({
  open,
  onClose,
  onSuccess,
  configuracao,
}: ConfigurarReformaTributariaModalProps) {
  const { auth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    ncm: '',
    cst: '',
    codigoClassificacaoFiscal: '',
  })

  useEffect(() => {
    if (configuracao) {
      setFormData({
        ncm: configuracao.ncm?.codigo || '',
        cst: configuracao.cst || '',
        codigoClassificacaoFiscal: configuracao.codigoClassificacaoFiscal || '',
      })
    } else {
      setFormData({
        ncm: '',
        cst: '',
        codigoClassificacaoFiscal: '',
      })
    }
  }, [configuracao, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
        cst: formData.cst || undefined,
        codigoClassificacaoFiscal: formData.codigoClassificacaoFiscal || undefined,
      }

      const response = await fetch(`/api/v1/fiscal/configuracoes/ncms/${formData.ncm}/reforma-tributaria`, {
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

  const cstOptions = [
    { value: '00', label: '00 - Tributada integralmente' },
    { value: '10', label: '10 - Tributada e com cobrança do ICMS por substituição tributária' },
    { value: '20', label: '20 - Com redução de base de cálculo' },
    { value: '30', label: '30 - Isenta ou não tributada e com cobrança do ICMS por substituição tributária' },
    { value: '40', label: '40 - Isenta' },
    { value: '41', label: '41 - Não tributada' },
    { value: '50', label: '50 - Suspensa' },
    { value: '51', label: '51 - Diferimento' },
    { value: '60', label: '60 - ICMS cobrado anteriormente por substituição tributária' },
    { value: '70', label: '70 - Com redução de base de cálculo e cobrança do ICMS por substituição tributária' },
    { value: '90', label: '90 - Outras' },
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {configuracao ? 'Editar Configuração de Reforma Tributária' : 'Nova Configuração de Reforma Tributária'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={!!configuracao}
            />
            <p className="text-xs text-secondary-text/70">8 dígitos</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cst">CST (Código da Situação Tributária)</Label>
              <Select
                value={formData.cst}
                onValueChange={(value) =>
                  setFormData({ ...formData, cst: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o CST" />
                </SelectTrigger>
                <SelectContent>
                  {cstOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigoClassificacaoFiscal">Código Classificação Fiscal</Label>
              <Input
                id="codigoClassificacaoFiscal"
                value={formData.codigoClassificacaoFiscal}
                onChange={(e) =>
                  setFormData({ ...formData, codigoClassificacaoFiscal: e.target.value })
                }
                placeholder="123456"
              />
            </div>
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

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

interface ConfigurarNcmModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  configuracaoImposto?: ConfiguracaoImpostoNcm | null
}

export function ConfigurarNcmModal({
  open,
  onClose,
  onSuccess,
  configuracaoImposto,
}: ConfigurarNcmModalProps) {
  const { auth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [regimeTributario, setRegimeTributario] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    ncm: '',
    cfop: '',
    csosn: '',
    icmsCst: '',
    icmsAliquota: '',
    pisCst: '',
    pisAliquota: '',
    cofinsCst: '',
    cofinsAliquota: '',
  })

  // Buscar regime tributário da empresa
  useEffect(() => {
    const loadRegimeTributario = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      try {
        const tokenInfo = extractTokenInfo(token)
        const empresaId = tokenInfo?.empresaId
        if (!empresaId) return

        const response = await fetch(`/api/v1/fiscal/empresas-fiscais/${empresaId}/todas`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const configs = await response.json()
          if (configs && configs.length > 0) {
            const codigoRegime = configs[0].codigoRegimeTributario
            setRegimeTributario(codigoRegime || 1)
          } else {
            setRegimeTributario(1) // Default: Simples Nacional
          }
        }
      } catch (error) {
        console.error('Erro ao buscar regime tributário:', error)
        setRegimeTributario(1) // Default: Simples Nacional
      }
    }

    if (open) {
      loadRegimeTributario()
    }
  }, [open, auth])

  // Determinar se é Simples Nacional (1 ou 2) ou Regime Normal (3)
  const isSimplesNacional = regimeTributario === 1 || regimeTributario === 2

  useEffect(() => {
    if (configuracaoImposto) {
      setFormData({
        ncm: configuracaoImposto.ncm?.codigo || '',
        cfop: configuracaoImposto.cfop || '',
        csosn: configuracaoImposto.csosn || '',
        icmsCst: configuracaoImposto.icms?.cst || '',
        icmsAliquota: configuracaoImposto.icms?.aliquota?.toString() || '',
        pisCst: configuracaoImposto.pis?.cst || '',
        pisAliquota: configuracaoImposto.pis?.aliquota?.toString() || '',
        cofinsCst: configuracaoImposto.cofins?.cst || '',
        cofinsAliquota: configuracaoImposto.cofins?.aliquota?.toString() || '',
      })
    } else {
      setFormData({
        ncm: '',
        cfop: '',
        csosn: '',
        icmsCst: '',
        icmsAliquota: '',
        pisCst: '',
        pisAliquota: '',
        cofinsCst: '',
        cofinsAliquota: '',
      })
    }
  }, [configuracaoImposto, open])

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
      // ✅ Arquitetura correta: Frontend → jiffy-backend → App-Services → FiscalGateway → FiscalService
      const payload = {
        cfop: formData.cfop || undefined,
        csosn: formData.csosn || undefined,
        icms: {
          origem: 0, // TODO: Buscar origem do produto ou permitir configurar
          cst: formData.icmsCst || undefined,
          aliquota: formData.icmsAliquota ? parseFloat(formData.icmsAliquota) : undefined,
        },
        pis: {
          cst: formData.pisCst || undefined,
          aliquota: formData.pisAliquota ? parseFloat(formData.pisAliquota) : undefined,
        },
        cofins: {
          cst: formData.cofinsCst || undefined,
          aliquota: formData.cofinsAliquota ? parseFloat(formData.cofinsAliquota) : undefined,
        },
      }

      const response = await fetch(`/api/v1/fiscal/configuracoes/ncms/${formData.ncm}/impostos`, {
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

  // Opções CSOSN (Simples Nacional)
  const csosnOptions = [
    { value: '102', label: '102 - Tributada pelo Simples Nacional sem permissão de crédito' },
    { value: '103', label: '103 - Isenção do ICMS no Simples Nacional para faixa de receita bruta' },
    { value: '300', label: '300 - Imune' },
    { value: '400', label: '400 - Não tributada pelo Simples Nacional' },
    { value: '500', label: '500 - ICMS cobrado anteriormente por substituição tributária (substituído) ou por antecipação' },
    { value: '900', label: '900 - Outros' },
    { value: 'M61', label: 'M61 - ICMS cobrado anteriormente por substituição tributária (substituidor)' },
  ]

  // Opções CST (Presumido/Real)
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

  // Opções CST PIS/COFINS
  const pisCofinsCstOptions = [
    { value: '01', label: '01 - Operação Tributável com Alíquota Básica' },
    { value: '02', label: '02 - Operação Tributável com Alíquota Diferenciada' },
    { value: '03', label: '03 - Operação Tributável com Alíquota por Unidade de Medida de Produto' },
    { value: '04', label: '04 - Operação Tributável Monofásica - Revenda a Alíquota Zero' },
    { value: '05', label: '05 - Operação Tributável por Substituição Tributária' },
    { value: '06', label: '06 - Operação Tributável a Alíquota Zero' },
    { value: '07', label: '07 - Operação Isenta da Contribuição' },
    { value: '08', label: '08 - Operação sem Incidência da Contribuição' },
    { value: '09', label: '09 - Operação com Suspensão da Incidência da Contribuição' },
    { value: '49', label: '49 - Outras Operações de Saída' },
    { value: '50', label: '50 - Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Tributada no Mercado Interno' },
    { value: '51', label: '51 - Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Não Tributada no Mercado Interno' },
    { value: '52', label: '52 - Operação com Direito a Crédito - Vinculada Exclusivamente a Receita de Exportação' },
    { value: '53', label: '53 - Operação com Direito a Crédito - Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno' },
    { value: '54', label: '54 - Operação com Direito a Crédito - Vinculada a Receitas Tributadas no Mercado Interno e de Exportação' },
    { value: '55', label: '55 - Operação com Direito a Crédito - Vinculada a Receitas Não-Tributadas no Mercado Interno e de Exportação' },
    { value: '56', label: '56 - Operação com Direito a Crédito - Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno e de Exportação' },
    { value: '60', label: '60 - Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita Tributada no Mercado Interno' },
    { value: '61', label: '61 - Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita Não-Tributada no Mercado Interno' },
    { value: '62', label: '62 - Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita de Exportação' },
    { value: '63', label: '63 - Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno' },
    { value: '64', label: '64 - Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas no Mercado Interno e de Exportação' },
    { value: '65', label: '65 - Crédito Presumido - Operação de Aquisição Vinculada a Receitas Não-Tributadas no Mercado Interno e de Exportação' },
    { value: '66', label: '66 - Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno e de Exportação' },
    { value: '67', label: '67 - Crédito Presumido - Outras Operações' },
    { value: '70', label: '70 - Operação de Aquisição sem Direito a Crédito' },
    { value: '71', label: '71 - Operação de Aquisição com Isenção' },
    { value: '72', label: '72 - Operação de Aquisição com Suspensão' },
    { value: '73', label: '73 - Operação de Aquisição a Alíquota Zero' },
    { value: '74', label: '74 - Operação de Aquisição sem Incidência da Contribuição' },
    { value: '75', label: '75 - Operação de Aquisição por Substituição Tributária' },
    { value: '98', label: '98 - Outras Operações de Entrada' },
    { value: '99', label: '99 - Outras Operações' },
  ]

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
            {configuracaoImposto ? 'Editar Configuração de Impostos por NCM' : 'Nova Configuração de Impostos por NCM'}
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
              disabled={!!configuracaoImposto}
            />
            <p className="text-xs text-secondary-text/70">8 dígitos</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cfop">CFOP</Label>
              <Input
                id="cfop"
                value={formData.cfop}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setFormData({ ...formData, cfop: value })
                }}
                placeholder="5102"
                maxLength={4}
              />
              <p className="text-xs text-secondary-text/70">4 dígitos</p>
            </div>

            {/* Lógica Condicional: Mostrar CSOSN se Simples Nacional, ou CST se Regime Normal */}
            {isSimplesNacional ? (
              <div className="space-y-2">
                <Label htmlFor="csosn">CSOSN (Simples Nacional) *</Label>
                <Select
                  value={formData.csosn}
                  onValueChange={(value) =>
                    setFormData({ ...formData, csosn: value, icmsCst: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o CSOSN" />
                  </SelectTrigger>
                  <SelectContent>
                    {csosnOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-secondary-text/70">
                  Regime: Simples Nacional - Use CSOSN
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="icmsCst">CST ICMS (Presumido/Real) *</Label>
                <Select
                  value={formData.icmsCst}
                  onValueChange={(value) =>
                    setFormData({ ...formData, icmsCst: value, csosn: '' })
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
                <p className="text-xs text-secondary-text/70">
                  Regime: Presumido/Real - Use CST
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icmsAliquota">Alíquota ICMS (%)</Label>
              <Input
                id="icmsAliquota"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.icmsAliquota}
                onChange={(e) =>
                  setFormData({ ...formData, icmsAliquota: e.target.value })
                }
                placeholder="18.00"
              />
            </div>
            <div className="space-y-2">
              {/* Espaço reservado para manter layout */}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pisCst">CST PIS</Label>
              <Select
                value={formData.pisCst}
                onValueChange={(value) =>
                  setFormData({ ...formData, pisCst: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o CST PIS" />
                </SelectTrigger>
                <SelectContent>
                  {pisCofinsCstOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pisAliquota">Alíquota PIS (%)</Label>
              <Input
                id="pisAliquota"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.pisAliquota}
                onChange={(e) =>
                  setFormData({ ...formData, pisAliquota: e.target.value })
                }
                placeholder="1.65"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cofinsCst">CST COFINS</Label>
              <Select
                value={formData.cofinsCst}
                onValueChange={(value) =>
                  setFormData({ ...formData, cofinsCst: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o CST COFINS" />
                </SelectTrigger>
                <SelectContent>
                  {pisCofinsCstOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cofinsAliquota">Alíquota COFINS (%)</Label>
              <Input
                id="cofinsAliquota"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.cofinsAliquota}
                onChange={(e) =>
                  setFormData({ ...formData, cofinsAliquota: e.target.value })
                }
                placeholder="7.60"
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

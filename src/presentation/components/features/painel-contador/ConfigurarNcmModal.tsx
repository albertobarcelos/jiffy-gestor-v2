'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
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
import { showToast } from '@/src/shared/utils/toast'
import { useResumoEmpresaPainel } from '@/src/presentation/hooks/painel-contador/useResumoEmpresaPainel'
import { useConfiguracoesNcm } from '@/src/presentation/hooks/painel-contador/useConfiguracoesNcm'
import { CampoCbenef } from './CampoCbenef'
import type { ConfiguracaoImpostoNcm } from './configuracaoImpostoNcm'
import {
  CSOSN_OPTIONS,
  CST_ICMS_OPTIONS,
  CST_PIS_COFINS_OPTIONS,
} from './ncmImpostosOpcoes'
import {
  NCM_IMPOSTOS_FORM_VAZIO,
  ncmImpostosFormFromConfig,
  ncmImpostosFormToPayload,
} from './ncmImpostosForm'
import {
  isCstIcmsBeneficio,
  isCstIcmsNaoSuportado,
  MENSAGEM_CST_NAO_SUPORTADO,
  normalizarCstIcms,
} from '@/src/domain/entities/painel-contador/cbenefRegras'

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
  const { data: resumo, isLoading: isLoadingRegime } = useResumoEmpresaPainel()
  const { salvarMutation } = useConfiguracoesNcm()
  const regimeTributario = resumo?.codigoRegimeTributario ?? null
  const ufEmpresa = resumo?.uf ?? ''
  const isLoading = salvarMutation.isPending
  const [buscaCbenefAberta, setBuscaCbenefAberta] = useState(false)
  const [formData, setFormData] = useState(NCM_IMPOSTOS_FORM_VAZIO)

  const isSimplesNacional = regimeTributario === 1 || regimeTributario === 2
  const cstIcms = normalizarCstIcms(formData.icmsCst)
  const exibirCbenef = !isLoadingRegime && !isSimplesNacional && isCstIcmsBeneficio(cstIcms)
  const exibirReducaoBase = !isSimplesNacional && cstIcms === '20'

  useEffect(() => {
    if (!open) return
    setFormData(ncmImpostosFormFromConfig(configuracaoImposto))
    setBuscaCbenefAberta(false)
    // Só reidrata ao abrir o modal — senão a digitação no cBenef é revertida.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot de abertura
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.ncm || formData.ncm.length !== 8) {
      showToast.error('NCM deve conter exatamente 8 dígitos')
      return
    }

    if (!isSimplesNacional && isCstIcmsNaoSuportado(cstIcms)) {
      showToast.error(MENSAGEM_CST_NAO_SUPORTADO)
      return
    }

    if (exibirReducaoBase) {
      const reducao = formData.icmsReducaoBase ? parseFloat(formData.icmsReducaoBase) : NaN
      if (!Number.isFinite(reducao) || reducao < 0 || reducao > 100) {
        showToast.error('Informe o % de redução da base de cálculo (0 a 100) para CST 20.')
        return
      }
    }

    try {
      const payload = ncmImpostosFormToPayload(formData, isSimplesNacional)
      await salvarMutation.mutateAsync({ ncm: formData.ncm, input: payload })
      onSuccess()
    } catch (error: unknown) {
      console.error('Erro ao salvar configuração:', error)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
      maxWidth="md"
      fullWidth
      disableEnforceFocus={buscaCbenefAberta}
      sx={{
        '& .MuiDialog-container': {
          zIndex: 1300,
        },
        '& .MuiBackdrop-root': {
          zIndex: 1300,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
        '& .MuiDialog-paper': {
          zIndex: 1300,
          backgroundColor: '#ffffff',
          opacity: 1,
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
          maxWidth: { xs: '100%', sm: '56rem' },
          width: { xs: '100%', sm: 'auto' },
          maxHeight: { xs: '100%', sm: '90vh' },
          minHeight: { xs: 0, sm: 'auto' },
          flex: { xs: 1, sm: 'none' },
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '24px 24px 16px 24px', flexShrink: 0 }}>
          <h1 className="text-alternate font-semibold text-lg sm:text-xl">
            {configuracaoImposto
              ? 'Editar Configuração de Impostos por NCM'
              : 'Nova Configuração de Impostos por NCM'}
          </h1>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0,
          }}
          className="scrollbar-thin md:px-24 px-2"
        >
          <form
            id="configurar-ncm-form"
            onSubmit={handleSubmit}
            className="space-y-4"
            style={{ paddingTop: '8px', paddingBottom: '24px' }}
          >
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
                inputProps={{ maxLength: 8 }}
                required
                disabled={!!configuracaoImposto}
                size="small"
              />
              <p className="text-xs text-secondary-text/70">8 dígitos</p>
              {configuracaoImposto?.ncm?.descricao?.trim() ? (
                <p className="text-sm text-secondary-text">{configuracaoImposto.ncm.descricao.trim()}</p>
              ) : null}
            </div>

            <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
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
                  inputProps={{ maxLength: 4 }}
                  size="small"
                />
                <p className="text-xs text-secondary-text/70">4 dígitos</p>
              </div>

              {isLoadingRegime ? (
                <div className="space-y-2">
                  <Label>Carregando regime tributário...</Label>
                  <div className="h-10 flex items-center text-sm text-secondary-text/70">
                    Aguarde...
                  </div>
                </div>
              ) : isSimplesNacional ? (
                <div className="space-y-2">
                  <Label htmlFor="csosn">CSOSN (Simples Nacional) *</Label>
                  <Select
                    value={formData.csosn}
                    onValueChange={(value) =>
                      setFormData({ ...formData, csosn: value, icmsCst: '' })
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione o CSOSN" />
                    </SelectTrigger>
                    <SelectContent>
                      {CSOSN_OPTIONS.map((option) => (
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
                    onValueChange={(value) => {
                      const usaCbenef = isCstIcmsBeneficio(value)
                      setFormData({
                        ...formData,
                        icmsCst: value,
                        csosn: '',
                        icmsReducaoBase: value === '20' ? formData.icmsReducaoBase : '',
                        codigoBeneficioFiscal: usaCbenef ? formData.codigoBeneficioFiscal : '',
                      })
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione o CST" />
                    </SelectTrigger>
                    <SelectContent>
                      {CST_ICMS_OPTIONS.map((option) => {
                        const naoSuportado = isCstIcmsNaoSuportado(option.value)
                        return (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={naoSuportado}
                          >
                            {naoSuportado ? `${option.label} (não suportado)` : option.label}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-secondary-text/70">
                    Regime: Presumido/Real - Use CST
                  </p>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icmsAliquota">Alíquota ICMS (%)</Label>
                <Input
                  id="icmsAliquota"
                  type="number"
                  inputProps={{ step: 0.01, min: 0, max: 100 }}
                  value={formData.icmsAliquota}
                  onChange={(e) =>
                    setFormData({ ...formData, icmsAliquota: e.target.value })
                  }
                  placeholder="18.00"
                  size="small"
                />
              </div>
              {exibirCbenef ? (
                <CampoCbenef
                  value={formData.codigoBeneficioFiscal}
                  onChange={(codigo) =>
                    setFormData((prev) => ({ ...prev, codigoBeneficioFiscal: codigo }))
                  }
                  uf={ufEmpresa}
                  cst={formData.icmsCst}
                  onBuscaAbertaChange={setBuscaCbenefAberta}
                />
              ) : (
                <div className="space-y-2" />
              )}
            </div>

            {exibirReducaoBase ? (
              <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icmsReducaoBase">% Redução da Base de Cálculo *</Label>
                  <Input
                    id="icmsReducaoBase"
                    type="number"
                    inputProps={{ step: 0.01, min: 0, max: 100 }}
                    value={formData.icmsReducaoBase}
                    onChange={(e) =>
                      setFormData({ ...formData, icmsReducaoBase: e.target.value })
                    }
                    placeholder="33.33"
                    size="small"
                    required
                  />
                  <p className="text-xs text-secondary-text/70">
                    Base efetiva = valor do produto × (1 − {formData.icmsReducaoBase || '0'}%)
                  </p>
                </div>
              </div>
            ) : null}

            <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pisCst">CST PIS</Label>
                <Select
                  value={formData.pisCst}
                  onValueChange={(value) => setFormData({ ...formData, pisCst: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione o CST PIS" />
                  </SelectTrigger>
                  <SelectContent>
                    {CST_PIS_COFINS_OPTIONS.map((option) => (
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
                  inputProps={{ step: 0.01, min: 0, max: 100 }}
                  value={formData.pisAliquota}
                  onChange={(e) =>
                    setFormData({ ...formData, pisAliquota: e.target.value })
                  }
                  placeholder="1.65"
                  size="small"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cofinsCst">CST COFINS</Label>
                <Select
                  value={formData.cofinsCst}
                  onValueChange={(value) => setFormData({ ...formData, cofinsCst: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione o CST COFINS" />
                  </SelectTrigger>
                  <SelectContent>
                    {CST_PIS_COFINS_OPTIONS.map((option) => (
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
                  inputProps={{ step: 0.01, min: 0, max: 100 }}
                  value={formData.cofinsAliquota}
                  onChange={(e) =>
                    setFormData({ ...formData, cofinsAliquota: e.target.value })
                  }
                  placeholder="7.60"
                  size="small"
                />
              </div>
            </div>
          </form>
        </div>

        <DialogFooter
          sx={{
            padding: '16px 24px 24px 24px',
            flexShrink: 0,
            borderTop: '1px solid #e5e7eb',
            marginTop: 0,
          }}
        >
          <Button
            type="button"
            variant="outlined"
            onClick={onClose}
            disabled={isLoading}
            sx={{
              backgroundColor: 'rgba(131, 56, 236, 0.1)',
              color: 'var(--color-alternate)',
              borderColor: 'var(--color-alternate)',
              '&:hover': {
                backgroundColor: 'rgba(131, 56, 236, 0.2)',
              },
            }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              const form = document.getElementById('configurar-ncm-form') as HTMLFormElement
              if (form) {
                form.requestSubmit()
              }
            }}
            disabled={isLoading}
            sx={{
              backgroundColor: 'var(--color-alternate)',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: 'rgba(131, 56, 236, 0.8)',
              },
            }}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

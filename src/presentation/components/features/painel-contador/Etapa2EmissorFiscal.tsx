'use client'

import React, { useEffect, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { Label } from '@/src/presentation/components/ui/label'
import { Switch } from '@/src/presentation/components/ui/switch'
import { JiffyLoading } from '../../ui/JiffyLoading'

interface ConfiguracaoNumeracao {
  id: string
  modelo: number // 55 = NF-e, 65 = NFC-e
  serie: number
  proximoNumero: number
  numeroInicial?: number
  numeroFinal?: number
  ativo: boolean
  terminalId?: string | null
  // Campos unificados de emissor_fiscal
  nfeAtivo?: boolean
  nfceAtivo?: boolean
  nfceCscId?: string
  nfceCscCodigo?: string
  ambiente?: 'HOMOLOGACAO' | 'PRODUCAO'
}

type AmbienteFiscal = 'HOMOLOGACAO' | 'PRODUCAO'

interface ConfiguracaoEmissorFiscal {
  id?: string
  nfeAtivo: boolean
  nfceAtivo: boolean
  nfceCscId?: string
  nfceCscCodigo?: string
}

export function Etapa3EmissorFiscal() {
  const { auth, isRehydrated } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  /** Salvamento independente por card — evita desabilitar NF-e ao salvar NFC-e e vice-versa */
  const [isSavingNfe, setIsSavingNfe] = useState(false)
  const [isSavingNfce, setIsSavingNfce] = useState(false)
  
  // Configurações de numeração
  const [nfeNumeracao, setNfeNumeracao] = useState<ConfiguracaoNumeracao | null>(null)
  const [nfceNumeracao, setNfceNumeracao] = useState<ConfiguracaoNumeracao | null>(null)
  
  // Configurações gerais (toggles e CSC)
  const [emissorFiscal, setEmissorFiscal] = useState<ConfiguracaoEmissorFiscal>({
    nfeAtivo: false,
    nfceAtivo: false,
  })
  
  // Formulário NF-e
  const [nfeForm, setNfeForm] = useState({
    serie: '',
    proximoNumero: '',
    ambiente: '' as AmbienteFiscal | '',
  })
  
  // Formulário NFC-e
  const [nfceForm, setNfceForm] = useState({
    serie: '',
    proximoNumero: '',
    cscId: '',
    cscCodigo: '',
    ambiente: '' as AmbienteFiscal | '',
  })

  /**
   * Escolhe qual linha (PROD vs HOMO) usar ao carregar do servidor (abrir tela / recarregar).
   * Troca só pelo select não recarrega série/próximo — esses valores vêm desta linha inicial.
   */
  const selectConfiguracaoPrincipal = (
    numeracoes: ConfiguracaoNumeracao[],
    modelo: 55 | 65
  ): ConfiguracaoNumeracao | null => {
    const candidatas = numeracoes.filter((n) => n.modelo === modelo && !n.terminalId)
    if (candidatas.length === 0) return null

    const comAtivo = candidatas.filter((n) => n.ativo)
    if (comAtivo.length === 1) {
      return comAtivo[0]
    }

    return (
      candidatas.find((n) => n.ativo && n.ambiente === 'PRODUCAO') ||
      candidatas.find((n) => n.ativo && n.ambiente === 'HOMOLOGACAO') ||
      candidatas.find((n) => n.ambiente === 'PRODUCAO') ||
      candidatas.find((n) => n.ambiente === 'HOMOLOGACAO') ||
      candidatas[0]
    )
  }

  useEffect(() => {
    // Aguardar reidratação do Zustand antes de fazer requisições
    if (!isRehydrated) return
    
    void loadData()
  }, [auth, isRehydrated])

  const loadData = async () => {
    // Não mostrar toast se ainda não reidratou - pode ser apenas o estado inicial
    if (!isRehydrated) return
    
    const token = auth?.getAccessToken()
    if (!token) {
      // Só mostrar toast se realmente não houver token após reidratação
      return
    }

    setIsLoading(true)
    try {
      // Buscar configurações de numeração
      const numeracaoResponse = await fetch('/api/v1/fiscal/configuracoes/emissao', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (numeracaoResponse.ok) {
        const numeracoes: ConfiguracaoNumeracao[] = await numeracaoResponse.json()
        
        // NF-e: modelo 55, terminal_id = null (geral)
        // Só pode haver uma configuração de NF-e por empresa
        
        const nfe = selectConfiguracaoPrincipal(numeracoes, 55)
        if (nfe) {
          
          setNfeNumeracao(nfe)
          // Sempre atualizar o formulário com os valores do banco (garantir sincronização)
          const ambienteNfe = nfe.ambiente ?? ''
          setNfeForm({
            serie: String(nfe.serie),
            proximoNumero: String(nfe.proximoNumero),
            ambiente: ambienteNfe,
          })
          
          // Atualizar toggles da NF-e
          const nfeAtivoValue = nfe.nfeAtivo ?? false
          
          setEmissorFiscal(prev => ({
            ...prev,
            nfeAtivo: nfeAtivoValue,
          }))
        } else {
          // Se não encontrou configuração, limpar
          setNfeNumeracao(null)
          setNfeForm({
            serie: '',
            proximoNumero: '',
            ambiente: '',
          })
        }
        
        // NFC-e: modelo 65, terminal_id = null (controle único, igual NF-e)
        // Só pode haver uma configuração de NFC-e por empresa
        const nfce = selectConfiguracaoPrincipal(numeracoes, 65)
        if (nfce) {
          
          setNfceNumeracao(nfce)
          // Sempre atualizar o formulário com os valores do banco (garantir sincronização)
          const ambienteNfce = nfce.ambiente ?? ''
          setNfceForm(prev => ({
            ...prev,
            serie: String(nfce.serie),
            proximoNumero: String(nfce.proximoNumero),
            cscId: nfce.nfceCscId || '',
            cscCodigo: nfce.nfceCscCodigo || '',
            ambiente: ambienteNfce,
          }))
          
          // Atualizar toggles e CSC da NFC-e
          setEmissorFiscal(prev => ({
            ...prev,
            nfceAtivo: nfce.nfceAtivo ?? false,
          }))
        } else {
          // Se não encontrou configuração, limpar
          setNfceNumeracao(null)
          setNfceForm(prev => ({
            ...prev,
            serie: '',
            proximoNumero: '',
            cscId: '',
            cscCodigo: '',
            ambiente: '',
          }))
        }
      }
      if (!numeracaoResponse.ok) {
        const errorData = await numeracaoResponse.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || 'Erro ao carregar configurações de emissão')
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error)
      showToast.error('Erro ao carregar configurações de emissor fiscal')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveNfe = async (
    ambienteOverride?: AmbienteFiscal,
    options?: { showFeedback?: boolean }
  ) => {
    const showFeedback = options?.showFeedback ?? true
    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      return
    }

    if (!nfeForm.serie || !nfeForm.proximoNumero) {
      showToast.error('Série e Próximo Número são obrigatórios para NF-e')
      return
    }

    setIsSavingNfe(true)
    const toastId = showFeedback ? showToast.loading('Salvando configuração NF-e...') : null

    try {
      const ambiente = ambienteOverride ?? nfeForm.ambiente
      if (ambiente !== 'HOMOLOGACAO' && ambiente !== 'PRODUCAO') {
        throw new Error('Selecione o ambiente da NF-e (HOMOLOGACAO ou PRODUCAO).')
      }

      const payload = {
        modelo: 55,
        serie: parseInt(nfeForm.serie),
        numeroInicial: parseInt(nfeForm.proximoNumero),
        terminalId: null, // NF-e é geral
        nfeAtivo: emissorFiscal.nfeAtivo, // Toggle NF-e
        ambiente,
      }

      let response
      
      if (nfeNumeracao) {
        // Para NF-e, sempre atualizar a configuração existente (não criar nova)
        // Permitir mudar a série livremente
        response = await fetch('/api/v1/fiscal/configuracoes/emissao/55', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })
      } else {
        // Sempre usa o endpoint de emissão para criar/atualizar
        response = await fetch('/api/v1/fiscal/configuracoes/emissao/55', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })
      }

      if (!response.ok) {
        let errorMessage = 'Erro ao salvar configuração NF-e'
        try {
          const error = await response.json()
          errorMessage = error.message || error.error || errorMessage
          console.error('Erro ao salvar NF-e - Resposta:', response.status, error)
        } catch (parseError) {
          const errorText = await response.text()
          console.error('Erro ao salvar NF-e - Resposta não JSON:', response.status, errorText)
          errorMessage = `Erro ${response.status}: ${response.statusText || errorText}`
        }
        throw new Error(errorMessage)
      }

      // Ler dados da resposta antes de mostrar toast
      const data = await response.json()
      
      // Atualizar estado local com os dados salvos (garantir que a série está correta)
      const novaNumeracao = {
        id: data.id,
        modelo: data.modelo,
        serie: data.serie,
        proximoNumero: data.proximoNumero,
        numeroInicial: data.numeroInicial,
        numeroFinal: data.numeroFinal,
        ativo: data.ativo,
        terminalId: data.terminalId,
        nfeAtivo: data.nfeAtivo,
        nfceAtivo: data.nfceAtivo,
        nfceCscId: data.nfceCscId,
        nfceCscCodigo: data.nfceCscCodigo,
        ambiente: data.ambiente,
      }
      setNfeNumeracao(novaNumeracao)
      
      // Atualizar toggles - usar o valor retornado, mas se não vier, usar o que foi enviado
      const nfeAtivoFinal = data.nfeAtivo !== undefined ? data.nfeAtivo : payload.nfeAtivo
      
      setEmissorFiscal(prev => ({
        ...prev,
        nfeAtivo: nfeAtivoFinal,
      }))
      
      // Atualizar formulário com os valores salvos (importante: usar a série que foi salva)
      const ambientePersistido = (data.ambiente ?? ambiente) as AmbienteFiscal
      setNfeForm({
        serie: String(data.serie),
        proximoNumero: String(data.proximoNumero),
        ambiente: ambientePersistido,
      })
      if (toastId) {
        showToast.successLoading(toastId, 'Configuração NF-e salva com sucesso!')
      }
      
      // Não recarregar dados aqui para evitar sobrescrever os valores que acabamos de salvar
      // Os dados já foram atualizados acima com os valores retornados do servidor
    } catch (error: any) {
      console.error('Erro ao salvar NF-e:', {
        error,
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        response: error?.response
      })
      
      // Não deslogar o usuário por erros de validação ou comunicação
      // Apenas mostrar mensagem de erro
      const errorMessage = error?.message || 'Erro ao salvar configuração NF-e'
      if (toastId) {
        showToast.errorLoading(toastId, errorMessage)
      } else {
        showToast.error(errorMessage)
      }
    } finally {
      setIsSavingNfe(false)
    }
  }

  const handleSaveNfce = async (
    ambienteOverride?: AmbienteFiscal,
    options?: { showFeedback?: boolean }
  ) => {
    const showFeedback = options?.showFeedback ?? true
    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      return
    }

    // Validar CSC apenas se NFC-e estiver ativada
    if (emissorFiscal.nfceAtivo && (!nfceForm.cscId || !nfceForm.cscCodigo)) {
      showToast.error('CSC ID e Código são obrigatórios quando NFC-e está ativada')
      return
    }

    // Validar série e próxima emissão (igual NF-e)
    if (emissorFiscal.nfceAtivo) {
      if (!nfceForm.serie || !nfceForm.proximoNumero) {
        showToast.error('Série e Próxima Emissão são obrigatórios para NFC-e')
        return
      }
      
      // Validar que são números válidos
      const serieNum = parseInt(nfceForm.serie)
      const proximoNum = parseInt(nfceForm.proximoNumero)
      
      if (isNaN(serieNum) || isNaN(proximoNum)) {
        showToast.error('Série e Próxima Emissão devem ser números válidos')
        return
      }
      
      if (serieNum <= 0 || proximoNum <= 0) {
        showToast.error('Série e Próxima Emissão devem ser maiores que zero')
        return
      }
    }

    setIsSavingNfce(true)
    const toastId = showFeedback ? showToast.loading('Salvando configuração NFC-e...') : null

    try {
      const ambiente = ambienteOverride ?? nfceForm.ambiente
      if (ambiente !== 'HOMOLOGACAO' && ambiente !== 'PRODUCAO') {
        throw new Error('Selecione o ambiente da NFC-e (HOMOLOGACAO ou PRODUCAO).')
      }

      // Salvar configuração de numeração (série e próxima emissão) - igual NF-e
      if (emissorFiscal.nfceAtivo && nfceForm.serie && nfceForm.proximoNumero) {
        const serieNum = parseInt(nfceForm.serie)
        const proximoNum = parseInt(nfceForm.proximoNumero)
        
        // Garantir que são números válidos
        if (isNaN(serieNum) || isNaN(proximoNum)) {
          throw new Error('Série e Próxima Emissão devem ser números válidos')
        }
        
        const numeracaoPayload = {
          modelo: 65,
          serie: serieNum,
          numeroInicial: proximoNum,
          terminalId: null, // NFC-e é geral (controle único)
          nfceAtivo: emissorFiscal.nfceAtivo, // Toggle NFC-e
          nfceCscId: nfceForm.cscId || undefined,
          nfceCscCodigo: nfceForm.cscCodigo || undefined,
          ambiente,
        }

        let numeracaoResponse
        if (nfceNumeracao) {
          // Para NFC-e, sempre atualizar a configuração existente (não criar nova)
          // Permitir mudar a série livremente
          // IMPORTANTE: modelo e serie também devem estar no body para validação
          numeracaoResponse = await fetch('/api/v1/fiscal/configuracoes/emissao/65', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(numeracaoPayload),
          })
        } else {
          // Sempre usa o endpoint de emissão para criar/atualizar
          numeracaoResponse = await fetch('/api/v1/fiscal/configuracoes/emissao/65', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(numeracaoPayload),
          })
        }

        if (!numeracaoResponse.ok) {
          let errorMessage = 'Erro ao salvar numeração NFC-e'
          try {
            const error = await numeracaoResponse.json()
            errorMessage = error.message || error.error || errorMessage
            console.error('Erro ao salvar numeração NFC-e - Resposta:', numeracaoResponse.status, error)
          } catch (parseError) {
            const errorText = await numeracaoResponse.text()
            console.error('Erro ao salvar numeração NFC-e - Resposta não JSON:', numeracaoResponse.status, errorText)
            errorMessage = `Erro ${numeracaoResponse.status}: ${numeracaoResponse.statusText || errorText}`
          }
          throw new Error(errorMessage)
        }

        // Ler dados da resposta antes de continuar
        const numeracaoData = await numeracaoResponse.json()
        
        // Atualizar estado local com os dados salvos
        const novaNumeracao = {
          id: numeracaoData.id,
          modelo: numeracaoData.modelo,
          serie: numeracaoData.serie,
          proximoNumero: numeracaoData.proximoNumero,
          numeroInicial: numeracaoData.numeroInicial,
          numeroFinal: numeracaoData.numeroFinal,
          ativo: numeracaoData.ativo,
          terminalId: numeracaoData.terminalId,
          nfeAtivo: numeracaoData.nfeAtivo,
          nfceAtivo: numeracaoData.nfceAtivo,
          nfceCscId: numeracaoData.nfceCscId,
          nfceCscCodigo: numeracaoData.nfceCscCodigo,
          ambiente: numeracaoData.ambiente,
        }
        setNfceNumeracao(novaNumeracao)
        
        // Atualizar formulário com os valores salvos
        setNfceForm(prev => ({
          ...prev,
          serie: String(numeracaoData.serie),
          proximoNumero: String(numeracaoData.proximoNumero),
          cscId: numeracaoData.nfceCscId || '',
          cscCodigo: numeracaoData.nfceCscCodigo || '',
          ambiente: numeracaoData.ambiente ?? ambiente,
        }))
        
        // Atualizar toggles
        setEmissorFiscal(prev => ({
          ...prev,
          nfceAtivo: numeracaoData.nfceAtivo ?? false,
        }))

      }

      if (toastId) {
        showToast.successLoading(toastId, 'Configuração NFC-e salva com sucesso!')
      }
      // Não recarregar dados aqui para evitar sobrescrever os valores que acabamos de salvar
      // Os dados já foram atualizados acima com os valores retornados do servidor
    } catch (error: any) {
      console.error('Erro ao salvar NFC-e:', error)
      const errorMessage = error?.message || 'Erro ao salvar configuração NFC-e'
      if (toastId) {
        showToast.errorLoading(toastId, errorMessage)
      } else {
        showToast.error(errorMessage)
      }
    } finally {
      setIsSavingNfce(false)
    }
  }

  const handleChangeNfeAmbiente = (value: AmbienteFiscal | '') => {
    setNfeForm(prev => ({ ...prev, ambiente: value }))

    if (value !== 'HOMOLOGACAO' && value !== 'PRODUCAO') return
    if (isSavingNfe) return
    void handleSaveNfe(value, { showFeedback: false })
  }

  const handleChangeNfceAmbiente = (value: AmbienteFiscal | '') => {
    setNfceForm(prev => ({ ...prev, ambiente: value }))

    if (value !== 'HOMOLOGACAO' && value !== 'PRODUCAO') return
    if (isSavingNfce) return
    void handleSaveNfce(value, { showFeedback: false })
  }

  const handleToggleNfe = async (ativo: boolean) => {
    const token = auth?.getAccessToken()
    if (!token) return

    // Atualizar estado local primeiro
    setEmissorFiscal(prev => ({ ...prev, nfeAtivo: ativo }))

    // Se não tiver configuração de numeração, apenas atualizar toggle local
    // O toggle será salvo quando o usuário salvar a numeração
    if (!nfeNumeracao || !nfeForm.serie || !nfeForm.proximoNumero) {
      return
    }

    setIsSavingNfe(true)
    try {
      const ambiente = nfeForm.ambiente || nfeNumeracao?.ambiente
      if (ambiente !== 'HOMOLOGACAO' && ambiente !== 'PRODUCAO') {
        throw new Error('Ambiente da configuração NF-e inválido para atualizar status.')
      }

      // Salvar toggle junto com a numeração
      const payload = {
        modelo: 55,
        serie: parseInt(nfeForm.serie),
        numeroInicial: parseInt(nfeForm.proximoNumero),
        terminalId: null,
        nfeAtivo: ativo,
        ambiente,
      }

      const response = await fetch('/api/v1/fiscal/configuracoes/emissao/55', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        setNfeNumeracao(prev => prev ? { ...prev, nfeAtivo: data.nfeAtivo } : null)
      }
    } catch (error) {
      console.error('Erro ao atualizar toggle NF-e:', error)
      // Reverter toggle em caso de erro
      setEmissorFiscal(prev => ({ ...prev, nfeAtivo: !ativo }))
    } finally {
      setIsSavingNfe(false)
    }
  }

  const handleToggleNfce = async (ativo: boolean) => {
    const token = auth?.getAccessToken()
    if (!token) return

    // Atualizar estado local primeiro
    setEmissorFiscal(prev => ({ ...prev, nfceAtivo: ativo }))

    // Se não tiver configuração de numeração, apenas atualizar toggle local
    // O toggle será salvo quando o usuário salvar a numeração
    if (!nfceNumeracao || !nfceForm.serie || !nfceForm.proximoNumero) {
      return
    }

    setIsSavingNfce(true)
    try {
      const ambiente = nfceForm.ambiente || nfceNumeracao?.ambiente
      if (ambiente !== 'HOMOLOGACAO' && ambiente !== 'PRODUCAO') {
        throw new Error('Ambiente da configuração NFC-e inválido para atualizar status.')
      }

      // Salvar toggle junto com a numeração
      const payload = {
        modelo: 65,
        serie: parseInt(nfceForm.serie),
        numeroInicial: parseInt(nfceForm.proximoNumero),
        terminalId: null,
        nfceAtivo: ativo,
        // Manter CSC se já existir
        nfceCscId: nfceForm.cscId || undefined,
        nfceCscCodigo: nfceForm.cscCodigo || undefined,
        ambiente,
      }

      const response = await fetch('/api/v1/fiscal/configuracoes/emissao/65', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        setNfceNumeracao(prev => prev ? { ...prev, nfceAtivo: data.nfceAtivo } : null)
      }
    } catch (error) {
      console.error('Erro ao atualizar toggle NFC-e:', error)
      // Reverter toggle em caso de erro
      setEmissorFiscal(prev => ({ ...prev, nfceAtivo: !ativo }))
    } finally {
      setIsSavingNfce(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <JiffyLoading />
      </div>
    )
  }

  const camposNfeDesabilitados = !emissorFiscal.nfeAtivo || isSavingNfe
  const camposNfceDesabilitados = !emissorFiscal.nfceAtivo || isSavingNfce

  return (
    <div className="p-2 sm:p-4">
      <h2 className="font-exo font-semibold text-alternate text-lg sm:text-xl mb-4">
        Configurar modelo de Emissor Fiscal
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
        {/* NF-e */}
        <div className="flex h-full min-h-0 flex-col rounded-lg border border-alternate/20 bg-white p-2 sm:p-3">
          <div className="flex shrink-0 items-center justify-between">
            <h4 className="font-exo font-semibold text-alternate text-base">
              NF-e (Nota Fiscal Eletrônica)
            </h4>
            <div className="flex items-center gap-1">
              <Label htmlFor="nfe-ativo" className="text-sm">
                NF-e
              </Label>
              <Switch
                id="nfe-ativo"
                checked={emissorFiscal.nfeAtivo}
                onChange={e => handleToggleNfe(e.target.checked)}
                disabled={isSavingNfe}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: 'var(--color-alternate)',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: 'var(--color-alternate)',
                  },
                }}
              />
            </div>
          </div>

          <div
            className={`mt-2 flex min-h-0 flex-1 flex-col ${camposNfeDesabilitados && !isSavingNfe ? 'opacity-75' : ''}`}
          >
            <div className="grid flex-1 grid-cols-2 gap-2">
              <div className="">
                <Label htmlFor="nfe-ambiente">Ambiente *</Label>
                <select
                  id="nfe-ambiente"
                  value={nfeForm.ambiente}
                  onChange={e => handleChangeNfeAmbiente(e.target.value as AmbienteFiscal | '')}
                  disabled={camposNfeDesabilitados}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="HOMOLOGACAO">Homologacao</option>
                  <option value="PRODUCAO">Producao</option>
                </select>
              </div>

              <div />

              <div className="">
                <Label htmlFor="nfe-serie">Série *</Label>
                <Input
                  id="nfe-serie"
                  type="number"
                  value={nfeForm.serie}
                  onChange={e => {
                    const newValue = e.target.value
                    setNfeForm({ ...nfeForm, serie: newValue })
                  }}
                  placeholder="1"
                  inputProps={{ min: 1 }}
                  size="small"
                  disabled={camposNfeDesabilitados}
                />
              </div>

              <div className="">
                <Label htmlFor="nfe-proximo">Próxima Emissão *</Label>
                <Input
                  id="nfe-proximo"
                  type="number"
                  value={nfeForm.proximoNumero}
                  onChange={e => setNfeForm({ ...nfeForm, proximoNumero: e.target.value })}
                  placeholder="1"
                  inputProps={{ min: 1 }}
                  size="small"
                  disabled={camposNfeDesabilitados}
                />
              </div>
            </div>

            {!emissorFiscal.nfeAtivo && (
             <div className="mb-2 rounded-lg border border-primary-text bg-gray-50 p-2">
             <p className="text-sm text-primary-text">
             Ative o switch NFC-e para editar e salvar esta configuração.
             </p>
           </div>
            )}

            <div className="mt-auto flex justify-end pt-3">
              <Button
                onClick={() => void handleSaveNfe()}
                disabled={
                  camposNfeDesabilitados ||
                  !nfeForm.ambiente ||
                  !nfeForm.serie ||
                  !nfeForm.proximoNumero
                }
                className="rounded-lg px-4 py-2 text-white text-sm font-medium"
                sx={{
                  backgroundColor: 'var(--color-secondary)',
                  '&:hover': { backgroundColor: 'var(--color-alternate)' },
                  '&:disabled': { backgroundColor: '#ccc', cursor: 'not-allowed' },
                }}
              >
                Salvar Configuração NF-e
              </Button>
            </div>
          </div>
        </div>

        {/* NFC-e */}
        <div className="flex h-full min-h-0 flex-col rounded-lg border border-alternate/20 bg-white p-2 sm:p-3">
          <div className="flex shrink-0 items-center justify-between">
            <h4 className="font-exo font-semibold text-alternate text-base">
              NFC-e (Nota Fiscal de Consumidor Eletrônica)
            </h4>
            <div className="flex items-center gap-1">
              <Label htmlFor="nfce-ativo" className="text-sm">
                NFC-e
              </Label>
              <Switch
                id="nfce-ativo"
                checked={emissorFiscal.nfceAtivo}
                onChange={e => handleToggleNfce(e.target.checked)}
                disabled={isSavingNfce}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: 'var(--color-alternate)',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: 'var(--color-alternate)',
                  },
                }}
              />
            </div>
          </div>

          <div
            className={`mt-2 flex min-h-0 flex-1 flex-col ${camposNfceDesabilitados && !isSavingNfce ? 'opacity-75' : ''}`}
          >
            <div className="mb-2 grid grid-cols-2 gap-2">
              <div className="">
                <Label htmlFor="nfce-ambiente">Ambiente *</Label>
                <select
                  id="nfce-ambiente"
                  value={nfceForm.ambiente}
                  onChange={e => handleChangeNfceAmbiente(e.target.value as AmbienteFiscal | '')}
                  disabled={camposNfceDesabilitados}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="HOMOLOGACAO">Homologacao</option>
                  <option value="PRODUCAO">Producao</option>
                </select>
              </div>

              <div />

              <div className="">
                <Label htmlFor="nfce-serie">Série *</Label>
                <Input
                  id="nfce-serie"
                  type="number"
                  value={nfceForm.serie}
                  onChange={e => {
                    const newValue = e.target.value
                    setNfceForm({ ...nfceForm, serie: newValue })
                  }}
                  placeholder="1"
                  inputProps={{ min: 1 }}
                  size="small"
                  disabled={camposNfceDesabilitados}
                />
              </div>

              <div className="">
                <Label htmlFor="nfce-proximo">Próxima Emissão *</Label>
                <Input
                  id="nfce-proximo"
                  type="number"
                  value={nfceForm.proximoNumero}
                  onChange={e => setNfceForm({ ...nfceForm, proximoNumero: e.target.value })}
                  placeholder="1"
                  inputProps={{ min: 1 }}
                  size="small"
                  disabled={camposNfceDesabilitados}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="">
                <Label htmlFor="nfce-csc-id">CSC ID *</Label>
                <Input
                  id="nfce-csc-id"
                  value={nfceForm.cscId}
                  onChange={e => setNfceForm({ ...nfceForm, cscId: e.target.value })}
                  placeholder="CODIGO-CSC-ID-CONTRIBUINTE"
                  size="small"
                  disabled={camposNfceDesabilitados}
                />
                <p className="text-xs text-secondary-text/70">Obtido na SEFAZ da sua UF</p>
              </div>

              <div className="">
                <Label htmlFor="nfce-csc-codigo">CSC Código *</Label>
                <Input
                  id="nfce-csc-codigo"
                  value={nfceForm.cscCodigo}
                  onChange={e => setNfceForm({ ...nfceForm, cscCodigo: e.target.value })}
                  placeholder="12345678"
                  size="small"
                  disabled={camposNfceDesabilitados}
                />
                <p className="text-xs text-secondary-text/70">Obtido na SEFAZ da sua UF</p>
              </div>
            </div>

            {emissorFiscal.nfceAtivo ? (
              <div className="mb-2 p-2">
               
              </div>
            ) : (
              <div className="mb-2 rounded-lg border border-primary-text bg-gray-50 p-2">
                <p className="text-sm text-primary-text">
                Ative o switch NFC-e para editar e salvar esta configuração.
                </p>
              </div>
            )}

            <div className="mt-auto flex justify-end pt-3">
              <Button
                onClick={() => void handleSaveNfce()}
                disabled={
                  camposNfceDesabilitados ||
                  (emissorFiscal.nfceAtivo &&
                    (!nfceForm.ambiente ||
                      !nfceForm.serie ||
                      !nfceForm.proximoNumero ||
                      !nfceForm.cscId ||
                      !nfceForm.cscCodigo))
                }
                className="rounded-lg px-4 py-2 text-white text-sm font-medium"
                sx={{
                  backgroundColor: 'var(--color-secondary)',
                  '&:hover': { backgroundColor: 'var(--color-alternate)' },
                  '&:disabled': { backgroundColor: '#ccc', cursor: 'not-allowed' },
                }}
              >
                Salvar Configuração NFC-e
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

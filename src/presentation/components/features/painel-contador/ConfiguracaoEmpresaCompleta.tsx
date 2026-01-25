'use client'

import React, { useEffect, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
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
import { extractTokenInfo } from '@/src/shared/utils/validateToken'
import { MdCheckCircle, MdError, MdSave } from 'react-icons/md'
import { CidadeAutocomplete } from '@/src/presentation/components/ui/cidade-autocomplete'

interface EmpresaData {
  id: string
  cnpj?: string
  razaoSocial?: string
  nomeFantasia?: string
  email?: string
  telefone?: string
  endereco?: {
    rua?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
    cep?: string
  }
}

interface ConfiguracaoFiscal {
  id?: string
  inscricaoEstadual?: string
  inscricaoMunicipal?: string
  codigoRegimeTributario?: number
  simplesNacional?: boolean
  contribuinteIcms?: boolean
}

// Siglas dos estados brasileiros em ordem alfabética
const ESTADOS_BRASILEIROS = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
]

export function ConfiguracaoEmpresaCompleta() {
  const { auth, isRehydrated } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null)
  const [configFiscal, setConfigFiscal] = useState<ConfiguracaoFiscal | null>(null)
  
  // Dados da empresa (backend)
  const [formDataEmpresa, setFormDataEmpresa] = useState({
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    email: '',
    telefone: '',
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
  })

  // Dados fiscais (microserviço fiscal)
  const [formDataFiscal, setFormDataFiscal] = useState({
    inscricaoEstadual: '',
    isento: false,
    inscricaoMunicipal: '',
    codigoRegimeTributario: '1' as '1' | '2' | '3',
  })

  // Validação de cidade
  const [cidadeValida, setCidadeValida] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isRehydrated) return
    loadData()
  }, [auth, isRehydrated])

  const loadData = async () => {
    if (!isRehydrated) return
    
    const token = auth?.getAccessToken()
    if (!token) {
      return
    }

    setIsLoading(true)
    try {
      // Buscar dados da empresa do backend
      const empresaResponse = await fetch('/api/empresas/me', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (empresaResponse.ok) {
        const empresaData = await empresaResponse.json()
        setEmpresa(empresaData)
        setFormDataEmpresa({
          cnpj: empresaData.cnpj || '',
          razaoSocial: empresaData.razaoSocial || empresaData.nome || '',
          nomeFantasia: empresaData.nomeFantasia || '',
          email: empresaData.email || '',
          telefone: empresaData.telefone || '',
          cep: empresaData.endereco?.cep || '',
          rua: empresaData.endereco?.rua || empresaData.endereco?.logradouro || '',
          numero: empresaData.endereco?.numero || '',
          complemento: empresaData.endereco?.complemento || '',
          bairro: empresaData.endereco?.bairro || '',
          cidade: empresaData.endereco?.cidade || '',
          estado: empresaData.endereco?.estado || empresaData.endereco?.uf || '',
        })
      }

      // Buscar configuração fiscal
      const tokenInfo = auth?.getAccessToken() ? extractTokenInfo(auth.getAccessToken()) : null
      const empresaId = tokenInfo?.empresaId
      
      if (empresaId) {
        const fiscalResponse = await fetch(
          `/api/v1/fiscal/empresas-fiscais/${empresaId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        if (fiscalResponse.ok) {
          const config = await fiscalResponse.json()
          setConfigFiscal(config)
          setFormDataFiscal({
            inscricaoEstadual: config.inscricaoEstadual || '',
            isento: config.inscricaoEstadual === 'ISENTO' || !config.inscricaoEstadual,
            inscricaoMunicipal: config.inscricaoMunicipal || '',
            codigoRegimeTributario: String(config.codigoRegimeTributario || 1) as '1' | '2' | '3',
          })
        } else if (fiscalResponse.status === 404) {
          // Não há configuração - será criada ao salvar
          console.log('Nenhuma configuração fiscal encontrada. Será criada ao salvar.')
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error)
      showToast.error('Erro ao carregar dados da empresa')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      return
    }

    // Validações
    if (!formDataEmpresa.cnpj.trim()) {
      showToast.error('CNPJ é obrigatório')
      return
    }

    if (!formDataEmpresa.razaoSocial.trim()) {
      showToast.error('Razão Social é obrigatória')
      return
    }

    if (!formDataFiscal.isento && !formDataFiscal.inscricaoEstadual.trim()) {
      showToast.error('Inscrição Estadual é obrigatória ou marque "Isento"')
      return
    }

    // Validar cidade antes de salvar
    if (formDataEmpresa.cidade && formDataEmpresa.estado) {
      if (cidadeValida === false) {
        showToast.error(
          `Cidade "${formDataEmpresa.cidade}" não encontrada no estado ${formDataEmpresa.estado}. ` +
          `Por favor, selecione uma cidade válida da lista de sugestões.`
        )
        return
      }

      // Se ainda não foi validada, validar agora
      if (cidadeValida === null) {
        try {
          const response = await fetch(
            `/api/v1/ibge/validar-cidade?cidade=${encodeURIComponent(formDataEmpresa.cidade)}&uf=${formDataEmpresa.estado}`
          )
          if (response.ok) {
            const data = await response.json()
            if (!data.valido) {
              showToast.error(
                `Cidade "${formDataEmpresa.cidade}" não encontrada no estado ${formDataEmpresa.estado}. ` +
                `Por favor, selecione uma cidade válida da lista de sugestões.`
              )
              return
            }
          }
        } catch (error) {
          console.error('Erro ao validar cidade:', error)
          // Continuar mesmo se a validação falhar (pode ser problema de rede)
        }
      }
    }

    setIsSaving(true)
    const toastId = showToast.loading('Salvando configurações...')

    try {
      const tokenInfo = auth?.getAccessToken() ? extractTokenInfo(auth.getAccessToken()) : null
      const empresaId = tokenInfo?.empresaId
      
      if (!empresaId) {
        showToast.error('Empresa não identificada no token')
        return
      }

      // 1. Atualizar dados da empresa no backend
      const empresaPayload = {
        cnpj: formDataEmpresa.cnpj.replace(/\D/g, ''),
        razaoSocial: formDataEmpresa.razaoSocial.trim(),
        nomeFantasia: formDataEmpresa.nomeFantasia.trim() || undefined,
        email: formDataEmpresa.email.trim() || undefined,
        telefone: formDataEmpresa.telefone.replace(/\D/g, '') || undefined,
        endereco: {
          cep: formDataEmpresa.cep.replace(/\D/g, '') || undefined,
          rua: formDataEmpresa.rua.trim() || undefined,
          numero: formDataEmpresa.numero.trim() || undefined,
          complemento: formDataEmpresa.complemento.trim() || undefined,
          bairro: formDataEmpresa.bairro.trim() || undefined,
          cidade: formDataEmpresa.cidade.trim() || undefined,
          estado: formDataEmpresa.estado.toUpperCase() || undefined,
        },
      }

      const empresaResponse = await fetch(`/api/empresas/${empresaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(empresaPayload),
      })

      if (!empresaResponse.ok) {
        const error = await empresaResponse.json()
        throw new Error(error.message || 'Erro ao atualizar dados da empresa')
      }

      // 2. Atualizar configuração fiscal no microserviço
      const inscricaoEstadualValue = formDataFiscal.isento 
        ? 'ISENTO' 
        : formDataFiscal.inscricaoEstadual.trim();
      
      const fiscalPayload = {
        empresaId: empresaId,
        inscricaoEstadual: inscricaoEstadualValue || null,
        inscricaoMunicipal: formDataFiscal.inscricaoMunicipal.trim() || null,
        codigoRegimeTributario: parseInt(formDataFiscal.codigoRegimeTributario),
        simplesNacional: formDataFiscal.codigoRegimeTributario === '1',
        contribuinteIcms: true,
      }

      console.log('📤 Enviando payload fiscal:', JSON.stringify(fiscalPayload, null, 2))

      const fiscalResponse = await fetch('/api/v1/fiscal/empresas-fiscais', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fiscalPayload),
      })

      if (!fiscalResponse.ok) {
        const error = await fiscalResponse.json()
        console.error('❌ Erro na resposta fiscal:', error)
        throw new Error(error.message || 'Erro ao salvar dados fiscais')
      }

      const responseData = await fiscalResponse.json()
      console.log('✅ Resposta fiscal salva:', JSON.stringify(responseData, null, 2))

      showToast.successLoading(toastId, 'Configurações salvas com sucesso!')
      
      // Aguardar um pouco para garantir que o banco foi atualizado e commitado
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      await loadData() // Recarregar dados
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error)
      showToast.errorLoading(toastId, error.message || 'Erro ao salvar configurações')
    } finally {
      setIsSaving(false)
    }
  }

  const getRegimeLabel = (codigo: string): string => {
    const labels: { [key: string]: string } = {
      '1': 'Simples Nacional',
      '2': 'Simples Nacional - Excesso de Sublimite',
      '3': 'Regime Normal (Presumido/Real)',
    }
    return labels[codigo] || 'Não definido'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-secondary-text">Carregando dados da empresa...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 min-h-full">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-primary mb-6">Configuração Completa da Empresa</h2>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Seção: Dados da Empresa */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Dados da Empresa
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  value={formDataEmpresa.cnpj}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 14)
                    setFormDataEmpresa({ ...formDataEmpresa, cnpj: value })
                  }}
                  placeholder="00.000.000/0000-00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="razaoSocial">Razão Social *</Label>
                <Input
                  id="razaoSocial"
                  value={formDataEmpresa.razaoSocial}
                  onChange={(e) =>
                    setFormDataEmpresa({ ...formDataEmpresa, razaoSocial: e.target.value })
                  }
                  placeholder="Nome da empresa"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                <Input
                  id="nomeFantasia"
                  value={formDataEmpresa.nomeFantasia}
                  onChange={(e) =>
                    setFormDataEmpresa({ ...formDataEmpresa, nomeFantasia: e.target.value })
                  }
                  placeholder="Nome fantasia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formDataEmpresa.email}
                  onChange={(e) =>
                    setFormDataEmpresa({ ...formDataEmpresa, email: e.target.value })
                  }
                  placeholder="email@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formDataEmpresa.telefone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    setFormDataEmpresa({ ...formDataEmpresa, telefone: value })
                  }}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>

          {/* Seção: Endereço */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Endereço
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formDataEmpresa.cep}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 8)
                    setFormDataEmpresa({ ...formDataEmpresa, cep: value })
                  }}
                  placeholder="00000-000"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="rua">Rua</Label>
                <Input
                  id="rua"
                  value={formDataEmpresa.rua}
                  onChange={(e) =>
                    setFormDataEmpresa({ ...formDataEmpresa, rua: e.target.value })
                  }
                  placeholder="Nome da rua"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formDataEmpresa.numero}
                  onChange={(e) =>
                    setFormDataEmpresa({ ...formDataEmpresa, numero: e.target.value })
                  }
                  placeholder="123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={formDataEmpresa.complemento}
                  onChange={(e) =>
                    setFormDataEmpresa({ ...formDataEmpresa, complemento: e.target.value })
                  }
                  placeholder="Apto, Sala, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formDataEmpresa.bairro}
                  onChange={(e) =>
                    setFormDataEmpresa({ ...formDataEmpresa, bairro: e.target.value })
                  }
                  placeholder="Nome do bairro"
                />
              </div>

              <div className="space-y-2">
                <CidadeAutocomplete
                  value={formDataEmpresa.cidade}
                  onChange={(cidade) =>
                    setFormDataEmpresa({ ...formDataEmpresa, cidade })
                  }
                  estado={formDataEmpresa.estado}
                  label="Cidade"
                  placeholder="Digite o nome da cidade"
                  required={false}
                  disabled={!formDataEmpresa.estado}
                  onValidationChange={setCidadeValida}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado (UF) *</Label>
                <Select
                  value={formDataEmpresa.estado}
                  onValueChange={(value) => {
                    setFormDataEmpresa({ ...formDataEmpresa, estado: value })
                  }}
                  required
                >
                  <SelectTrigger id="estado">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BRASILEIROS.map((estado) => (
                      <SelectItem key={estado.sigla} value={estado.sigla}>
                        {estado.sigla} - {estado.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção: Dados Fiscais */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Dados Fiscais
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Inscrição Estadual */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="isento"
                    checked={formDataFiscal.isento}
                    onChange={(e) => {
                      setFormDataFiscal({ 
                        ...formDataFiscal, 
                        isento: e.target.checked, 
                        inscricaoEstadual: '' 
                      })
                    }}
                    className="rounded"
                  />
                  <Label htmlFor="isento" className="cursor-pointer">
                    Empresa isenta de Inscrição Estadual
                  </Label>
                </div>
                {!formDataFiscal.isento && (
                  <>
                    <Label htmlFor="inscricaoEstadual">Inscrição Estadual (IE) *</Label>
                    <Input
                      id="inscricaoEstadual"
                      value={formDataFiscal.inscricaoEstadual}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        setFormDataFiscal({ ...formDataFiscal, inscricaoEstadual: value })
                      }}
                      placeholder="123456789012"
                      maxLength={15}
                      required
                    />
                  </>
                )}
              </div>

              {/* Inscrição Municipal */}
              <div className="space-y-2">
                <Label htmlFor="inscricaoMunicipal">Inscrição Municipal (IM)</Label>
                <Input
                  id="inscricaoMunicipal"
                  value={formDataFiscal.inscricaoMunicipal}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    setFormDataFiscal({ ...formDataFiscal, inscricaoMunicipal: value })
                  }}
                  placeholder="987654"
                />
              </div>

              {/* Regime Tributário */}
              <div className="space-y-2">
                <Label htmlFor="codigoRegimeTributario">Regime Tributário *</Label>
                <Select
                  value={formDataFiscal.codigoRegimeTributario}
                  onValueChange={(value) =>
                    setFormDataFiscal({ ...formDataFiscal, codigoRegimeTributario: value as '1' | '2' | '3' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Simples Nacional</SelectItem>
                    <SelectItem value="2">2 - Simples Nacional - Excesso de Sublimite</SelectItem>
                    <SelectItem value="3">3 - Regime Normal (Presumido/Real)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-secondary-text/70">
                  {getRegimeLabel(formDataFiscal.codigoRegimeTributario)}
                </p>
              </div>

            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              type="submit"
              disabled={isSaving}
              className="rounded-lg px-6 py-2 text-white text-sm font-medium flex items-center gap-2"
              sx={{
                backgroundColor: 'var(--color-secondary)',
                '&:hover': { backgroundColor: 'var(--color-alternate)' },
                '&:disabled': { backgroundColor: '#ccc', cursor: 'not-allowed' },
              }}
            >
              <MdSave size={18} />
              {isSaving ? 'Salvando...' : 'Salvar Todas as Configurações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

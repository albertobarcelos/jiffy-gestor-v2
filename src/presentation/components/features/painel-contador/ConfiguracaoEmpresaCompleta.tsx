'use client'

import React, { useEffect, useState, useRef } from 'react'
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
  
  // Código IBGE da cidade
  const [codigoCidadeIbge, setCodigoCidadeIbge] = useState<string | null>(null)
  
  // Ref para rastrear o código IBGE atual (garante valor atualizado em closures)
  const codigoCidadeIbgeRef = useRef<string | null>(null)
  
  // Ref para rastrear o último valor de cidade usado para buscar código IBGE
  const ultimaCidadeBuscada = useRef<string>('')
  
  // Função auxiliar para atualizar código IBGE (atualiza estado e ref)
  const atualizarCodigoIbge = (codigo: string | null) => {
    codigoCidadeIbgeRef.current = codigo
    setCodigoCidadeIbge(codigo)
  }

  useEffect(() => {
    if (!isRehydrated) return
    loadData()
  }, [auth, isRehydrated])

  const loadData = async () => {
    if (!isRehydrated) return

    setIsLoading(true)
    try {
      // Buscar dados da empresa do backend
      const empresaResponse = await fetch('/api/empresas/me')

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
        
        // Carregar código IBGE se cidade e estado estiverem preenchidos
        if (empresaData.endereco?.cidade && (empresaData.endereco?.estado || empresaData.endereco?.uf)) {
          const cidade = empresaData.endereco.cidade
          const estado = empresaData.endereco.estado || empresaData.endereco.uf || ''
          ultimaCidadeBuscada.current = cidade
          buscarCodigoIbge(cidade, estado)
        } else {
          atualizarCodigoIbge(null)
          ultimaCidadeBuscada.current = ''
        }
        
        // Resetar validação - o CidadeAutocomplete validará automaticamente quando receber os valores
        setCidadeValida(null)
      }

      // Buscar configuração fiscal (empresaId é extraído do JWT pelo backend)
      {
        const fiscalResponse = await fetch(
          `/api/v1/fiscal/empresas-fiscais/me`
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
      // PRIORIDADE 1: Se já temos código IBGE, significa que uma cidade foi selecionada da lista
      // e podemos confiar que o nome está correto - NÃO VALIDAR NOVAMENTE
      // Usar a ref para garantir valor atualizado mesmo em closures
      if (codigoCidadeIbgeRef.current) {
        // Cidade já foi selecionada da lista e código IBGE está disponível
        // Garantir que o nome no formulário corresponde ao nome oficial
        const nomeOficial = ultimaCidadeBuscada.current || formDataEmpresa.cidade.trim()
        if (nomeOficial !== formDataEmpresa.cidade.trim()) {
          // Atualizar com o nome oficial se diferente
          setFormDataEmpresa((prev) => ({ ...prev, cidade: nomeOficial }))
        }
        // Não precisa validar - já temos código IBGE = cidade válida
      } else if (cidadeValida === false) {
        // Cidade foi validada e é inválida
        // Usar ultimaCidadeBuscada se disponível, senão usar o valor do formulário
        const nomeCidadeParaErro = ultimaCidadeBuscada.current || formDataEmpresa.cidade.trim()
        showToast.error(
          `Cidade "${nomeCidadeParaErro}" não encontrada no estado ${formDataEmpresa.estado}. ` +
          `Por favor, selecione uma cidade válida da lista de sugestões.`
        )
        return
      } else if (cidadeValida === null) {
        // Se ainda não foi validada, validar agora antes de salvar
        // SEMPRE usar ultimaCidadeBuscada se disponível (nome oficial), senão usar o valor do formulário
        const nomeCidadeParaValidar = ultimaCidadeBuscada.current || formDataEmpresa.cidade.trim()
        
        if (!nomeCidadeParaValidar) {
          showToast.error('Por favor, informe a cidade')
          return
        }
        
        try {
          const response = await fetch(
            `/api/v1/ibge/validar-cidade?cidade=${encodeURIComponent(nomeCidadeParaValidar)}&uf=${formDataEmpresa.estado}`
          )
          if (response.ok) {
            const data = await response.json()
            if (!data.valido) {
              setCidadeValida(false)
              showToast.error(
                `Cidade "${nomeCidadeParaValidar}" não encontrada no estado ${formDataEmpresa.estado}. ` +
                `Por favor, selecione uma cidade válida da lista de sugestões.`
              )
              return
            } else {
              // Marcar como válida após validação bem-sucedida
              setCidadeValida(true)
              ultimaCidadeBuscada.current = nomeCidadeParaValidar
              // Buscar código IBGE usando o nome validado
              await buscarCodigoIbge(nomeCidadeParaValidar, formDataEmpresa.estado)
              // Atualizar formulário com o nome oficial
              setFormDataEmpresa((prev) => ({ ...prev, cidade: nomeCidadeParaValidar }))
            }
          } else {
            // Se a validação falhar (erro de rede, etc), permitir salvar (cidade já estava no banco)
            console.warn('Não foi possível validar cidade antes de salvar, mas continuando...')
            setCidadeValida(true)
            ultimaCidadeBuscada.current = nomeCidadeParaValidar
            // Tentar buscar código IBGE mesmo assim
            await buscarCodigoIbge(nomeCidadeParaValidar, formDataEmpresa.estado)
          }
        } catch (error) {
          console.error('Erro ao validar cidade:', error)
          // Se houver erro na validação, permitir salvar (cidade já estava no banco)
          setCidadeValida(true)
          ultimaCidadeBuscada.current = nomeCidadeParaValidar
          // Tentar buscar código IBGE mesmo assim
          await buscarCodigoIbge(nomeCidadeParaValidar, formDataEmpresa.estado)
        }
      } else if (cidadeValida === true && !codigoCidadeIbgeRef.current) {
        // Se já está válida mas não tem código IBGE, buscar
        const nomeCidadeParaBuscar = ultimaCidadeBuscada.current || formDataEmpresa.cidade.trim()
        if (nomeCidadeParaBuscar) {
          const encontrou = await buscarCodigoIbge(nomeCidadeParaBuscar, formDataEmpresa.estado)
          if (!encontrou) {
            console.warn('Cidade válida mas código IBGE não encontrado:', nomeCidadeParaBuscar)
          }
        }
      }
    }

    // Verificar novamente o código IBGE antes de salvar
    // Se ainda não temos código IBGE mas temos cidade e estado, tentar buscar uma última vez
    // Usar a ref para verificar o valor atual
    if (formDataEmpresa.cidade && formDataEmpresa.estado && !codigoCidadeIbgeRef.current) {
      const nomeCidadeParaBuscar = ultimaCidadeBuscada.current || formDataEmpresa.cidade.trim()
      if (nomeCidadeParaBuscar) {
        console.log('Buscando código IBGE antes de salvar:', nomeCidadeParaBuscar, formDataEmpresa.estado)
        await buscarCodigoIbge(nomeCidadeParaBuscar, formDataEmpresa.estado)
      }
    }

    console.log('Salvando com código IBGE (estado):', codigoCidadeIbge, 'Ref:', codigoCidadeIbgeRef.current, 'Cidade:', ultimaCidadeBuscada.current || formDataEmpresa.cidade)

    setIsSaving(true)
    const toastId = showToast.loading('Salvando configurações...')

    try {
      const empresaId = empresa?.id
      
      if (!empresaId) {
        showToast.error('Empresa não identificada na sessão atual')
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
          // SEMPRE usar ultimaCidadeBuscada (nome oficial) se disponível, senão usar o valor do formulário
          cidade: (ultimaCidadeBuscada.current || formDataEmpresa.cidade.trim()) || undefined,
          estado: formDataEmpresa.estado.toUpperCase() || undefined,
          // IMPORTANTE: Incluir código IBGE - usar a ref para garantir valor atualizado
          // A ref sempre terá o valor mais recente, mesmo em closures
          codigoCidadeIbge: codigoCidadeIbgeRef.current || undefined,
        },
      }

      const empresaResponse = await fetch(`/api/empresas/${empresaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
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

  // Função para buscar código IBGE da cidade
  // Retorna true se encontrou a cidade e código IBGE, false caso contrário
  const buscarCodigoIbge = async (nomeCidade: string, uf: string): Promise<boolean> => {
    if (!nomeCidade || !uf) {
      atualizarCodigoIbge(null)
      ultimaCidadeBuscada.current = ''
      return false
    }

    // Evitar buscar novamente se já foi buscado para este valor
    if (ultimaCidadeBuscada.current === nomeCidade && codigoCidadeIbgeRef.current) {
      return true
    }

    // Marcar que está buscando este valor
    ultimaCidadeBuscada.current = nomeCidade

    try {
      // Buscar lista de municípios do estado
      const response = await fetch(`/api/v1/ibge/municipios?uf=${uf}`)
      if (response.ok) {
        const data = await response.json()
        const municipios = data.municipios || []
        
        // Normalizar nome da cidade para comparação (remover acentos, converter para minúsculas)
        const normalizar = (str: string) => 
          str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        
        const cidadeNormalizada = normalizar(nomeCidade.trim())
        
        // Buscar município correspondente
        const municipio = municipios.find((m: any) => 
          normalizar(m.nomeCidade) === cidadeNormalizada
        )
        
        if (municipio && municipio.codigoCidadeIbge) {
          console.log('✅ Código IBGE encontrado na lista:', municipio.codigoCidadeIbge, 'para', nomeCidade, uf)
          atualizarCodigoIbge(municipio.codigoCidadeIbge)
          return true
        } else {
          // Se não encontrou na lista, tentar via API de validação
          const validacaoResponse = await fetch(
            `/api/v1/ibge/validar-cidade?cidade=${encodeURIComponent(nomeCidade.trim())}&uf=${uf}`
          )
          if (validacaoResponse.ok) {
            const validacaoData = await validacaoResponse.json()
            if (validacaoData.codigoCidadeIbge) {
              console.log('✅ Código IBGE encontrado via API:', validacaoData.codigoCidadeIbge, 'para', nomeCidade, uf)
              atualizarCodigoIbge(validacaoData.codigoCidadeIbge)
              return true
            } else {
              atualizarCodigoIbge(null)
              return false
            }
          } else {
            atualizarCodigoIbge(null)
            return false
          }
        }
      } else {
        atualizarCodigoIbge(null)
        return false
      }
    } catch (error) {
      console.error('Erro ao buscar código IBGE:', error)
      atualizarCodigoIbge(null)
      return false
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
    <div className="w-full px-6 pt-6 pb-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 pt-6 pb-4">
        <h2 className="text-2xl font-bold text-alternate mb-6">Configuração Completa da Empresa</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção: Dados da Empresa */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Dados da Empresa
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
                  size="small"
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
                  size="small"
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
                  size="small"
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
                  size="small"
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
                  size="small"
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
                  size="small"
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
                  size="small"
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
                  size="small"
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
                  size="small"
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
                  size="small"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado (UF) *</Label>
                <Select
                  value={formDataEmpresa.estado}
                  onValueChange={async (value) => {
                    // Limpa código IBGE ao trocar o estado
                    const cidadeAnterior = formDataEmpresa.cidade
                    atualizarCodigoIbge(null) // Limpar estado e ref
                    ultimaCidadeBuscada.current = ''
                    setCidadeValida(null)
                    
                    // Se havia uma cidade preenchida antes, tentar buscar código IBGE para o novo estado
                    // Se encontrar, manter a cidade; se não encontrar, limpar
                    if (cidadeAnterior && cidadeAnterior.trim()) {
                      // Aguardar um pouco para garantir que o estado foi atualizado
                      await new Promise(resolve => setTimeout(resolve, 100))
                      // Tentar buscar código IBGE da cidade no novo estado
                      const encontrou = await buscarCodigoIbge(cidadeAnterior.trim(), value)
                      if (encontrou) {
                        // Cidade existe no novo estado, manter ela
                        setFormDataEmpresa({ ...formDataEmpresa, estado: value })
                        setCidadeValida(true)
                      } else {
                        // Cidade não existe no novo estado, limpar
                        setFormDataEmpresa({ ...formDataEmpresa, estado: value, cidade: '' })
                      }
                    } else {
                      // Não havia cidade, apenas atualizar estado
                      setFormDataEmpresa({ ...formDataEmpresa, estado: value })
                    }
                  }}
                  required
                >
                  <SelectTrigger id="estado" className="h-10">
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

              <div className="space-y-2">
                <CidadeAutocomplete
                  value={formDataEmpresa.cidade}
                  onChange={(cidade) => {
                    // Atualizar estado quando cidade é alterada (digitada ou selecionada)
                    // IMPORTANTE: Se a cidade corresponde a ultimaCidadeBuscada, significa que
                    // foi selecionada da lista e não devemos limpar o código IBGE
                    const foiSelecionadaDaLista = ultimaCidadeBuscada.current && 
                      ultimaCidadeBuscada.current.trim().toLowerCase() === cidade.trim().toLowerCase()
                    
                    console.log('onChange chamado:', cidade, 'foiSelecionadaDaLista:', foiSelecionadaDaLista, 'codigoCidadeIbge atual:', codigoCidadeIbge)
                    
                    setFormDataEmpresa({ ...formDataEmpresa, cidade })
                    
                    // Se a cidade foi apenas digitada (não selecionada da lista) ou foi limpa,
                    // limpar código IBGE para forçar busca quando for validada/selecionada
                    if (!cidade) {
                      // Campo foi limpo
                      console.log('Campo limpo, removendo código IBGE')
                      atualizarCodigoIbge(null)
                      ultimaCidadeBuscada.current = ''
                    } else if (!foiSelecionadaDaLista && cidade.trim().toLowerCase() !== ultimaCidadeBuscada.current?.trim().toLowerCase()) {
                      // Se o usuário está digitando algo diferente do nome oficial,
                      // E não temos código IBGE ainda (ou seja, não foi selecionado da lista),
                      // limpar código IBGE (será buscado novamente quando validar/selecionar)
                      // IMPORTANTE: Só limpar se NÃO temos código IBGE, porque se temos,
                      // significa que uma cidade foi selecionada e o onChange está apenas
                      // atualizando o campo após a seleção
                      if (!codigoCidadeIbge) {
                        console.log('Usuário digitando cidade diferente, mas sem código IBGE - não limpar')
                        // Não limpar - pode ser que o usuário esteja apenas editando
                      }
                      // Mas NÃO limpar ultimaCidadeBuscada ainda - pode ser que o usuário
                      // esteja apenas editando e depois vai selecionar da lista
                    } else if (foiSelecionadaDaLista) {
                      // Cidade foi selecionada da lista - manter código IBGE
                      console.log('Cidade corresponde à selecionada da lista - mantendo código IBGE')
                    }
                  }}
                  estado={formDataEmpresa.estado}
                  label="Cidade"
                  placeholder="Digite o nome da cidade"
                  required={false}
                  disabled={!formDataEmpresa.estado}
                  onCidadeSelecionada={(nomeCidade, codigoIbge) => {
                    // Quando uma cidade é selecionada da lista, armazenar código IBGE imediatamente
                    // e garantir que o estado do formulário seja atualizado com o nome oficial
                    // IMPORTANTE: Isso acontece ANTES de qualquer validação, garantindo que
                    // o nome oficial seja usado em todas as validações subsequentes
                    console.log('✅ Cidade selecionada da lista:', nomeCidade, 'Código IBGE:', codigoIbge)
                    atualizarCodigoIbge(codigoIbge)
                    ultimaCidadeBuscada.current = nomeCidade
                    setCidadeValida(true)
                    // Atualizar o estado do formulário com o nome oficial da cidade selecionada
                    // Isso garante que formDataEmpresa.cidade tenha o valor correto IMEDIATAMENTE
                    setFormDataEmpresa((prev) => ({ ...prev, cidade: nomeCidade }))
                  }}
                  onValidationChange={async (isValid) => {
                    // IMPORTANTE: Se já temos código IBGE, significa que uma cidade foi selecionada
                    // da lista e não devemos fazer nada aqui (já foi tratado em onCidadeSelecionada)
                    if (codigoCidadeIbgeRef.current) {
                      // Cidade já foi selecionada da lista, não fazer nada
                      return
                    }
                    
                    setCidadeValida(isValid)
                    // Se validou como true e não tem código IBGE ainda, buscar
                    // Isso cobre o caso de validação via API (quando usuário digita e perde foco)
                    // Mas usar ultimaCidadeBuscada se disponível (nome oficial)
                    if (isValid && formDataEmpresa.estado) {
                      const nomeCidadeParaBuscar = ultimaCidadeBuscada.current || formDataEmpresa.cidade?.trim()
                      if (nomeCidadeParaBuscar) {
                        await buscarCodigoIbge(nomeCidadeParaBuscar, formDataEmpresa.estado)
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Seção: Dados Fiscais */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Dados Fiscais
            </h3>
            
            {/* Checkbox isento — fora do grid para ocupar largura total */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isento"
                checked={formDataFiscal.isento}
                onChange={(e) => {
                  setFormDataFiscal({
                    ...formDataFiscal,
                    isento: e.target.checked,
                    inscricaoEstadual: '',
                  })
                }}
                className="rounded"
              />
              <Label htmlFor="isento" className="cursor-pointer">
                Empresa isenta de Inscrição Estadual
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Inscrição Estadual — sempre visível, desabilitado quando isento */}
              <div className="space-y-2">
                <Label htmlFor="inscricaoEstadual">
                  Inscrição Estadual (IE){!formDataFiscal.isento && ' *'}
                </Label>
                <Input
                  id="inscricaoEstadual"
                  value={formDataFiscal.inscricaoEstadual}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    setFormDataFiscal({ ...formDataFiscal, inscricaoEstadual: value })
                  }}
                  placeholder={formDataFiscal.isento ? 'Isento de IE' : '123456789012'}
                  inputProps={{ maxLength: 15 }}
                  disabled={formDataFiscal.isento}
                  required={!formDataFiscal.isento}
                  size="small"
                />
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
                  size="small"
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
                  <SelectTrigger className="h-10">
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
          <div className="flex justify-end py-4 border-t">
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

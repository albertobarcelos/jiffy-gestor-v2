'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { Label } from '@/src/presentation/components/ui/label'
import { MenuItem } from '@mui/material'
import { MdCheckCircle, MdError, MdSave } from 'react-icons/md'
import { CidadeAutocomplete } from '@/src/presentation/components/ui/cidade-autocomplete'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

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

/** Labels outlined — alinhado a EmpresaTab / NovoMeioPagamento */
const sxOutlinedLabelTextoEscuro = {
  '& .MuiInputLabel-root': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiFormLabel-asterisk': {
    color: 'var(--color-error)',
  },
} as const

const entradaCompactaInput = {
  padding: '12px 10px',
  fontSize: '0.875rem',
} as const

const entradaCompactaSelect = {
  padding: '12px 10px',
  fontSize: '0.875rem',
  minHeight: '1.5em',
  lineHeight: 1.4,
  display: 'flex',
  alignItems: 'center',
} as const

const sxEntradaConfig = {
  ...sxOutlinedLabelTextoEscuro,
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#fff',
    borderRadius: '8px',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0, 0, 0, 0.23)',
  },
  '& .MuiOutlinedInput-input': entradaCompactaInput,
  '& .MuiOutlinedInput-input.Mui-disabled': {
    WebkitTextFillColor: 'var(--color-primary-text)',
    opacity: 0.85,
  },
  '& .MuiSelect-select': entradaCompactaSelect,
} as const

/** Maiúsculas em campos de texto (exceto e-mail). */
const maiusculasPt = (valor: string) => valor.toLocaleUpperCase('pt-BR')

// Siglas dos estados brasileiros em ordem alfabética (rótulos em maiúsculas — mesmo padrão EmpresaTab)
const ESTADOS_BRASILEIROS = [
  { sigla: 'AC', nome: 'ACRE' },
  { sigla: 'AL', nome: 'ALAGOAS' },
  { sigla: 'AP', nome: 'AMAPÁ' },
  { sigla: 'AM', nome: 'AMAZONAS' },
  { sigla: 'BA', nome: 'BAHIA' },
  { sigla: 'CE', nome: 'CEARÁ' },
  { sigla: 'DF', nome: 'DISTRITO FEDERAL' },
  { sigla: 'ES', nome: 'ESPÍRITO SANTO' },
  { sigla: 'GO', nome: 'GOIÁS' },
  { sigla: 'MA', nome: 'MARANHÃO' },
  { sigla: 'MT', nome: 'MATO GROSSO' },
  { sigla: 'MS', nome: 'MATO GROSSO DO SUL' },
  { sigla: 'MG', nome: 'MINAS GERAIS' },
  { sigla: 'PA', nome: 'PARÁ' },
  { sigla: 'PB', nome: 'PARAÍBA' },
  { sigla: 'PR', nome: 'PARANÁ' },
  { sigla: 'PE', nome: 'PERNAMBUCO' },
  { sigla: 'PI', nome: 'PIAUÍ' },
  { sigla: 'RJ', nome: 'RIO DE JANEIRO' },
  { sigla: 'RN', nome: 'RIO GRANDE DO NORTE' },
  { sigla: 'RS', nome: 'RIO GRANDE DO SUL' },
  { sigla: 'RO', nome: 'RONDÔNIA' },
  { sigla: 'RR', nome: 'RORAIMA' },
  { sigla: 'SC', nome: 'SANTA CATARINA' },
  { sigla: 'SP', nome: 'SÃO PAULO' },
  { sigla: 'SE', nome: 'SERGIPE' },
  { sigla: 'TO', nome: 'TOCANTINS' },
]

/**
 * Converte UF vinda da API para sigla existente no Select.
 * Evita `value` inválido no select de UF (opções só com sigla de 2 letras).
 */
function normalizarSiglaUf(raw: string | undefined | null): string {
  if (raw == null) return ''
  const t = String(raw).trim()
  if (!t) return ''
  const sigla = t.toUpperCase()
  if (ESTADOS_BRASILEIROS.some((e) => e.sigla === sigla)) {
    return sigla
  }
  const porNome = ESTADOS_BRASILEIROS.find(
    (e) => e.nome.localeCompare(t, 'pt-BR', { sensitivity: 'accent' }) === 0
  )
  return porNome?.sigla ?? ''
}

/** Máscara CNPJ 00.000.000/0000-00 a partir de qualquer string (só dígitos contam) */
function formatarCnpjMascara(valor: string): string {
  const n = valor.replace(/\D/g, '').slice(0, 14)
  if (n.length <= 2) return n
  if (n.length <= 5) return `${n.slice(0, 2)}.${n.slice(2)}`
  if (n.length <= 8) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5)}`
  if (n.length <= 12) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8)}`
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`
}

/** Máscara telefone BR: (00) 0000-0000 ou (00) 00000-0000 (máx. 11 dígitos) */
function formatarTelefoneMascara(valor: string): string {
  const n = valor.replace(/\D/g, '').slice(0, 11)
  if (n.length === 0) return ''
  if (n.length === 1) return `(${n}`
  if (n.length === 2) return `(${n})`
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
}

/** Máscara CEP 00000-000 (8 dígitos) */
function formatarCepMascara(valor: string): string {
  const n = valor.replace(/\D/g, '').slice(0, 8)
  if (n.length <= 5) return n
  return `${n.slice(0, 5)}-${n.slice(5)}`
}

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
          cnpj: formatarCnpjMascara(empresaData.cnpj || ''),
          razaoSocial: maiusculasPt(
            String(empresaData.razaoSocial || empresaData.nome || '')
          ),
          nomeFantasia: maiusculasPt(String(empresaData.nomeFantasia || '')),
          email: empresaData.email || '',
          telefone: formatarTelefoneMascara(empresaData.telefone || ''),
          cep: formatarCepMascara(empresaData.endereco?.cep || ''),
          rua: maiusculasPt(
            String(empresaData.endereco?.rua || empresaData.endereco?.logradouro || '')
          ),
          numero: maiusculasPt(String(empresaData.endereco?.numero || '')),
          complemento: maiusculasPt(String(empresaData.endereco?.complemento || '')),
          bairro: maiusculasPt(String(empresaData.endereco?.bairro || '')),
          cidade: maiusculasPt(String(empresaData.endereco?.cidade || '')),
          estado: normalizarSiglaUf(
            empresaData.endereco?.estado || empresaData.endereco?.uf || ''
          ),
        })
        
        // Carregar código IBGE se cidade e UF estiverem preenchidos (UF já normalizada acima)
        const ufParaIbge = normalizarSiglaUf(
          empresaData.endereco?.estado || empresaData.endereco?.uf || ''
        )
        if (empresaData.endereco?.cidade && ufParaIbge) {
          const cidade = maiusculasPt(String(empresaData.endereco.cidade))
          ultimaCidadeBuscada.current = cidade
          buscarCodigoIbge(cidade, ufParaIbge)
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
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="w-full md:p-6 p-2">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 pt-6 pb-4">
        <h2 className="text-2xl font-semibold text-alternate mb-6">Configuração Completa da Empresa</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção: Dados da Empresa */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Dados da Empresa
            </h3>
            
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                label="CNPJ"
                inputProps={{ inputMode: 'numeric', autoComplete: 'off' }}
                value={formDataEmpresa.cnpj}
                onChange={e => {
                  const mascarado = formatarCnpjMascara(e.target.value)
                  setFormDataEmpresa(prev => ({ ...prev, cnpj: mascarado }))
                }}
                placeholder="00.000.000/0000-00"
                required
                size="small"
                sx={sxEntradaConfig}
                InputLabelProps={{ required: true }}
              />

              <Input
                label="Razão Social"
                value={formDataEmpresa.razaoSocial}
                onChange={e =>
                  setFormDataEmpresa(prev => ({
                    ...prev,
                    razaoSocial: maiusculasPt(e.target.value),
                  }))
                }
                placeholder="Nome da empresa"
                required
                size="small"
                sx={sxEntradaConfig}
                InputLabelProps={{ required: true }}
              />

              <Input
                label="Nome Fantasia"
                value={formDataEmpresa.nomeFantasia}
                onChange={e =>
                  setFormDataEmpresa(prev => ({
                    ...prev,
                    nomeFantasia: maiusculasPt(e.target.value),
                  }))
                }
                placeholder="Nome fantasia"
                size="small"
                sx={sxEntradaConfig}
              />

              <Input
                type="email"
                label="E-mail"
                value={formDataEmpresa.email}
                onChange={e =>
                  setFormDataEmpresa(prev => ({ ...prev, email: e.target.value }))
                }
                placeholder="email@empresa.com"
                size="small"
                sx={sxEntradaConfig}
              />

              <Input
                label="Telefone"
                inputProps={{ inputMode: 'numeric', autoComplete: 'tel' }}
                value={formDataEmpresa.telefone}
                onChange={e => {
                  const raw = e.target.value
                  const newDigits = raw.replace(/\D/g, '').slice(0, 11)
                  setFormDataEmpresa(prev => {
                    const prevMasked = prev.telefone
                    const prevDigits = prevMasked.replace(/\D/g, '')
                    const apagouPontuacaoNoFim =
                      raw.length < prevMasked.length &&
                      newDigits === prevDigits &&
                      prevDigits.length > 0 &&
                      raw === prevMasked.slice(0, raw.length)
                    if (apagouPontuacaoNoFim) {
                      return {
                        ...prev,
                        telefone: formatarTelefoneMascara(prevDigits.slice(0, -1)),
                      }
                    }
                    return { ...prev, telefone: formatarTelefoneMascara(newDigits) }
                  })
                }}
                placeholder="(00) 00000-0000"
                size="small"
                sx={sxEntradaConfig}
              />
            </div>
          </div>

          {/* Seção: Endereço */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Endereço
            </h3>
            
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
              <Input
                label="CEP"
                inputProps={{ inputMode: 'numeric', autoComplete: 'postal-code' }}
                value={formDataEmpresa.cep}
                onChange={e => {
                  const mascarado = formatarCepMascara(e.target.value)
                  setFormDataEmpresa(prev => ({ ...prev, cep: mascarado }))
                }}
                placeholder="00000-000"
                size="small"
                sx={sxEntradaConfig}
              />

              <div className="md:col-span-2">
                <Input
                  label="Rua"
                  value={formDataEmpresa.rua}
                  onChange={e =>
                    setFormDataEmpresa(prev => ({
                      ...prev,
                      rua: maiusculasPt(e.target.value),
                    }))
                  }
                  placeholder="Nome da rua"
                  size="small"
                  sx={sxEntradaConfig}
                />
              </div>

              <Input
                label="Número"
                value={formDataEmpresa.numero}
                onChange={e =>
                  setFormDataEmpresa(prev => ({
                    ...prev,
                    numero: maiusculasPt(e.target.value),
                  }))
                }
                placeholder="123"
                size="small"
                sx={sxEntradaConfig}
              />

              <Input
                label="Complemento"
                value={formDataEmpresa.complemento}
                onChange={e =>
                  setFormDataEmpresa(prev => ({
                    ...prev,
                    complemento: maiusculasPt(e.target.value),
                  }))
                }
                placeholder="Apto, Sala, etc."
                size="small"
                sx={sxEntradaConfig}
              />

              <Input
                label="Bairro"
                value={formDataEmpresa.bairro}
                onChange={e =>
                  setFormDataEmpresa(prev => ({
                    ...prev,
                    bairro: maiusculasPt(e.target.value),
                  }))
                }
                placeholder="Nome do bairro"
                size="small"
                sx={sxEntradaConfig}
              />

              <Input
                select
                label="Estado (UF)"
                value={formDataEmpresa.estado}
                onChange={async e => {
                  const value = e.target.value
                  const cidadeAnterior = formDataEmpresa.cidade
                  atualizarCodigoIbge(null)
                  ultimaCidadeBuscada.current = ''
                  setCidadeValida(null)

                  if (cidadeAnterior && cidadeAnterior.trim()) {
                    await new Promise(resolve => setTimeout(resolve, 100))
                    const encontrou = await buscarCodigoIbge(cidadeAnterior.trim(), value)
                    if (encontrou) {
                      setFormDataEmpresa(prev => ({ ...prev, estado: value }))
                      setCidadeValida(true)
                    } else {
                      setFormDataEmpresa(prev => ({
                        ...prev,
                        estado: value,
                        cidade: '',
                      }))
                    }
                  } else {
                    setFormDataEmpresa(prev => ({ ...prev, estado: value }))
                  }
                }}
                required
                size="small"
                sx={sxEntradaConfig}
                InputLabelProps={{ required: true, shrink: true }}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="">
                  <em>Selecione o estado</em>
                </MenuItem>
                {ESTADOS_BRASILEIROS.map(est => (
                  <MenuItem key={est.sigla} value={est.sigla}>
                    {est.sigla} - {est.nome}
                  </MenuItem>
                ))}
              </Input>

              {/* Uma coluna — mesma largura de Número / Complemento / Bairro; terceira coluna fica vazia */}
              <div className="min-w-0">
                <CidadeAutocomplete
                  value={formDataEmpresa.cidade}
                  sx={sxEntradaConfig}
                  onChange={cidade => {
                    const cidadeFmt = maiusculasPt(cidade)
                    const foiSelecionadaDaLista =
                      ultimaCidadeBuscada.current &&
                      ultimaCidadeBuscada.current.trim().toLowerCase() ===
                        cidadeFmt.trim().toLowerCase()

                    console.log('onChange chamado:', cidadeFmt, 'foiSelecionadaDaLista:', foiSelecionadaDaLista, 'codigoCidadeIbge atual:', codigoCidadeIbge)

                    setFormDataEmpresa(prev => ({ ...prev, cidade: cidadeFmt }))
                    
                    // Se a cidade foi apenas digitada (não selecionada da lista) ou foi limpa,
                    // limpar código IBGE para forçar busca quando for validada/selecionada
                    if (!cidadeFmt) {
                      // Campo foi limpo
                      console.log('Campo limpo, removendo código IBGE')
                      atualizarCodigoIbge(null)
                      ultimaCidadeBuscada.current = ''
                    } else if (!foiSelecionadaDaLista && cidadeFmt.trim().toLowerCase() !== ultimaCidadeBuscada.current?.trim().toLowerCase()) {
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
                    setFormDataEmpresa(prev => ({
                      ...prev,
                      cidade: maiusculasPt(nomeCidade),
                    }))
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

              {/* Coluna 3 intencionalmente vazia no desktop (grid 3 colunas) */}
              <div className="hidden min-h-0 md:block" aria-hidden />
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

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              <Input
                label="Inscrição Estadual (IE)"
                value={formDataFiscal.inscricaoEstadual}
                onChange={e => {
                  const value = e.target.value.replace(/\D/g, '')
                  setFormDataFiscal(prev => ({ ...prev, inscricaoEstadual: value }))
                }}
                placeholder={formDataFiscal.isento ? 'Isento de IE' : '123456789012'}
                inputProps={{ maxLength: 15 }}
                disabled={formDataFiscal.isento}
                required={!formDataFiscal.isento}
                size="small"
                sx={sxEntradaConfig}
                InputLabelProps={{
                  required: !formDataFiscal.isento,
                  shrink: true,
                }}
              />

              <Input
                label="Inscrição Municipal (IM)"
                value={formDataFiscal.inscricaoMunicipal}
                onChange={e => {
                  const value = e.target.value.replace(/\D/g, '')
                  setFormDataFiscal(prev => ({ ...prev, inscricaoMunicipal: value }))
                }}
                placeholder="987654"
                size="small"
                sx={sxEntradaConfig}
              />

              <div className="md:col-span-2">
                <Input
                  select
                  label="Regime Tributário"
                  value={formDataFiscal.codigoRegimeTributario}
                  onChange={e =>
                    setFormDataFiscal(prev => ({
                      ...prev,
                      codigoRegimeTributario: e.target.value as '1' | '2' | '3',
                    }))
                  }
                  required
                  size="small"
                  sx={sxEntradaConfig}
                  InputLabelProps={{ required: true, shrink: true }}
                  SelectProps={{ displayEmpty: false }}
                >
                  <MenuItem value="1">1 - SIMPLES NACIONAL</MenuItem>
                  <MenuItem value="2">
                    2 - SIMPLES NACIONAL — EXCESSO DE SUBLIMITE
                  </MenuItem>
                  <MenuItem value="3">
                    3 - REGIME NORMAL (PRESUMIDO / REAL)
                  </MenuItem>
                </Input>
                <p className="mt-1 text-xs text-secondary-text/70">
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

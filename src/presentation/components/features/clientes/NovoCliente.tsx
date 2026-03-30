'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Cliente } from '@/src/domain/entities/Cliente'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/presentation/components/ui/select'
import { CidadeAutocomplete } from '@/src/presentation/components/ui/cidade-autocomplete'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { MdSearch, MdClear, MdPerson, MdLocationOn } from 'react-icons/md'

interface NovoClienteProps {
  clienteId?: string
  isEmbedded?: boolean
  onClose?: () => void
  onSaved?: () => void
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

/**
 * Componente para criar/editar cliente
 * Replica o design e funcionalidades do Flutter
 */
export function NovoCliente({
  clienteId,
  isEmbedded = false,
  onClose,
  onSaved,
}: NovoClienteProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const isEditing = !!clienteId

  // Estados do formulário
  const [nome, setNome] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cpf, setCpf] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [incluirEndereco, setIncluirEndereco] = useState(false)

  // Endereço
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [cep, setCep] = useState('')
  const [complemento, setComplemento] = useState('')
  const [cidadeValida, setCidadeValida] = useState<boolean | null>(null)
  const [codigoCidadeIbge, setCodigoCidadeIbge] = useState<string>('')
  const [codigoEstadoIbge, setCodigoEstadoIbge] = useState<string>('')

  // Estados de loading
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCliente, setIsLoadingCliente] = useState(false)
  const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false)
  const [isLoadingCEP, setIsLoadingCEP] = useState(false)
  const hasLoadedClienteRef = useRef(false)

  // Carregar dados do cliente se estiver editando
  useEffect(() => {
    if (!isEditing || hasLoadedClienteRef.current) return

    const loadCliente = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingCliente(true)
      hasLoadedClienteRef.current = true

      try {
        const response = await fetch(`/api/clientes/${clienteId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          
          console.log('📥 Dados recebidos da API ao carregar cliente:', {
            clienteId,
            cpfNaResposta: data.cpf,
            cnpjNaResposta: data.cnpj,
            dataCompleta: JSON.stringify(data, null, 2),
          })
          
          const cliente = Cliente.fromJSON(data)
          
          console.log('📥 Dados após fromJSON:', {
            cpfDaEntidade: cliente.getCpf(),
            cnpjDaEntidade: cliente.getCnpj(),
            clienteJSON: cliente.toJSON(),
          })

          setNome(cliente.getNome())
          setRazaoSocial(cliente.getRazaoSocial() || '')
          
          // Formata CPF e CNPJ ao carregar
          const cpfValue = cliente.getCpf() || ''
          const cnpjValue = cliente.getCnpj() || ''
          
          console.log('📥 Valores antes de formatar:', {
            cpfValue,
            cnpjValue,
            cpfFormatado: cpfValue ? formatCPF(cpfValue) : '',
            cnpjFormatado: cnpjValue ? formatCNPJ(cnpjValue) : '',
          })
          
          setCpf(cpfValue ? formatCPF(cpfValue) : '')
          setCnpj(cnpjValue ? formatCNPJ(cnpjValue) : '')
          
          // Formata telefone ao carregar
          const telefoneValue = cliente.getTelefone() || ''
          setTelefone(telefoneValue ? formatTelefone(telefoneValue) : '')
          
          setEmail(cliente.getEmail() || '')
          setNomeFantasia(cliente.getNomeFantasia() || '')
          setAtivo(cliente.isAtivo())
          
          // Formata CEP e endereço ao carregar
          const endereco = cliente.getEndereco()
          if (endereco) {
            // Preenche os campos de endereço
            setRua(endereco.rua || '')
            setNumero(endereco.numero || '')
            setBairro(endereco.bairro || '')
            setCidade(endereco.cidade || '')
            const estadoValue = endereco.estado || ''
            setEstado(estadoValue)
            const cepValue = endereco.cep || ''
            setCep(cepValue ? formatCEP(cepValue) : '')
            setComplemento(endereco.complemento || '')
            
            // Carrega códigos IBGE se disponíveis
            if (endereco.codigoCidadeIbge) {
              setCodigoCidadeIbge(endereco.codigoCidadeIbge)
            }
            if (endereco.codigoEstadoIbge) {
              setCodigoEstadoIbge(endereco.codigoEstadoIbge)
            } else if (estadoValue) {
              // Se não tiver código do estado, busca pelo mapeamento
              setCodigoEstadoIbge(getCodigoEstadoIbge(estadoValue))
            }
            
            // Verifica se há algum campo de endereço preenchido
            const temEnderecoPreenchido = !!(
              endereco.rua?.trim() ||
              endereco.numero?.trim() ||
              endereco.bairro?.trim() ||
              endereco.cidade?.trim() ||
              endereco.estado?.trim() ||
              endereco.cep?.trim() ||
              endereco.complemento?.trim()
            )
            
            // Só ativa o switch se houver algum campo preenchido
            setIncluirEndereco(temEnderecoPreenchido)
          } else {
            // Se não houver endereço, garante que o switch está desativado
            setIncluirEndereco(false)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar cliente:', error)
      } finally {
        setIsLoadingCliente(false)
      }
    }

    loadCliente()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, clienteId])

  // Funções de máscara
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    return value
  }

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 14) {
      return numbers.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        '$1.$2.$3/$4-$5'
      )
    }
    return value
  }

  const formatTelefone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      if (numbers.length <= 10) {
        return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
      }
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    return value
  }

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 8) {
      return numbers.replace(/(\d{5})(\d{3})/, '$1-$2')
    }
    return value
  }

  /**
   * Mapeamento de siglas de estados para códigos IBGE
   * Fonte: https://www.ibge.gov.br/explica/codigos-dos-municipios.php
   */
  const getCodigoEstadoIbge = (uf: string): string => {
    const codigos: Record<string, string> = {
      'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29',
      'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
      'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25',
      'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24',
      'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35',
      'SE': '28', 'TO': '17'
    }
    return codigos[uf] || ''
  }

  /**
   * Handler para mudança de estado - busca código IBGE do estado
   */
  const handleEstadoChange = (newEstado: string) => {
    setEstado(newEstado)
    if (newEstado) {
      setCodigoEstadoIbge(getCodigoEstadoIbge(newEstado))
    } else {
      setCodigoEstadoIbge('')
    }
    // Limpa código da cidade quando muda o estado
    setCodigoCidadeIbge('')
  }

  /**
   * Busca dados do CNPJ em API pública (ReceitaWS)
   * Usa rota API do Next.js para evitar problemas de CORS
   */
  const handleBuscarCNPJ = async () => {
    const rawCNPJ = cnpj.replace(/\D/g, '')
    
    if (rawCNPJ.length !== 14) {
      showToast.warning('CNPJ inválido ou incompleto. Deve conter 14 dígitos.')
      return
    }

    setIsLoadingCNPJ(true)

    try {
      // Usa rota API do Next.js para fazer a requisição pelo servidor
      const response = await fetch(`/api/consulta-cnpj?cnpj=${rawCNPJ}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || 'Erro ao buscar CNPJ'
        
        if (response.status === 400 || response.status === 404) {
          showToast.warning('CNPJ inválido ou não encontrado. Verifique o número digitado.')
        } else if (response.status === 408) {
          showToast.warning('Timeout ao buscar CNPJ. Tente novamente.')
        } else {
          showToast.error('Ocorreu um erro ao buscar o CNPJ. Tente novamente mais tarde.')
        }
        return
      }

      const data = await response.json()

      // Preenche APENAS os dados pessoais (não preenche endereço)
      if (data.razaoSocial) {
        setRazaoSocial(data.razaoSocial)
      }
      if (data.nomeFantasia) {
        setNomeFantasia(data.nomeFantasia)
      }
      if (data.email) {
        setEmail(data.email)
      }

      showToast.success('Dados do CNPJ carregados com sucesso!')
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error)
      showToast.error('Ocorreu um erro ao buscar o CNPJ. Tente novamente mais tarde.')
    } finally {
      setIsLoadingCNPJ(false)
    }
  }

  /**
   * Limpa o campo CNPJ
   */
  const handleClearCNPJ = () => {
    setCnpj('')
  }

  /**
   * Busca dados do CEP em API pública (ViaCEP)
   */
  const handleBuscarCEP = async () => {
    const rawCEP = cep.replace(/\D/g, '')
    
    if (rawCEP.length !== 8) {
      showToast.warning('CEP inválido. Deve conter 8 dígitos.')
      return
    }

    setIsLoadingCEP(true)

    // Limpa campos de endereço antes de buscar
    setRua('')
    setNumero('')
    setBairro('')
    setComplemento('')
    setCidade('')
    setEstado('')
    setCodigoCidadeIbge('')
    setCodigoEstadoIbge('')

    try {
      // API ViaCEP - gratuita e pública
      const response = await fetch(`https://viacep.com.br/ws/${rawCEP}/json/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 400 || response.status === 404) {
          showToast.warning('Formato de CEP inválido. O CEP deve conter 8 dígitos.')
        } else {
          showToast.error('Ocorreu um erro ao buscar o CEP. Verifique o número digitado.')
        }
        return
      }

      const data = await response.json()

      // Verifica se a API retornou erro
      if (data.erro === true) {
        showToast.warning('CEP não encontrado. Verifique o número digitado e tente novamente.')
        return
      }

      // Preenche os campos de endereço automaticamente
      if (data.logradouro) {
        setRua(data.logradouro)
      }
      if (data.bairro) {
        setBairro(data.bairro)
      }
      if (data.complemento) {
        setComplemento(data.complemento)
      }
      if (data.localidade) {
        setCidade(data.localidade)
      }
      if (data.uf) {
        const ufUpper = data.uf.toUpperCase()
        setEstado(ufUpper)
        setCodigoEstadoIbge(getCodigoEstadoIbge(ufUpper))
      }

      // Garante que o endereço está incluído
      if (!incluirEndereco) {
        setIncluirEndereco(true)
      }

      showToast.success('Endereço encontrado com sucesso!')
    } catch (error) {
      console.error('Erro ao buscar CEP:', error)
      showToast.error('Ocorreu um erro ao buscar o CEP. Verifique o número digitado.')
    } finally {
      setIsLoadingCEP(false)
    }
  }

  /**
   * Limpa o campo CEP
   */
  const handleClearCEP = () => {
    setCep('')
  }

  /**
   * Limpa todos os campos de endereço
   */
  const handleLimparEndereco = () => {
    setRua('')
    setNumero('')
    setBairro('')
    setCidade('')
    setEstado('')
    setCep('')
    setComplemento('')
    setCidadeValida(null)
    setCodigoCidadeIbge('')
    setCodigoEstadoIbge('')
  }

  /**
   * Handler para mudança do switch "Incluir Endereço"
   * Limpa os campos quando o switch é desativado
   */
  const handleToggleEndereco = (checked: boolean) => {
    setIncluirEndereco(checked)
    if (!checked) {
      // Limpa os campos quando desativar o switch
      handleLimparEndereco()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    const cpfLimpo = cpf.replace(/\D/g, '')
    const cnpjLimpo = cnpj.replace(/\D/g, '')

    const telefoneLimpo = telefone.replace(/\D/g, '')
    // API externa exige DDD + número completo (10 fixo ou 11 celular no Brasil)
    if (telefoneLimpo.length > 0 && telefoneLimpo.length !== 10 && telefoneLimpo.length !== 11) {
      showToast.error(
        'Telefone com DDD deve ter 10 dígitos (fixo) ou 11 (celular). Verifique o número digitado.'
      )
      return
    }

    // Validar cidade antes de salvar
    if (cidade && estado) {
      if (cidadeValida === false) {
        showToast.error(
          `Cidade "${cidade}" não encontrada no estado ${estado}. Por favor, selecione uma cidade válida da lista de sugestões.`
        )
        return
      }

      // Se ainda não foi validada, validar agora
      if (cidadeValida === null) {
        try {
          const response = await fetch(
            `/api/v1/ibge/validar-cidade?cidade=${encodeURIComponent(cidade)}&uf=${estado}`
          )
          if (response.ok) {
            const data = await response.json()
            if (!data.valido) {
              showToast.error(
                `Cidade "${cidade}" não encontrada no estado ${estado}. Por favor, selecione uma cidade válida da lista de sugestões.`
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

    setIsLoading(true)

    try {
      const cepLimpo = cep.replace(/\D/g, '')

      const body: any = {
        nome,
        razaoSocial: razaoSocial || undefined,
        email: email || undefined,
        nomeFantasia: nomeFantasia || undefined,
        ativo,
      }

      // CPF e CNPJ: na edição envia o que estiver no formulário (ambos se preenchidos); string vazia limpa no backend
      if (isEditing) {
        body.cpf = cpfLimpo || ''
        body.cnpj = cnpjLimpo || ''

        // Telefone: null limpa na API externa (string vazia aciona validação de 11 dígitos)
        body.telefone = telefoneLimpo ? telefoneLimpo : null
      } else {
        if (cpfLimpo) body.cpf = cpfLimpo
        if (cnpjLimpo) body.cnpj = cnpjLimpo
        if (telefoneLimpo) body.telefone = telefoneLimpo
      }

      // Tratamento do endereço
      if (incluirEndereco) {
        // Se o switch estiver ativado, envia os dados do endereço
        body.endereco = {
          rua: rua || undefined,
          numero: numero || undefined,
          bairro: bairro || undefined,
          cidade: cidade || undefined,
          estado: estado || undefined,
          cep: cepLimpo || undefined,
          complemento: complemento || undefined,
          codigoCidadeIbge: codigoCidadeIbge || undefined,
          codigoEstadoIbge: codigoEstadoIbge || undefined,
        }
      }
      // Se o switch estiver desativado, não envia o campo endereco

      console.log('📤 Dados sendo enviados do componente:', {
        modo: isEditing ? 'edição' : 'criação',
        clienteId: clienteId || 'novo',
        cpfOriginal: cpf,
        cpfLimpo: cpfLimpo,
        cpfLimpoLength: cpfLimpo.length,
        cpfEnviado: body.cpf,
        cpfEnviadoType: typeof body.cpf,
        cpfEnviadoInBody: 'cpf' in body,
        cnpjOriginal: cnpj,
        cnpjLimpo: cnpjLimpo,
        cnpjEnviado: body.cnpj,
        incluirEndereco,
        enderecoEnviado: body.endereco,
        bodyCompleto: JSON.stringify(body, null, 2),
      })

      const url = isEditing
        ? `/api/clientes/${clienteId}`
        : '/api/clientes'
      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const result: { error?: string; message?: string } = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        const msgErro =
          (typeof result.error === 'string' && result.error.trim()) ||
          (typeof result.message === 'string' && result.message.trim()) ||
          'Erro ao salvar cliente'
        throw new Error(msgErro)
      }

      showToast.success(isEditing ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!')

      // API pode retornar aviso informativo no corpo (ex.: prioridade CPF ao enviar CPF + CNPJ)
      const mensagemApi =
        typeof result.message === 'string' ? result.message.trim() : ''

      // Debug: conferir se `message` veio na resposta (toasts podem sobrepor no tempo)
      console.debug('[NovoCliente] salvar cliente — campo message da API', {
        'result.message': result.message,
        mensagemApiAposTrim: mensagemApi || '(vazia — sem toast info)',
        chavesNoBody: Object.keys(result),
      })

      if (mensagemApi) {
        showToast.info(mensagemApi)
      }
      
      if (onSaved) {
        onSaved()
      } else {
        router.push('/cadastros/clientes')
      }
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      const mensagem =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Erro ao salvar cliente'
      // Remove prefixo do repositório para o toast mostrar só o texto da API quando existir
      const textoToast = mensagem
        .replace(/^Erro ao (atualizar|criar) cliente:\s*/i, '')
        .trim()
      showToast.error(textoToast || mensagem)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (isEmbedded) {
      onClose?.()
    } else {
      if (confirm('Tem certeza que deseja cancelar?')) {
        router.push('/cadastros/clientes')
      }
    }
  }

  if (isLoadingCliente) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <JiffyLoading />
      </div>
    )
  }

  // Aviso de UX: CPF e CNPJ não devem ser preenchidos juntos (validação definitiva no backend)
  const cpfSoDigitos = cpf.replace(/\D/g, '')
  const cnpjSoDigitos = cnpj.replace(/\D/g, '')
  const exibeAvisoCpfECnpjPreenchidos =
    cpfSoDigitos.length > 0 && cnpjSoDigitos.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-primary-bg rounded-tl-[30px] shadow-md md:px-[30px] px-1 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                nome
                  ? 'bg-primary/25 text-primary'
                  : 'bg-secondary-text/10 text-secondary-text'
              }`}
            >
              <span className="text-2xl"><MdPerson/></span>
            </div>
            <h1 className="text-primary text-lg font-semibold font-exo">
              {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
            </h1>
          </div>
          <Button
            onClick={handleCancel}
            variant="outlined"
            className="px-6 h-8 rounded-lg border-primary hover:bg-primary/10"
            sx={{
              color: 'var(--color-primary)',
              borderColor: 'var(--color-primary)',
              
              '&:hover': {
                backgroundColor: 'primary.100',
                
              },
            }}          >
            Cancelar
          </Button>
        </div>
      </div>

      {/* Formulário com scroll */}
      <div className="flex-1 overflow-y-auto md:px-[30px] px-1">
        <form onSubmit={handleSubmit} className="">
          {/* Toggle Pessoa Física/Jurídica */}
          <div className="flex items-center border-b border-primary/70 justify-between md:px-5 px-1 py-3 bg-info">
            <div className="flex flex-col items-start">
                <p className="text-lg font-medium text-primary-text">
                  {nome || 'Nome do Cliente'}
                </p>
                <p className="text-sm text-secondary-text">
                  {razaoSocial || 'Razão Social'}
                </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[28px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Dados Pessoais */}
          <div className="bg-info rounded-lg md:px-5 py-2 space-y-4">
            <h2 className="text-primary text-base font-semibold font-nunito mb-2">
              Dados Pessoais
            </h2>

            <div className="grid grid-cols-2 md:gap-2 gap-1">
              <Input
                label="Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Nome completo"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '38px',
                    backgroundColor: 'var(--color-primary-bg)',
                    borderRadius: '8px',
                  },
                  '& .MuiInputBase-input': {
                    padding: '8px 14px',
                    fontSize: '14px',
                  },
                }}
              />
              <Input
                label="Razão Social"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                placeholder="Razão social"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '38px',
                    backgroundColor: 'var(--color-primary-bg)',
                    borderRadius: '8px',
                  },
                  '& .MuiInputBase-input': {
                    padding: '8px 14px',
                    fontSize: '14px',
                  },
                }}
              />
            </div>

            <div className="grid md:grid-cols-2 grid-cols-1 gap-2">
              <Input
                label="CPF"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                inputProps={{ maxLength: 14 }}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '38px',
                    backgroundColor: 'var(--color-primary-bg)',
                    borderRadius: '8px',
                  },
                  '& .MuiInputBase-input': {
                    padding: '8px 14px',
                    fontSize: '14px',
                  },
                }}
              />
              <div className="relative">
                <Input
                  label="CNPJ"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  inputProps={{ maxLength: 18 }}
                  size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '38px',
                    backgroundColor: 'var(--color-primary-bg)',
                    borderRadius: '8px',
                  },
                  '& .MuiInputBase-input': {
                    padding: '8px 14px',
                    fontSize: '14px',
                  },
                }}
                  InputProps={{
                    endAdornment: (
                      <div className="flex items-center gap-1 md:pr-1">
                        {cnpj && (
                          <button
                            type="button"
                            onClick={handleClearCNPJ}
                            className="md:p-1 hover:bg-gray-200 rounded transition-colors"
                            aria-label="Limpar CNPJ"
                          >
                            <MdClear className="text-gray-500" size={18} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleBuscarCNPJ}
                          disabled={isLoadingCNPJ || !cnpj}
                          className="md:p-1 hover:bg-primary/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Buscar CNPJ"
                        >
                          {isLoadingCNPJ ? (
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <MdSearch className="text-primary" size={18} />
                          )}
                        </button>
                      </div>
                    ),
                  }}
                />
              </div>
            </div>

            {exibeAvisoCpfECnpjPreenchidos && (
              <p
                role="alert"
                className="text-sm font-nunito rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950"
              >
                Informe apenas CPF ou CNPJ — não é possível preencher os dois ao mesmo tempo.
                Remova um dos campos.
              </p>
            )}

            <div className="grid md:grid-cols-2 grid-cols-1 gap-3">
              <Input
                label="Telefone"
                value={telefone}
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
                inputProps={{ maxLength: 15 }}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '38px',
                    backgroundColor: 'var(--color-primary-bg)',
                    borderRadius: '8px',
                  },
                  '& .MuiInputBase-input': {
                    padding: '8px 14px',
                    fontSize: '14px',
                  },
                }}
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '38px',
                    backgroundColor: 'var(--color-primary-bg)',
                    borderRadius: '8px',
                  },
                  '& .MuiInputBase-input': {
                    padding: '8px 14px',
                    fontSize: '14px',
                  },
                }}
              />
            </div>

            <Input
              label="Nome Fantasia"
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
              placeholder="Nome fantasia"
              size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '38px',
                    backgroundColor: 'var(--color-primary-bg)',
                    borderRadius: '8px',
                  },
                  '& .MuiInputBase-input': {
                    padding: '8px 14px',
                    fontSize: '14px',
                  },
                }}
            />
          </div>

          {/* Toggle Endereço */}
          <div className="flex items-center justify-between px-5 bg-info">
            <div className="flex items-center gap-3">
              <span className="text-2xl text-primary"><MdLocationOn/></span>
              <span className="text-primary-text font-medium">
                Incluir Endereço
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={incluirEndereco}
                onChange={(e) => handleToggleEndereco(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[28px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Endereço */}
          {incluirEndereco && (
            <div className="bg-info md:px-5 py-1 space-y-4">
              <h2 className="text-primary text-base font-semibold font-nunito mb-4">
                Endereço
              </h2>

              <div className="grid md:grid-cols-2 grid-cols-1 gap-3">
                <div className="relative">
                  <Input
                    label="CEP"
                    value={cep}
                    onChange={(e) => setCep(formatCEP(e.target.value))}
                    placeholder="00000-000"
                    inputProps={{ maxLength: 9 }}
                    size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '38px',
                    backgroundColor: 'var(--color-primary-bg)',
                    borderRadius: '8px',
                  },
                  '& .MuiInputBase-input': {
                    padding: '8px 14px',
                    fontSize: '14px',
                  },
                }}
                    InputProps={{
                      endAdornment: (
                        <div className="flex items-center gap-1 pr-1">
                          {cep && (
                            <button
                              type="button"
                              onClick={handleClearCEP}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              aria-label="Limpar CEP"
                            >
                              <MdClear className="text-gray-500" size={18} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleBuscarCEP}
                            disabled={isLoadingCEP || !cep}
                            className="p-1 hover:bg-primary/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Buscar CEP"
                          >
                            {isLoadingCEP ? (
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <MdSearch className="text-primary" size={18} />
                            )}
                          </button>
                        </div>
                      ),
                    }}
                  />
                </div>
                <Input
                  label="Rua"
                  value={rua}
                  onChange={(e) => setRua(e.target.value)}
                  placeholder="Nome da rua"
                  size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '38px',
                    backgroundColor: 'var(--color-primary-bg)',
                    borderRadius: '8px',
                  },
                  '& .MuiInputBase-input': {
                    padding: '8px 14px',
                    fontSize: '14px',
                  },
                }}
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <Input
                  label="Número"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Número"
                  size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '38px',
                    backgroundColor: 'var(--color-primary-bg)',
                    borderRadius: '8px',
                  },
                  '& .MuiInputBase-input': {
                    padding: '8px 14px',
                    fontSize: '14px',
                  },
                }}
                />
                <Input
                  label="Bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Bairro"
                  size="small"
                  className="col-span-2"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '38px',
                    backgroundColor: 'var(--color-primary-bg)',
                    borderRadius: '8px',
                  },
                  '& .MuiInputBase-input': {
                    padding: '8px 14px',
                    fontSize: '14px',
                  },
                }}
                />
                <Input
                  label="Complemento"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Complemento"
                  size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '38px',
                    backgroundColor: 'var(--color-primary-bg)',
                    borderRadius: '8px',
                  },
                  '& .MuiInputBase-input': {
                    padding: '8px 14px',
                    fontSize: '14px',
                  },
                }}
                />
              </div>

              <div className="grid md:grid-cols-2 grid-cols-1 gap-3">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-primary-text mb-2">
                    Estado
                  </label>
                  <Select
                    value={estado}
                    onValueChange={handleEstadoChange}
                  >
                    <SelectTrigger className="h-[38px] bg-primary-bg">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BRASILEIROS.map((estadoOption) => (
                        <SelectItem key={estadoOption.sigla} value={estadoOption.sigla}>
                          {estadoOption.sigla} - {estadoOption.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <CidadeAutocomplete
                    value={cidade}
                    onChange={setCidade}
                    estado={estado}
                    label="Cidade"
                    placeholder="Digite o nome da cidade"
                    required={false}
                    disabled={!estado}
                    onValidationChange={setCidadeValida}
                    onCidadeSelecionada={setCodigoCidadeIbge}
                    className="w-full"
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        height: '38px',
                        backgroundColor: 'var(--color-primary-bg)',
                        borderRadius: '8px',
                      },
                      '& .MuiInputBase-input': {
                        padding: '8px 14px',
                        fontSize: '14px',
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex justify-end gap-4 py-4">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outlined"
              className="px-6 h-8 rounded-lg border-primary hover:bg-primary/10"
              sx={{
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                
                '&:hover': {
                  backgroundColor: 'primary.100',
                  
                },
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !nome}
             className="px-6 h-8 rounded-lg border-primary hover:bg-primary/90"
             sx={{
               color: 'var(--color-info)',
               borderColor: 'var(--color-primary)',
               backgroundColor: 'var(--color-primary)',
             }}>
              {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}


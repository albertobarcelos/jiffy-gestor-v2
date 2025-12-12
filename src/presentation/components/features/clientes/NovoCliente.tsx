'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Cliente } from '@/src/domain/entities/Cliente'
import { Input } from '@/src/presentation/components/ui/Input'
import { Button } from '@/src/presentation/components/ui/button'
import { showToast } from '@/src/shared/utils/toast'
import { MdSearch, MdClear } from 'react-icons/md'

interface NovoClienteProps {
  clienteId?: string
  isEmbedded?: boolean
  onClose?: () => void
  onSaved?: () => void
}

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
            setIncluirEndereco(true)
            setRua(endereco.rua || '')
            setNumero(endereco.numero || '')
            setBairro(endereco.bairro || '')
            setCidade(endereco.cidade || '')
            setEstado(endereco.estado || '')
            const cepValue = endereco.cep || ''
            setCep(cepValue ? formatCEP(cepValue) : '')
            setComplemento(endereco.complemento || '')
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
        setEstado(data.uf.toUpperCase())
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = auth?.getAccessToken()
    if (!token) {
      alert('Token não encontrado')
      return
    }

    setIsLoading(true)

    try {
      // Remove formatação dos campos antes de enviar
      const cpfLimpo = cpf.replace(/\D/g, '')
      const cnpjLimpo = cnpj.replace(/\D/g, '')
      const telefoneLimpo = telefone.replace(/\D/g, '')
      const cepLimpo = cep.replace(/\D/g, '')

      const body: any = {
        nome,
        razaoSocial: razaoSocial || undefined,
        telefone: telefoneLimpo || undefined,
        email: email || undefined,
        nomeFantasia: nomeFantasia || undefined,
        ativo,
      }

      // CPF e CNPJ: sempre envia se tiver valor, ou string vazia se estiver editando
      // Isso garante que o campo seja atualizado mesmo que vazio
      if (isEditing) {
        // Em edição, sempre envia CPF e CNPJ (mesmo vazios) para garantir atualização
        // IMPORTANTE: Envia string vazia explicitamente, não undefined
        // Garante que o campo sempre exista no body, mesmo que vazio
        body.cpf = cpfLimpo || ''
        body.cnpj = cnpjLimpo || ''
      } else {
        // Em criação, envia apenas se tiver valor
        if (cpfLimpo) body.cpf = cpfLimpo
        if (cnpjLimpo) body.cnpj = cnpjLimpo
      }

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
        bodyCompleto: JSON.stringify(body, null, 2),
      })

      if (incluirEndereco) {
        body.endereco = {
          rua: rua || undefined,
          numero: numero || undefined,
          bairro: bairro || undefined,
          cidade: cidade || undefined,
          estado: estado || undefined,
          cep: cepLimpo || undefined,
          complemento: complemento || undefined,
        }
      }

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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao salvar cliente')
      }

      showToast.success(isEditing ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!')
      
      if (onSaved) {
        onSaved()
      } else {
        router.push('/cadastros/clientes')
      }
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      alert(error instanceof Error ? error.message : 'Erro ao salvar cliente')
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
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-primary-bg rounded-tl-[30px] shadow-md px-[30px] py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                nome
                  ? 'bg-success/25 text-success'
                  : 'bg-secondary-text/10 text-secondary-text'
              }`}
            >
              <span className="text-2xl">👤</span>
            </div>
            <h1 className="text-primary text-lg font-semibold font-exo">
              {isEditing ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
            </h1>
          </div>
          <Button
            onClick={handleCancel}
            variant="outlined"
            className="h-9 px-[26px] rounded-[30px] border-primary/15 text-primary bg-primary/10 hover:bg-primary/20"
          >
            Cancelar
          </Button>
        </div>
      </div>

      {/* Formulário com scroll */}
      <div className="flex-1 overflow-y-auto px-[30px] py-[30px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Toggle Pessoa Física/Jurídica */}
          <div className="flex items-center justify-between p-5 bg-info rounded-[20px]">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  !ativo
                    ? 'bg-success/25 text-success'
                    : 'bg-secondary-text/10 text-secondary-text'
                }`}
              >
                <span className="text-2xl">🏢</span>
              </div>
              <div>
                <p className="text-lg font-medium text-primary-text">
                  {nome || 'Nome do Cliente'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-success"></div>
            </label>
          </div>

          {/* Dados Pessoais */}
          <div className="bg-info rounded-[20px] p-5 space-y-4">
            <h2 className="text-primary text-base font-semibold font-nunito mb-4">
              Dados Pessoais
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nome *"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Nome completo"
                className="bg-primary-bg"
              />
              <Input
                label="Razão Social"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                placeholder="Razão social"
                className="bg-primary-bg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="CPF"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                inputProps={{ maxLength: 14 }}
                className="bg-primary-bg"
              />
              <div className="relative">
                <Input
                  label="CNPJ"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  inputProps={{ maxLength: 18 }}
                  className="bg-primary-bg"
                  InputProps={{
                    endAdornment: (
                      <div className="flex items-center gap-1 pr-1">
                        {cnpj && (
                          <button
                            type="button"
                            onClick={handleClearCNPJ}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            aria-label="Limpar CNPJ"
                          >
                            <MdClear className="text-gray-500" size={18} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleBuscarCNPJ}
                          disabled={isLoadingCNPJ || !cnpj}
                          className="p-1 hover:bg-primary/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Telefone"
                value={telefone}
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
                inputProps={{ maxLength: 15 }}
                className="bg-primary-bg"
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="bg-primary-bg"
              />
            </div>

            <Input
              label="Nome Fantasia"
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
              placeholder="Nome fantasia"
              className="bg-primary-bg"
            />
          </div>

          {/* Toggle Endereço */}
          <div className="flex items-center justify-between p-5 bg-info rounded-[20px]">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📍</span>
              <span className="text-primary-text font-medium">
                Incluir Endereço
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={incluirEndereco}
                onChange={(e) => setIncluirEndereco(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-success"></div>
            </label>
          </div>

          {/* Endereço */}
          {incluirEndereco && (
            <div className="bg-info rounded-[20px] p-5 space-y-4">
              <h2 className="text-primary text-base font-semibold font-nunito mb-4">
                Endereço
              </h2>

              <div className="grid grid-cols-3 gap-4">
                <div className="relative">
                  <Input
                    label="CEP"
                    value={cep}
                    onChange={(e) => setCep(formatCEP(e.target.value))}
                    placeholder="00000-000"
                    inputProps={{ maxLength: 9 }}
                    className="bg-primary-bg"
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
                  className="bg-primary-bg col-span-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Número"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Número"
                  className="bg-primary-bg"
                />
                <Input
                  label="Bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Bairro"
                  className="bg-primary-bg col-span-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Cidade"
                  className="bg-primary-bg"
                />
                <Input
                  label="Estado"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  placeholder="UF"
                  inputProps={{ maxLength: 2 }}
                  className="bg-primary-bg"
                />
                <Input
                  label="Complemento"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Complemento"
                  className="bg-primary-bg"
                />
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outlined"
              className="px-8"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !nome}>
              {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}


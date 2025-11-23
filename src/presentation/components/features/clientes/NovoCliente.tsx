'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Cliente } from '@/src/domain/entities/Cliente'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'

interface NovoClienteProps {
  clienteId?: string
}

/**
 * Componente para criar/editar cliente
 * Replica o design e funcionalidades do Flutter
 */
export function NovoCliente({ clienteId }: NovoClienteProps) {
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
          const cliente = Cliente.fromJSON(data)

          setNome(cliente.getNome())
          setRazaoSocial(cliente.getRazaoSocial() || '')
          setCpf(cliente.getCpf() || '')
          setCnpj(cliente.getCnpj() || '')
          setTelefone(cliente.getTelefone() || '')
          setEmail(cliente.getEmail() || '')
          setNomeFantasia(cliente.getNomeFantasia() || '')
          setAtivo(cliente.isAtivo())

          const endereco = cliente.getEndereco()
          if (endereco) {
            setIncluirEndereco(true)
            setRua(endereco.rua || '')
            setNumero(endereco.numero || '')
            setBairro(endereco.bairro || '')
            setCidade(endereco.cidade || '')
            setEstado(endereco.estado || '')
            setCep(endereco.cep || '')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = auth?.getAccessToken()
    if (!token) {
      alert('Token não encontrado')
      return
    }

    setIsLoading(true)

    try {
      const body: any = {
        nome,
        razaoSocial: razaoSocial || undefined,
        cpf: cpf.replace(/\D/g, '') || undefined,
        cnpj: cnpj.replace(/\D/g, '') || undefined,
        telefone: telefone.replace(/\D/g, '') || undefined,
        email: email || undefined,
        nomeFantasia: nomeFantasia || undefined,
        ativo,
      }

      if (incluirEndereco) {
        body.endereco = {
          rua: rua || undefined,
          numero: numero || undefined,
          bairro: bairro || undefined,
          cidade: cidade || undefined,
          estado: estado || undefined,
          cep: cep.replace(/\D/g, '') || undefined,
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

      alert(isEditing ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!')
      router.push('/cadastros/clientes')
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      alert(error instanceof Error ? error.message : 'Erro ao salvar cliente')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (confirm('Tem certeza que deseja cancelar?')) {
      router.push('/cadastros/clientes')
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
            variant="outline"
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
                maxLength={14}
                className="bg-primary-bg"
              />
              <Input
                label="CNPJ"
                value={cnpj}
                onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                className="bg-primary-bg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Telefone"
                value={telefone}
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
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
                <Input
                  label="CEP"
                  value={cep}
                  onChange={(e) => setCep(formatCEP(e.target.value))}
                  placeholder="00000-000"
                  maxLength={9}
                  className="bg-primary-bg"
                />
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
                  maxLength={2}
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
              variant="outline"
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


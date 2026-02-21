'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Cliente } from '@/src/domain/entities/Cliente'
import { Button } from '@/src/presentation/components/ui/button'
import { MdEdit, MdPerson } from 'react-icons/md'

// Funções de formatação
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
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
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

interface VisualizarClienteProps {
  clienteId: string
  isEmbedded?: boolean
  onClose?: () => void
  onEdit?: () => void
}

/**
 * Componente para visualizar detalhes do cliente
 * Replica o design do Flutter
 */
export function VisualizarCliente({
  clienteId,
  isEmbedded = false,
  onClose,
  onEdit,
}: VisualizarClienteProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carregar dados do cliente
  useEffect(() => {
    const loadCliente = async () => {
      const token = auth?.getAccessToken()
      if (!token) {
        setError('Token não encontrado')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/clientes/${clienteId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao carregar cliente')
        }

        const data = await response.json()
        // Garante que seja uma instância de Cliente
        const clienteInstance = Cliente.fromJSON(data)
        setCliente(clienteInstance)
      } catch (err) {
        console.error('Erro ao carregar cliente:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar cliente')
      } finally {
        setIsLoading(false)
      }
    }

    if (clienteId) {
      loadCliente()
    }
  }, [clienteId, auth])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <img
          src="/images/jiffy-loading.gif"
          alt="Carregando..."
          className="w-20 h-20"
        />
        <span className="text-sm font-medium text-primary-text font-nunito">Carregando...</span>
      </div>
    )
  }

  if (error || !cliente) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-secondary-text">{error || 'Cliente não encontrado'}</p>
      </div>
    )
  }

  const endereco = cliente.getEndereco()

  return (
    <div className="flex flex-col h-full bg-primary-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary-bg md:px-[30px] px-1 py-2 border-b-2 border-primary/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
          <div
              className='w-12 h-12 rounded-full flex items-center bg-primary/25 text-primary justify-center'>
              <span className="text-2xl"><MdPerson/></span>
            </div>
            <div className="flex flex-col items-start">
            
              <div className="flex items-center gap-2">
                <h1 className="text-primary text-lg font-semibold font-exo">
                  {cliente.getNome()}
                </h1>
                <button
                  onClick={() => onEdit?.()}
                  title="Editar cliente"
                  className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-primary/10 transition-colors"
                  aria-label={`Editar ${cliente.getNome()}`}
                >
                  <MdEdit className="text-primary text-base" />
                </button>
              </div>
              <span className="text-secondary-text text-sm">{cliente.getRazaoSocial()}</span>
            </div>
          </div>
          <Button
            onClick={() => {
              if (onClose) {
                onClose()
              } else {
                router.push('/cadastros/clientes')
              }
            }}
            variant="outlined"
            className="px-6 h-8 rounded-lg border-primary hover:bg-primary/10"
            sx={{
              color: 'var(--color-primary)',
              borderColor: 'var(--color-primary)',
            }}
          >
            Voltar
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto md:px-[30px] px-1 py-2">
        {/* Grid com duas colunas: Dados e Endereço */}
        <div className="grid md:grid-cols-2 grid-cols-1 gap-2 mb-6">
          {/* Seção Dados (Esquerda) */}
          <div className="bg-white rounded-lg md:px-6 px-2 py-2 shadow-sm">
            <h2 className="text-primary text-lg font-semibold font-nunito mb-3 pb-2 border-b-2 border-primary">
              Dados Pessoais
            </h2>
            <div className="space-y-2">
              {/* Nome */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Nome</p>
                <p className="text-primary-text text-base border border-primary/30 bg-primary-bg px-2 py-2 rounded-lg">{cliente.getNome()}</p>
              </div>

              {/* CPF */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">CPF</p>
                <p className="text-primary-text text-base border border-primary/30 bg-primary-bg px-2 py-2 rounded-lg">
                  {cliente.getCpf() ? formatCPF(cliente.getCpf()!) : '-'}
                </p>
              </div>

              {/* CNPJ */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">CNPJ</p>
                <p className="text-primary-text text-base border border-primary/30 bg-primary-bg px-2 py-2 rounded-lg">
                  {cliente.getCnpj() ? formatCNPJ(cliente.getCnpj()!) : '-'}
                </p>
              </div>

              {/* Telefone */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Telefone</p>
                <p className="text-primary-text text-base border border-primary/30 bg-primary-bg px-2 py-2 rounded-lg">
                  {cliente.getTelefone() ? formatTelefone(cliente.getTelefone()!) : '-'}
                </p>
              </div>

              {/* Nome Fantasia */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Nome Fantasia</p>
                <p className="text-primary-text text-base border border-primary/30 bg-primary-bg px-2 py-2 rounded-lg">
                  {cliente.getNomeFantasia() || '-'}
                </p>
              </div>

              {/* Razão Social */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Razão Social</p>
                <p className="text-primary-text text-base border border-primary/30 bg-primary-bg px-2 py-2 rounded-lg">
                  {cliente.getRazaoSocial() || '-'}
                </p>
              </div>

              {/* E-mail */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">E-mail</p>
                <p className="text-primary-text text-base border border-primary/30 bg-primary-bg px-2 py-2 rounded-lg">{cliente.getEmail() || '-'}</p>
              </div>
            </div>
          </div>

          {/* Seção Endereço (Direita) */}
          <div className="bg-white rounded-lg md:px-6 px-2 py-2 shadow-sm">
            <h2 className="text-primary text-lg font-semibold font-nunito mb-3 pb-2 border-b-2 border-primary">
              Endereço
            </h2>
            <div className="space-y-2">
              {/* CEP */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">CEP</p>
                <p className="text-primary-text text-base border border-primary/30 bg-primary-bg px-2 py-2 rounded-lg">
                  {endereco?.cep ? formatCEP(endereco.cep) : '-'}
                </p>
              </div>

              {/* Bairro */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Bairro</p>
                <p className="text-primary-text text-base border border-primary/30 bg-primary-bg px-2 py-2 rounded-lg">{endereco?.bairro || '-'}</p>  
              </div>

              {/* Logradouro */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Logradouro</p>
                <p className="text-primary-text text-base border border-primary/30 bg-primary-bg px-2 py-2 rounded-lg">{endereco?.rua || '-'}</p>
              </div>

              {/* Complemento */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Complemento</p>
                <p className="text-primary-text text-base border border-primary/30 bg-primary-bg px-2 py-2 rounded-lg">
                  {endereco?.complemento || '-'}
                </p>
              </div>

              {/* Número */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Número</p>
                <p className="text-primary-text text-base border border-primary/30 bg-primary-bg px-2 py-2 rounded-lg">{endereco?.numero || '-'}</p>
              </div>

              {/* Estado */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Estado</p>
                <p className="text-primary-text text-base border border-primary/30 bg-primary-bg px-2 py-2 rounded-lg">{endereco?.estado || '-'}</p>
              </div>

              {/* Cidade */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Cidade</p>
                <p className="text-primary-text text-base border border-primary/30 bg-primary-bg px-2 py-2 rounded-lg">{endereco?.cidade || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


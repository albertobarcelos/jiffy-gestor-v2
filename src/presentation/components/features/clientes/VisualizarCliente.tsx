'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Cliente } from '@/src/domain/entities/Cliente'
import { Button } from '@/src/presentation/components/ui/button'

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
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
      <div className="sticky top-0 z-10 bg-primary-bg px-[30px] py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/20 text-success flex items-center justify-center">
              <span className="text-xl">✓</span>
            </div>
            <h1 className="text-primary text-lg font-semibold font-exo">
              {cliente.getNome()}
            </h1>
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
            className="px-6 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
          >
            Voltar
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-[30px] py-[30px]">
        {/* Grid com duas colunas: Dados e Endereço */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Seção Dados (Esquerda) */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-primary text-lg font-semibold font-nunito mb-3 pb-2 border-b-2 border-primary">
              Dados
            </h2>
            <div className="space-y-4">
              {/* Nome */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Nome</p>
                <p className="text-primary-text text-base">{cliente.getNome()}</p>
              </div>

              {/* CPF */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">CPF</p>
                <p className="text-primary-text text-base">
                  {cliente.getCpf() ? formatCPF(cliente.getCpf()!) : '-'}
                </p>
              </div>

              {/* CNPJ */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">CNPJ</p>
                <p className="text-primary-text text-base">
                  {cliente.getCnpj() ? formatCNPJ(cliente.getCnpj()!) : '-'}
                </p>
              </div>

              {/* Telefone */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Telefone</p>
                <p className="text-primary-text text-base">
                  {cliente.getTelefone() ? formatTelefone(cliente.getTelefone()!) : '-'}
                </p>
              </div>

              {/* Nome Fantasia */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Nome Fantasia</p>
                <p className="text-primary-text text-base">
                  {cliente.getNomeFantasia() || '-'}
                </p>
              </div>

              {/* Razão Social */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Razão Social</p>
                <p className="text-primary-text text-base">
                  {cliente.getRazaoSocial() || '-'}
                </p>
              </div>

              {/* E-mail */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">E-mail</p>
                <p className="text-primary-text text-base">{cliente.getEmail() || '-'}</p>
              </div>
            </div>
          </div>

          {/* Seção Endereço (Direita) */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-primary text-lg font-semibold font-nunito mb-3 pb-2 border-b-2 border-primary">
              Endereço
            </h2>
            <div className="space-y-4">
              {/* CEP */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">CEP</p>
                <p className="text-primary-text text-base">
                  {endereco?.cep ? formatCEP(endereco.cep) : '-'}
                </p>
              </div>

              {/* Bairro */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Bairro</p>
                <p className="text-primary-text text-base">{endereco?.bairro || '-'}</p>
              </div>

              {/* Logradouro */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Logradouro</p>
                <p className="text-primary-text text-base">{endereco?.rua || '-'}</p>
              </div>

              {/* Complemento */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Complemento</p>
                <p className="text-primary-text text-base">
                  {endereco?.complemento || '-'}
                </p>
              </div>

              {/* Número */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Número</p>
                <p className="text-primary-text text-base">{endereco?.numero || '-'}</p>
              </div>

              {/* Estado */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Estado</p>
                <p className="text-primary-text text-base">{endereco?.estado || '-'}</p>
              </div>

              {/* Cidade */}
              <div>
                <p className="text-secondary-text text-sm mb-1 font-medium">Cidade</p>
                <p className="text-primary-text text-base">{endereco?.cidade || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Seção Compras (Largura total) */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-primary text-lg font-semibold font-nunito mb-3 pb-2 border-b-2 border-primary">
            Compras
          </h2>
          <div className="py-8">
            <p className="text-secondary-text text-center">
              Nenhuma compra registrada para este cliente.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Cliente } from '@/src/domain/entities/Cliente'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { MdEdit, MdPerson, MdReceiptLong, MdLocationOn } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

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

/** Mesmos códigos SPED usados em NovoCliente — exibição legível na visualização */
const INDICADOR_IE_LABELS: Record<string, string> = {
  '1': 'Contribuinte ICMS',
  '2': 'Contribuinte isento de IE',
  '9': 'Não contribuinte',
}

function textoIndicadorIe(valor: string | undefined): string {
  if (valor == null || String(valor).trim() === '') return '-'
  const v = String(valor).trim()
  return INDICADOR_IE_LABELS[v] ?? v
}

interface VisualizarClienteProps {
  clienteId: string
  isEmbedded?: boolean
  hideEmbeddedHeader?: boolean
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
  hideEmbeddedHeader = false,
  onClose,
  onEdit,
}: VisualizarClienteProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const INPUT_LABEL_PROPS = { shrink: true } as const
  const inputSx = {
    '& .MuiOutlinedInput-root': {
      height: '38px',
      borderRadius: '8px',
    },
    '& .MuiInputBase-input': {
      padding: '8px 14px',
      fontSize: '14px',
    },
  } as const

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
        <JiffyLoading />
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
    <div className="flex flex-col h-full">
      {/* Header */}
      {!isEmbedded || !hideEmbeddedHeader ? (
        <div className="sticky top-0 z-10 bg-primary-bg md:px-[30px] px-1 py-2 border-b-2 border-primary/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center bg-primary/25 text-primary justify-center">
                <span className="text-2xl">
                  <MdPerson />
                </span>
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
      ) : null}

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-1">
        {/* Grid com duas colunas: Dados e Endereço */}
        <div className="grid grid-cols-1 md:grid-cols-2 mb-2">
          {/* Seção Dados (Esquerda) */}
          <div className="bg-white px-3 py-2">
            <h2 className="flex items-center gap-1 text-primary text-lg font-semibold mb-3 pb-2 border-b-2 border-primary">
            <MdPerson className="text-primary text-2xl" />
              Dados Pessoais
            </h2>
            <div className="grid grid-cols-1 gap-2 space-y-2">
              <Input
                label="Nome"
                value={cliente.getNome() || '-'}
                size="small"
                InputLabelProps={INPUT_LABEL_PROPS}
                InputProps={{ readOnly: true }}
                sx={inputSx}
              />
              <Input
                label="CPF"
                value={cliente.getCpf() ? formatCPF(cliente.getCpf()!) : '-'}
                size="small"
                InputLabelProps={INPUT_LABEL_PROPS}
                InputProps={{ readOnly: true }}
                sx={inputSx}
              />
              <Input
                label="CNPJ"
                value={cliente.getCnpj() ? formatCNPJ(cliente.getCnpj()!) : '-'}
                size="small"
                InputLabelProps={INPUT_LABEL_PROPS}
                InputProps={{ readOnly: true }}
                sx={inputSx}
              />
              <Input
                label="Telefone"
                value={cliente.getTelefone() ? formatTelefone(cliente.getTelefone()!) : '-'}
                size="small"
                InputLabelProps={INPUT_LABEL_PROPS}
                InputProps={{ readOnly: true }}
                sx={inputSx}
              />
              <Input
                label="Nome Fantasia"
                value={cliente.getNomeFantasia() || '-'}
                size="small"
                InputLabelProps={INPUT_LABEL_PROPS}
                InputProps={{ readOnly: true }}
                sx={inputSx}
              />
              <Input
                label="Razão Social"
                value={cliente.getRazaoSocial() || '-'}
                size="small"
                InputLabelProps={INPUT_LABEL_PROPS}
                InputProps={{ readOnly: true }}
                sx={inputSx}
              />
              <Input
                label="E-mail"
                value={cliente.getEmail() || '-'}
                size="small"
                InputLabelProps={INPUT_LABEL_PROPS}
                InputProps={{ readOnly: true }}
                sx={inputSx}
              />
            </div>
          </div>

          {/* Seção Endereço (Direita) */}
          <div className="bg-white px-3 py-2">
            <h2 className="flex items-center gap-1 text-primary text-lg font-semibold mb-3 pb-2 border-b-2 border-primary">
            <MdLocationOn className="text-primary text-2xl" />
              Endereço
            </h2>
            <div className="grid grid-cols-1 gap-2 space-y-2">
              <Input
                label="CEP"
                value={endereco?.cep ? formatCEP(endereco.cep) : '-'}
                size="small"
                InputLabelProps={INPUT_LABEL_PROPS}
                InputProps={{ readOnly: true }}
                sx={inputSx}
              />
              <Input
                label="Bairro"
                value={endereco?.bairro || '-'}
                size="small"
                InputLabelProps={INPUT_LABEL_PROPS}
                InputProps={{ readOnly: true }}
                sx={inputSx}
              />
              <Input
                label="Logradouro"
                value={endereco?.rua || '-'}
                size="small"
                InputLabelProps={INPUT_LABEL_PROPS}
                InputProps={{ readOnly: true }}
                sx={inputSx}
              />
              <Input
                label="Complemento"
                value={endereco?.complemento || '-'}
                size="small"
                InputLabelProps={INPUT_LABEL_PROPS}
                InputProps={{ readOnly: true }}
                sx={inputSx}
              />
              <Input
                label="Número"
                value={endereco?.numero || '-'}
                size="small"
                InputLabelProps={INPUT_LABEL_PROPS}
                InputProps={{ readOnly: true }}
                sx={inputSx}
              />
              <Input
                label="Estado"
                value={endereco?.estado || '-'}
                size="small"
                InputLabelProps={INPUT_LABEL_PROPS}
                InputProps={{ readOnly: true }}
                sx={inputSx}
              />
              <Input
                label="Cidade"
                value={endereco?.cidade || '-'}
                size="small"
                InputLabelProps={INPUT_LABEL_PROPS}
                InputProps={{ readOnly: true }}
                sx={inputSx}
              />
            </div>
          </div>
        </div>

        {/* Fiscal — fora das duas colunas, largura total; campos lado a lado no desktop */}
        <div className="rounded-lg bg-white px-2 py-2 shadow-sm md:px-6 md:py-3">
          <h2 className="text-primary text-lg font-semibold font-nunito mb-3 flex items-center gap-2 border-b-2 border-primary pb-2">
            <span className="text-xl text-primary">
              <MdReceiptLong />
            </span>
            Fiscal
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
            <Input
              label="Indicador da inscrição estadual"
              value={textoIndicadorIe(cliente.getIndicadorInscricaoEstadual())}
              size="small"
              InputLabelProps={INPUT_LABEL_PROPS}
              InputProps={{ readOnly: true }}
              sx={inputSx}
            />
            <Input
              label="Inscrição estadual"
              value={cliente.getInscricaoEstadual()?.trim() || '-'}
              size="small"
              InputLabelProps={INPUT_LABEL_PROPS}
              InputProps={{ readOnly: true }}
              sx={inputSx}
            />
          </div>
        </div>
      </div>
    </div>
  )
}


'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'

interface NovoMeioPagamentoProps {
  meioPagamentoId?: string
  isEmbedded?: boolean
  onSaved?: () => void
  onCancel?: () => void
}

/**
 * Componente para criar/editar meio de pagamento
 * Replica o design e funcionalidades do Flutter
 */
export function NovoMeioPagamento({
  meioPagamentoId,
  isEmbedded = false,
  onSaved,
  onCancel,
}: NovoMeioPagamentoProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const isEditing = !!meioPagamentoId

  // Estados do formulário
  const [nome, setNome] = useState('')
  const [tefAtivo, setTefAtivo] = useState(true)
  const [formaPagamentoFiscal, setFormaPagamentoFiscal] = useState('dinheiro')
  const [ativo, setAtivo] = useState(true)

  // Estados de loading
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMeioPagamento, setIsLoadingMeioPagamento] = useState(false)
  const hasLoadedMeioPagamentoRef = useRef(false)

  // Mapeamento entre valores da API (lowercase) e labels para exibição
  const formasPagamentoFiscalMap: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
  }

  // Opções de forma de pagamento fiscal (apenas as aceitas pela API)
  const formasPagamentoFiscal = Object.keys(formasPagamentoFiscalMap)

  // Carregar dados do meio de pagamento se estiver editando
  useEffect(() => {
    if (!isEditing) {
      // Reset quando não estiver editando
      hasLoadedMeioPagamentoRef.current = false
      setNome('')
      setTefAtivo(true)
      setFormaPagamentoFiscal('dinheiro')
      setAtivo(true)
      return
    }

    if (hasLoadedMeioPagamentoRef.current) return

    const loadMeioPagamento = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingMeioPagamento(true)
      hasLoadedMeioPagamentoRef.current = true

      try {
        const response = await fetch(`/api/meios-pagamentos/${meioPagamentoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const meioPagamento = MeioPagamento.fromJSON(data)

          setNome(meioPagamento.getNome())
          setTefAtivo(meioPagamento.isTefAtivo())
          // Garantir que o valor está em lowercase para corresponder às opções do select
          const formaFiscal = meioPagamento.getFormaPagamentoFiscal().toLowerCase()
          setFormaPagamentoFiscal(formaFiscal)
          setAtivo(meioPagamento.isAtivo())
        }
      } catch (error) {
        console.error('Erro ao carregar meio de pagamento:', error)
      } finally {
        setIsLoadingMeioPagamento(false)
      }
    }

    loadMeioPagamento()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, meioPagamentoId])

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
        tefAtivo,
        // Garantir que o valor está em lowercase antes de enviar
        formaPagamentoFiscal: formaPagamentoFiscal.toLowerCase(),
        ativo,
      }

      const url = isEditing
        ? `/api/meios-pagamentos/${meioPagamentoId}`
        : '/api/meios-pagamentos'
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
        throw new Error(errorData.error || 'Erro ao salvar meio de pagamento')
      }

      if (isEmbedded && onSaved) {
        onSaved()
      } else {
        alert(isEditing ? 'Meio de pagamento atualizado com sucesso!' : 'Meio de pagamento criado com sucesso!')
        router.push('/cadastros/meios-pagamentos')
      }
    } catch (error) {
      console.error('Erro ao salvar meio de pagamento:', error)
      alert(error instanceof Error ? error.message : 'Erro ao salvar meio de pagamento')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (isEmbedded && onCancel) {
      onCancel()
    } else {
      router.push('/cadastros/meios-pagamentos')
    }
  }

  if (isLoadingMeioPagamento) {
    return (
      <div className="flex items-center justify-center h-full">
        <img src="/images/jiffy-loading.gif" alt="Carregando..." className="w-20 h-20" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">

      {/* Formulário com scroll */}
      <div className="flex-1 overflow-y-auto md:px-[30px] px-1 md:py-4 py-2">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados */}
          <div className="bg-info rounded-lg md:p-5 p-2">
            <h2 className="text-primary text-xl font-semibold font-exo mb-4">
              {isEditing && nome ? `Editar meio de pagamento: ${nome}` : `Novo meio de pagamento: ${nome}`}
            </h2>
            <div className="h-[2px] bg-primary/70 mb-4"></div>

            <div className="space-y-4">
              <Input
                label="Nome do Meio de Pagamento"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Digite o nome do meio de pagamento"
                className="bg-info"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forma de Pagamento Fiscal *
                </label>
                <select
                  value={formaPagamentoFiscal}
                  onChange={(e) => setFormaPagamentoFiscal(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-400 bg-info text-gray-900 focus:outline-none focus:border-2 focus:border-primary"
                >
                  {formasPagamentoFiscal.map((forma) => (
                    <option key={forma} value={forma}>
                      {formasPagamentoFiscalMap[forma]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggle TEF Ativo */}
              <div className="flex items-center justify-end p-4 rounded-lg gap-2">
                <span className="text-primary-text font-medium">TEF Ativo</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tefAtivo}
                    onChange={(e) => setTefAtivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[5px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Toggle Ativo */}
              <div className="flex items-center justify-end p-4 rounded-lg gap-2">
                <span className="text-primary-text font-medium">Ativo</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="sr-only peer"
                  />
                    <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[5px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-4 pt-4 pr-2">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outlined"
              className="h-8 px-8 rounded-lg"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !nome}
                  sx={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-info)',
                    '&:hover': {
                      backgroundColor: 'var(--color-primary)',
                      opacity: 0.9,
                    },
                  }}
            className=" text-white hover:bg-primary/90 h-8 px-8 rounded-lg">
              {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}


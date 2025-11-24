'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'

interface NovoMeioPagamentoProps {
  meioPagamentoId?: string
}

/**
 * Componente para criar/editar meio de pagamento
 * Replica o design e funcionalidades do Flutter
 */
export function NovoMeioPagamento({ meioPagamentoId }: NovoMeioPagamentoProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const isEditing = !!meioPagamentoId

  // Estados do formulário
  const [nome, setNome] = useState('')
  const [tefAtivo, setTefAtivo] = useState(true)
  const [formaPagamentoFiscal, setFormaPagamentoFiscal] = useState('Dinheiro')
  const [ativo, setAtivo] = useState(true)

  // Estados de loading
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMeioPagamento, setIsLoadingMeioPagamento] = useState(false)
  const hasLoadedMeioPagamentoRef = useRef(false)

  // Opções de forma de pagamento fiscal
  const formasPagamentoFiscal = [
    'Dinheiro',
    'Cartão de Crédito',
    'Cartão de Débito',
    'PIX',
    'Vale Alimentação',
    'Vale Refeição',
    'Outros',
  ]

  // Carregar dados do meio de pagamento se estiver editando
  useEffect(() => {
    if (!isEditing || hasLoadedMeioPagamentoRef.current) return

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
          setFormaPagamentoFiscal(meioPagamento.getFormaPagamentoFiscal())
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
        formaPagamentoFiscal,
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

      alert(isEditing ? 'Meio de pagamento atualizado com sucesso!' : 'Meio de pagamento criado com sucesso!')
      router.push('/cadastros/meios-pagamentos')
    } catch (error) {
      console.error('Erro ao salvar meio de pagamento:', error)
      alert(error instanceof Error ? error.message : 'Erro ao salvar meio de pagamento')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/cadastros/meios-pagamentos')
  }

  if (isLoadingMeioPagamento) {
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
            <div className="w-12 h-12 rounded-full bg-primary/25 text-primary flex items-center justify-center">
              <span className="text-2xl">💳</span>
            </div>
            <h1 className="text-primary text-lg font-semibold font-exo">
              {isEditing ? 'Editar Meio de Pagamento' : 'Novo Meio de Pagamento'}
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
          {/* Dados */}
          <div className="bg-info rounded-[12px] p-5">
            <h2 className="text-secondary text-xl font-semibold font-exo mb-4">
              Dados
            </h2>
            <div className="h-px bg-alternate mb-4"></div>

            <div className="space-y-4">
              <Input
                label="Nome do Meio de Pagamento *"
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
                      {forma}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggle TEF Ativo */}
              <div className="flex items-center justify-between p-4 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium">TEF Ativo</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tefAtivo}
                    onChange={(e) => setTefAtivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>

              {/* Toggle Ativo */}
              <div className="flex items-center justify-between p-4 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium">Ativo</span>
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
            </div>
          </div>

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


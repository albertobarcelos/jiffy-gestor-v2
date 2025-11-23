'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Caixa } from '@/src/domain/entities/Caixa'
import { OperacaoCaixa } from '@/src/domain/entities/OperacaoCaixa'
import { useAuthStore } from '@/src/presentation/stores/authStore'

interface DetalhesCaixaViewProps {
  caixaRef: string
  conferenciaCaixaRef?: string
}

/**
 * Detalhes de um caixa específico
 * Replica o design e funcionalidades do Flutter
 */
export function DetalhesCaixaView({ caixaRef, conferenciaCaixaRef }: DetalhesCaixaViewProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const [caixa, setCaixa] = useState<Caixa | null>(null)
  const [operacoes, setOperacoes] = useState<OperacaoCaixa[]>([])
  const [somaSuprimentos, setSomaSuprimentos] = useState(0)
  const [somaSangrias, setSomaSangrias] = useState(0)
  const [saldoCaixa, setSaldoCaixa] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const buscarDetalhes = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoading(true)
      try {
        // TODO: Implementar chamada à API quando disponível
        // Por enquanto, dados mockados
        const mockCaixa = Caixa.create(
          caixaRef,
          'Fechado',
          new Date(),
          new Date(),
          '1',
          'Usuário Admin',
          new Date(),
          new Date()
        )
        setCaixa(mockCaixa)

        // Calcular totais
        const suprimentos = operacoes.filter(op => op.isSuprimento())
        const sangrias = operacoes.filter(op => op.isSangria())
        
        setSomaSuprimentos(suprimentos.reduce((sum, op) => sum + op.getValor(), 0))
        setSomaSangrias(sangrias.reduce((sum, op) => sum + op.getValor(), 0))
        setSaldoCaixa(somaSuprimentos - somaSangrias)
      } catch (error) {
        console.error('Erro ao buscar detalhes do caixa:', error)
      } finally {
        setIsLoading(false)
      }
    }

    buscarDetalhes()
  }, [caixaRef, auth, operacoes, somaSuprimentos, somaSangrias])

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  const formatarData = (data: Date) => {
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!caixa) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-secondary-text">Caixa não encontrado</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-[30px] pt-[30px]">
        {/* Header com data de abertura */}
        <div className="mb-6">
          <div className="h-10 bg-white rounded-tl-[16px] rounded-br-[6px] rounded-bl-[6px] rounded-tr-[6px] flex items-center px-5">
            <p className="text-secondary-text text-base font-bold font-nunito">
              Abertura: {formatarData(caixa.getDataAbertura())}
            </p>
            {caixa.getDataFechamento() && (
              <p className="text-secondary-text text-base font-bold font-nunito ml-4">
                | Fechamento: {formatarData(caixa.getDataFechamento())}
              </p>
            )}
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="h-[120px] bg-info rounded-[10px] p-3 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">💰</span>
              <p className="text-primary-text text-sm font-semibold font-exo">
                Saldo em Caixa
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-tertiary text-xl font-bold font-exo">
                {formatarMoeda(saldoCaixa)}
              </p>
            </div>
          </div>

          <div className="h-[120px] bg-info rounded-[10px] p-3 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⬇️</span>
              <p className="text-primary-text text-sm font-semibold font-exo">
                Suprimentos
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-success text-xl font-bold font-exo">
                {formatarMoeda(somaSuprimentos)}
              </p>
            </div>
          </div>

          <div className="h-[120px] bg-info rounded-[10px] p-3 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⬆️</span>
              <p className="text-primary-text text-sm font-semibold font-exo">
                Sangrias
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-error text-xl font-bold font-exo">
                {formatarMoeda(somaSangrias)}
              </p>
            </div>
          </div>
        </div>

        {/* Seção de Gráfico de Faturamento */}
        <div className="mb-6">
          <div className="bg-info rounded-[10px] p-5">
            <h3 className="text-secondary text-xl font-semibold font-exo mb-4">
              Gráfico de Faturamento
            </h3>
            <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-secondary rounded-lg">
              <p className="text-secondary-text">Gráfico será implementado aqui</p>
            </div>
          </div>
        </div>

        {/* Seção de Resumo de Valores */}
        <div className="mb-6">
          <div className="bg-info rounded-[10px] p-5">
            <h3 className="text-secondary text-xl font-semibold font-exo mb-4">
              Resumo de Valores
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-primary-bg rounded-lg">
                <p className="text-sm font-medium text-primary-text">Total de Vendas</p>
                <p className="text-sm font-bold text-primary-text">
                  {formatarMoeda(0)}
                </p>
              </div>
              <div className="flex items-center justify-between p-3 bg-primary-bg rounded-lg">
                <p className="text-sm font-medium text-primary-text">Total de Suprimentos</p>
                <p className="text-sm font-bold text-success">
                  {formatarMoeda(somaSuprimentos)}
                </p>
              </div>
              <div className="flex items-center justify-between p-3 bg-primary-bg rounded-lg">
                <p className="text-sm font-medium text-primary-text">Total de Sangrias</p>
                <p className="text-sm font-bold text-error">
                  {formatarMoeda(somaSangrias)}
                </p>
              </div>
              <div className="flex items-center justify-between p-3 bg-primary-bg rounded-lg border-t-2 border-alternate">
                <p className="text-sm font-bold text-primary-text">Saldo Final</p>
                <p className="text-lg font-bold text-tertiary">
                  {formatarMoeda(saldoCaixa)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Histórico de Operações */}
        <div className="mb-6">
          <div className="flex items-center gap-5 mb-5">
            <h3 className="text-secondary text-sm font-semibold font-exo">
              Histórico de Operações
            </h3>
            <div className="flex-1 h-[1px] bg-alternate"></div>
          </div>

          <div className="bg-info rounded-[6px] p-4">
            {operacoes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-secondary-text">Nenhuma operação registrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {operacoes.map((operacao) => (
                  <div
                    key={operacao.getId()}
                    className="flex items-center justify-between p-3 bg-primary-bg rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {operacao.isSuprimento() ? '⬇️' : '⬆️'}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-primary-text">
                          {operacao.getDescricao()}
                        </p>
                        <p className="text-xs text-secondary-text">
                          {operacao.getDataCriacao().toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        operacao.isSuprimento() ? 'text-success' : 'text-error'
                      }`}
                    >
                      {operacao.isSuprimento() ? '+' : '-'}
                      {formatarMoeda(operacao.getValor())}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


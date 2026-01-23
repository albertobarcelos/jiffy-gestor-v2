'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Caixa } from '@/src/domain/entities/Caixa'
import { OperacaoCaixa } from '@/src/domain/entities/OperacaoCaixa'
import { useAuthStore } from '@/src/presentation/stores/authStore'

/**
 * Componente principal de Meu Caixa
 * Replica o design e funcionalidades do Flutter
 */
export function MeuCaixaView() {
  const router = useRouter()
  const { auth } = useAuthStore()
  const [caixaAtual, setCaixaAtual] = useState<Caixa | null>(null)
  const [operacoes, setOperacoes] = useState<OperacaoCaixa[]>([])
  const [saldoCaixa, setSaldoCaixa] = useState(0)
  const [somaSuprimentos, setSomaSuprimentos] = useState(0)
  const [somaSangrias, setSomaSangrias] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [mostrarModalSangria, setMostrarModalSangria] = useState(false)
  const [mostrarModalSuprimento, setMostrarModalSuprimento] = useState(false)
  const [mostrarModalFechar, setMostrarModalFechar] = useState(false)

  // Buscar dados do caixa
  useEffect(() => {
    const buscarCaixa = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoading(true)
      try {
        // TODO: Implementar chamada à API quando disponível
        // Por enquanto, dados mockados
        const mockCaixa = Caixa.create(
          '1',
          'Aberto',
          new Date(),
          undefined,
          undefined,
          undefined,
          new Date(),
          new Date()
        )
        setCaixaAtual(mockCaixa)

        // Calcular totais
        const suprimentos = operacoes.filter(op => op.isSuprimento())
        const sangrias = operacoes.filter(op => op.isSangria())
        
        setSomaSuprimentos(suprimentos.reduce((sum, op) => sum + op.getValor(), 0))
        setSomaSangrias(sangrias.reduce((sum, op) => sum + op.getValor(), 0))
        setSaldoCaixa(somaSuprimentos - somaSangrias)
      } catch (error) {
        console.error('Erro ao buscar caixa:', error)
      } finally {
        setIsLoading(false)
      }
    }

    buscarCaixa()
  }, [auth, operacoes, somaSuprimentos, somaSangrias])

  const formatarData = (data: Date) => {
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-[30px] pt-[30px] pb-[100px]">
        {/* Header com data de abertura */}
        <div className="mb-6">
          <div className="h-10 bg-white/20 rounded-tl-[16px] rounded-br-[6px] rounded-bl-[6px] rounded-tr-[6px] flex items-center justify-between px-5">
            <p className="text-primary text-sm font-semibold font-exo">
              {caixaAtual
                ? `Aberto em ${formatarData(caixaAtual.getDataAbertura())}`
                : 'Carregando...'}
            </p>
           
            <button
              onClick={() => router.push('/historico-fechamento')}
              className="h-9 px-6 bg-primary text-info rounded-[30px] font-medium font-exo text-sm hover:bg-primary/90 transition-colors"
            >
              Histórico de Fechamentos
            </button>
            <button
              onClick={() => setMostrarModalFechar(true)}
              className="h-9 px-6 bg-primary text-info rounded-[30px] font-medium font-exo text-sm hover:bg-primary/90 transition-colors"
            >
              Fechar Caixa
            </button>
          </div>
        </div>

        {/* Cards de valores */}
        <div className="grid grid-cols-3 gap-[30px] mb-[30px]">
          {/* Saldo em Caixa */}
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

          {/* Suprimentos */}
          <button
            onClick={() => setMostrarModalSuprimento(true)}
            className="h-[120px] bg-info rounded-[10px] p-3 flex flex-col hover:bg-info/80 transition-colors"
          >
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
          </button>

          {/* Sangrias */}
          <button
            onClick={() => setMostrarModalSangria(true)}
            className="h-[120px] bg-info rounded-[10px] p-3 flex flex-col hover:bg-info/80 transition-colors"
          >
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
          </button>
        </div>

        {/* Histórico de Operações */}
        <div className="mb-5">
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

      {/* Modal de Sangria */}
      {mostrarModalSangria && (
        <CriarSangriaModal
          onClose={() => setMostrarModalSangria(false)}
          onConfirm={(valor, descricao) => {
            // TODO: Implementar criação de sangria
            console.log('Criar sangria:', { valor, descricao })
            setMostrarModalSangria(false)
          }}
        />
      )}

      {/* Modal de Suprimento */}
      {mostrarModalSuprimento && (
        <CriarSuprimentoModal
          onClose={() => setMostrarModalSuprimento(false)}
          onConfirm={(valor, descricao) => {
            // TODO: Implementar criação de suprimento
            console.log('Criar suprimento:', { valor, descricao })
            setMostrarModalSuprimento(false)
          }}
        />
      )}

      {/* Modal de Fechar Caixa */}
      {mostrarModalFechar && (
        <FecharCaixaModal
          onClose={() => setMostrarModalFechar(false)}
          onConfirm={(observacoes) => {
            // TODO: Implementar fechamento de caixa
            console.log('Fechar caixa:', { observacoes })
            setMostrarModalFechar(false)
            router.push('/meu-caixa/fechamentos')
          }}
        />
      )}
    </div>
  )
}

// Componente Modal de Criar Sangria
function CriarSangriaModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: (valor: number, descricao: string) => void
}) {
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')

  const handleConfirm = () => {
    const valorNum = parseFloat(valor)
    if (!valorNum || valorNum <= 0 || !descricao.trim()) {
      alert('Preencha todos os campos corretamente')
      return
    }
    onConfirm(valorNum, descricao)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-primary-bg rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-primary-text">Criar Sangria</h3>
          <button onClick={onClose} className="text-secondary-text hover:text-primary-text">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-text mb-2">
              Valor
            </label>
            <input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              min="0"
              step="0.01"
              className="w-full h-12 px-4 rounded-lg border border-secondary bg-info text-primary-text focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-text mb-2">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Digite a descrição da sangria"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-secondary bg-info text-primary-text focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 h-12 bg-primary text-info rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Confirmar
            </button>
            <button
              onClick={onClose}
              className="flex-1 h-12 bg-secondary-bg text-primary-text rounded-lg font-medium hover:bg-secondary-bg/80 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente Modal de Criar Suprimento
function CriarSuprimentoModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: (valor: number, descricao: string) => void
}) {
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')

  const handleConfirm = () => {
    const valorNum = parseFloat(valor)
    if (!valorNum || valorNum <= 0 || !descricao.trim()) {
      alert('Preencha todos os campos corretamente')
      return
    }
    onConfirm(valorNum, descricao)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-primary-bg rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-primary-text">Criar Suprimento</h3>
          <button onClick={onClose} className="text-secondary-text hover:text-primary-text">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-text mb-2">
              Valor
            </label>
            <input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              min="0"
              step="0.01"
              className="w-full h-12 px-4 rounded-lg border border-secondary bg-info text-primary-text focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-text mb-2">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Digite a descrição do suprimento"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-secondary bg-info text-primary-text focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 h-12 bg-primary text-info rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Confirmar
            </button>
            <button
              onClick={onClose}
              className="flex-1 h-12 bg-secondary-bg text-primary-text rounded-lg font-medium hover:bg-secondary-bg/80 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente Modal de Fechar Caixa
function FecharCaixaModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: (observacoes?: string) => void
}) {
  const [observacoes, setObservacoes] = useState('')

  const handleConfirm = () => {
    if (confirm('Tem certeza que deseja fechar o caixa?')) {
      onConfirm(observacoes || undefined)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-primary-bg rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-primary-text">Fechar Caixa</h3>
          <button onClick={onClose} className="text-secondary-text hover:text-primary-text">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-text mb-2">
              Observações (opcional)
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Digite observações sobre o fechamento"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-secondary bg-info text-primary-text focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 h-12 bg-primary text-info rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Confirmar Fechamento
            </button>
            <button
              onClick={onClose}
              className="flex-1 h-12 bg-secondary-bg text-primary-text rounded-lg font-medium hover:bg-secondary-bg/80 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


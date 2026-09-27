'use client'

import { useEffect, useRef, useState } from 'react'
import { MdArrowBack, MdHistory } from 'react-icons/md'
import { TbCashRegister } from 'react-icons/tb'
import { showToast } from '@/src/shared/utils/toast'
import {
  DESCRICAO_FUNDO_TROCO,
  validarMovimentacaoCaixaEstacao,
  validarSangriaContraSaldo,
  validarSuprimentoCaixaEstacao,
} from '@/src/domain/caixa-estacao/regrasCaixaEstacao'
import { previewDiferencaFechamento } from '@/src/application/use-cases/caixa-estacao/FecharCaixaEstacaoUseCase'
import { useEstacaoDestePc } from '@/src/presentation/hooks/caixa-estacao/useEstacaoDestePc'
import { useCaixaEstacaoAtual } from '@/src/presentation/hooks/caixa-estacao/useCaixaEstacaoAtual'
import {
  useRegistrarSangriaCaixaEstacao,
  useRegistrarSuprimentoCaixaEstacao,
} from '@/src/presentation/hooks/caixa-estacao/useMovimentacoesCaixaEstacao'
import { useFecharCaixaEstacao } from '@/src/presentation/hooks/caixa-estacao/useFecharCaixaEstacao'
import {
  useDeliveryConfigEstacaoImpressao,
  useDeliveryConfigEstacoesImpressao,
} from '@/src/presentation/hooks/useDeliveryConfigImpressaoQueries'
import { usePreferenciasImpressaoDelivery } from '@/src/presentation/hooks/usePreferenciasImpressaoDelivery'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { imprimirFechamentoCaixaEstacaoPorId } from '@/src/infrastructure/printing/imprimirCupomFechamentoCaixaEstacao'
import { CaixaEstacaoNaoVinculada } from './CaixaEstacaoNaoVinculada'
import { cn } from '@/src/shared/utils/cn'

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function parseCurrencyInput(value: string): number {
  const numbers = value.replace(/[^\d]/g, '')
  if (!numbers) return 0
  return parseFloat(numbers) / 100
}

function formatCurrencyInput(value: string): string {
  const numbers = value.replace(/[^\d]/g, '')
  if (!numbers) return 'R$ 0,00'
  return formatarMoeda(parseFloat(numbers) / 100)
}

function CaixasRecentesButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-primary/30 bg-white text-sm font-semibold text-primary shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
    >
      <MdHistory className="h-4 w-4" aria-hidden />
      Caixas recentes
    </button>
  )
}

function CaixaPainel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm', className)}>
      {children}
    </div>
  )
}

export function MeuCaixaView({
  onVerRecentes,
  onAbrirConfiguracaoEstacao,
}: {
  onVerRecentes?: () => void
  onAbrirConfiguracaoEstacao?: () => void
}) {
  const { estacaoId, lembrarNome } = useEstacaoDestePc()
  const estacoesQuery = useDeliveryConfigEstacoesImpressao(Boolean(estacaoId))
  const estacaoImpressaoQuery = useDeliveryConfigEstacaoImpressao(Boolean(estacaoId))
  const { preferenciasImpressaoDelivery } = usePreferenciasImpressaoDelivery()
  const atual = useCaixaEstacaoAtual(estacaoId)
  const aberta = atual.data?.aberta === true
  const operacao = atual.data?.operacao
  const suprimentoMut = useRegistrarSuprimentoCaixaEstacao(estacaoId)
  const sangriaMut = useRegistrarSangriaCaixaEstacao(estacaoId)
  const fecharMut = useFecharCaixaEstacao(estacaoId)

  const [passo, setPasso] = useState<'resumo' | 'fechar' | 'suprimento' | 'sangria'>('resumo')
  const [valorAbertura, setValorAbertura] = useState('R$ 0,00')
  const inputAberturaRef = useRef<HTMLInputElement>(null)

  const valorAberturaNumerico = parseCurrencyInput(valorAbertura)
  const validacaoAbertura = validarSuprimentoCaixaEstacao({
    valor: valorAberturaNumerico,
    descricao: DESCRICAO_FUNDO_TROCO,
  })
  const podeAbrir = validacaoAbertura.ok && !suprimentoMut.isPending

  useEffect(() => {
    if (operacao?.estacao.nome) {
      lembrarNome(operacao.estacao.nome)
    }
  }, [lembrarNome, operacao?.estacao.nome])

  useEffect(() => {
    const encontrada = estacoesQuery.data?.find(item => item.id === estacaoId)
    if (encontrada?.nome) {
      lembrarNome(encontrada.nome)
    }
  }, [estacaoId, estacoesQuery.data, lembrarNome])

  useEffect(() => {
    if (aberta || passo !== 'resumo') return
    const timer = window.setTimeout(() => inputAberturaRef.current?.focus(), 120)
    return () => window.clearTimeout(timer)
  }, [aberta, passo])

  if (!estacaoId) {
    if (!onAbrirConfiguracaoEstacao) {
      return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-secondary-text">
          Estação deste computador não configurada.
        </div>
      )
    }
    return <CaixaEstacaoNaoVinculada onAbrirConfiguracao={onAbrirConfiguracaoEstacao} />
  }

  if (atual.isLoading) {
    return (
      <CaixaPainel>
        <p className="py-10 text-center text-sm text-secondary-text">Carregando caixa…</p>
      </CaixaPainel>
    )
  }

  if (atual.isError) {
    return (
      <CaixaPainel className="border-red-200 bg-red-50">
        <p className="text-sm text-error">
          {atual.error instanceof Error ? atual.error.message : 'Erro ao consultar o caixa da estação.'}
        </p>
      </CaixaPainel>
    )
  }

  const esperado = operacao?.resumoCaixa?.valorLiquidoDinheiroCaixa ?? 0

  if (passo === 'suprimento' || passo === 'sangria') {
    return (
      <MovimentacaoCaixaForm
        tipo={passo}
        saldoDisponivel={esperado}
        ocupado={passo === 'suprimento' ? suprimentoMut.isPending : sangriaMut.isPending}
        onVoltar={() => setPasso('resumo')}
        onConfirm={input => {
          const tipoAtual = passo
          setPasso('resumo')
          const mutPromise =
            tipoAtual === 'suprimento'
              ? suprimentoMut.mutateAsync(input)
              : sangriaMut.mutateAsync({ ...input, saldoDisponivel: esperado })
          void mutPromise.then(
            () =>
              showToast.success(
                tipoAtual === 'suprimento' ? 'Suprimento registrado.' : 'Sangria registrada.'
              ),
            error =>
              showToast.error(
                error instanceof Error ? error.message : 'Não foi possível registrar a movimentação.'
              )
          )
        }}
      />
    )
  }

  if (passo === 'fechar') {
    return (
      <FecharCaixaForm
        esperado={esperado}
        ocupado={fecharMut.isPending}
        onVoltar={() => setPasso('resumo')}
        onConfirm={async valorFornecido => {
          try {
            const resultado = await fecharMut.mutateAsync({ valorFornecido })
            setPasso('resumo')
            setValorAbertura('R$ 0,00')
            showToast.success('Caixa fechado com sucesso.')

            const operacaoCaixaId = resultado?.operacaoCaixaId?.trim()
            const token = useAuthStore.getState().tenantAuth?.getAccessToken()
            if (operacaoCaixaId && token) {
              const impressao = await imprimirFechamentoCaixaEstacaoPorId({
                token,
                operacaoCaixaId,
                impressoraExpedicaoId: preferenciasImpressaoDelivery.impressoraExpedicaoId,
                mapeamentos: estacaoImpressaoQuery.data?.mapeamentos ?? [],
              })
              if (impressao.ok) {
                showToast.success('Cupom de fechamento enviado à impressora de expedição.')
              } else if (impressao.mensagem) {
                showToast.warning(impressao.mensagem)
              }
            }
          } catch (error) {
            showToast.error(error instanceof Error ? error.message : 'Não foi possível fechar o caixa.')
          }
        }}
      />
    )
  }

  if (aberta) {
    return (
      <div className="space-y-4">
        {onVerRecentes ? <CaixasRecentesButton onClick={onVerRecentes} /> : null}

        <CaixaPainel>
          {operacao ? (
            <div>
              <p className="text-xs text-secondary-text">
                Aberto {formatarData(operacao.dataAbertura)}
              </p>
              {operacao.abertoPorAtor?.nome ? (
                <p className="mt-0.5 text-xs text-secondary-text">
                  Por {operacao.abertoPorAtor.nome}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className={cn('grid grid-cols-2 gap-2', operacao ? 'mt-3' : '')}>
            <CaixaResumoCelula
              label="Vendas"
              valor={String(operacao?.resumoOperacao?.countVendasEfetivadas ?? 0)}
            />
            <CaixaResumoCelula
              label="Total vendido"
              valor={formatarMoeda(operacao?.resumoOperacao?.totalLiquido ?? 0)}
            />
            <CaixaResumoCelula
              label="Suprimentos"
              valor={formatarMoeda(operacao?.resumoCaixa?.totalSuprimento ?? 0)}
              destaque="positivo"
            />
            <CaixaResumoCelula
              label="Sangrias"
              valor={formatarMoeda(operacao?.resumoCaixa?.totalSangria ?? 0)}
              destaque="negativo"
            />
          </div>

          <div className={cn('mt-3 rounded-xl bg-gray-50 px-4 py-3')}>
            <p className="text-xs font-medium text-secondary-text">Saldo em dinheiro</p>
            <p className="mt-0.5 text-2xl font-semibold tracking-tight text-primary">
              {formatarMoeda(esperado)}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={suprimentoMut.isPending || sangriaMut.isPending}
              onClick={() => setPasso('suprimento')}
              className="flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-semibold text-primary-text transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              Suprimento
            </button>
            <button
              type="button"
              disabled={suprimentoMut.isPending || sangriaMut.isPending}
              onClick={() => setPasso('sangria')}
              className="flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-semibold text-primary-text transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              Sangria
            </button>
          </div>

          <button
            type="button"
            disabled={fecharMut.isPending}
            onClick={() => setPasso('fechar')}
            className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Fechar caixa
          </button>
        </CaixaPainel>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {onVerRecentes ? <CaixasRecentesButton onClick={onVerRecentes} /> : null}

      <CaixaPainel className="space-y-5">
        <div>
          <label htmlFor="valor-abertura-caixa" className="mb-2 block text-sm font-medium text-primary-text">
            Valor da abertura
          </label>
          <input
            ref={inputAberturaRef}
            id="valor-abertura-caixa"
            type="text"
            inputMode="numeric"
            value={valorAbertura}
            onChange={event => setValorAbertura(formatCurrencyInput(event.target.value))}
            className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 text-lg font-semibold tracking-tight text-primary-text outline-none transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
          />
          <p className="mt-2 text-xs text-secondary-text">
            Fundo de troco para iniciar o caixa.
          </p>
        </div>

        <button
          type="button"
          disabled={!podeAbrir}
          onClick={async () => {
            try {
              await suprimentoMut.mutateAsync({
                valor: valorAberturaNumerico,
                descricao: DESCRICAO_FUNDO_TROCO,
              })
              showToast.success('Caixa aberto.')
              setValorAbertura('R$ 0,00')
            } catch (error) {
              showToast.error(error instanceof Error ? error.message : 'Não foi possível abrir o caixa.')
            }
          }}
          className={cn(
            'flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all',
            podeAbrir
              ? 'bg-primary text-white hover:opacity-90'
              : 'cursor-not-allowed bg-gray-200 text-gray-400'
          )}
        >
          <TbCashRegister className="h-4 w-4" aria-hidden />
          {suprimentoMut.isPending ? 'Abrindo…' : 'Abrir caixa'}
        </button>
      </CaixaPainel>
    </div>
  )
}

function CaixaResumoCelula({
  label,
  valor,
  destaque,
}: {
  label: string
  valor: string
  destaque?: 'positivo' | 'negativo'
}) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5">
      <p className="text-[11px] font-medium text-secondary-text">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-sm font-semibold tracking-tight',
          destaque === 'positivo'
            ? 'text-emerald-600'
            : destaque === 'negativo'
              ? 'text-red-500'
              : 'text-primary-text'
        )}
      >
        {valor}
      </p>
    </div>
  )
}

function MovimentacaoCaixaForm({
  tipo,
  saldoDisponivel,
  ocupado,
  onVoltar,
  onConfirm,
}: {
  tipo: 'suprimento' | 'sangria'
  saldoDisponivel: number
  ocupado: boolean
  onVoltar: () => void
  onConfirm: (input: { valor: number; descricao: string }) => Promise<void>
}) {
  const [valor, setValor] = useState('R$ 0,00')
  const [descricao, setDescricao] = useState('')
  const valorNumerico = parseCurrencyInput(valor)
  const validacaoBase =
    tipo === 'suprimento'
      ? validarSuprimentoCaixaEstacao({ valor: valorNumerico, descricao })
      : validarMovimentacaoCaixaEstacao({ valor: valorNumerico, descricao })
  const validacaoSangria =
    tipo === 'sangria'
      ? validarSangriaContraSaldo(valorNumerico, saldoDisponivel)
      : { ok: true as const }
  const podeConfirmar =
    validacaoBase.ok && validacaoSangria.ok && !ocupado

  return (
    <FormCard titulo={tipo === 'suprimento' ? 'Suprimento' : 'Sangria'} onVoltar={onVoltar}>
      {tipo === 'sangria' ? (
        <p className="mb-3 text-xs text-secondary-text">
          Saldo disponível:{' '}
          <span className="font-semibold text-primary-text">{formatarMoeda(saldoDisponivel)}</span>
        </p>
      ) : null}
      <div className="space-y-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-primary-text">Valor</span>
          <input
            type="text"
            inputMode="numeric"
            value={valor}
            onChange={event => setValor(formatCurrencyInput(event.target.value))}
            className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 text-lg font-semibold tracking-tight outline-none transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-primary-text">Descrição</span>
          <input
            type="text"
            value={descricao}
            onChange={event => setDescricao(event.target.value)}
            placeholder={tipo === 'suprimento' ? 'Ex.: Reforço de troco' : 'Ex.: Depósito no banco'}
            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 text-sm outline-none transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
          />
        </label>
        {!validacaoBase.ok ? (
          <p className="text-xs text-error">{validacaoBase.message}</p>
        ) : !validacaoSangria.ok ? (
          <p className="text-xs text-error">{validacaoSangria.message}</p>
        ) : null}
        <button
          type="button"
          disabled={!podeConfirmar}
          onClick={() =>
            void onConfirm({ valor: valorNumerico, descricao: descricao.trim() })
          }
          className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-60"
        >
          {ocupado ? 'Salvando…' : 'Confirmar'}
        </button>
      </div>
    </FormCard>
  )
}

function FormCard({
  titulo,
  onVoltar,
  children,
}: {
  titulo: string
  onVoltar: () => void
  children: React.ReactNode
}) {
  return (
    <CaixaPainel>
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onVoltar}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-secondary-text transition-colors hover:bg-gray-50 hover:text-primary-text"
          aria-label="Voltar"
        >
          <MdArrowBack className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-semibold text-primary-text">{titulo}</h3>
      </div>
      {children}
    </CaixaPainel>
  )
}

function FecharCaixaForm({
  esperado,
  ocupado,
  onVoltar,
  onConfirm,
}: {
  esperado: number
  ocupado: boolean
  onVoltar: () => void
  onConfirm: (valorFornecido: number) => Promise<void>
}) {
  const [valor, setValor] = useState(formatarMoeda(esperado))
  const fornecido = parseCurrencyInput(valor)
  const diferenca = Number.isFinite(fornecido) ? previewDiferencaFechamento(fornecido, esperado) : 0

  return (
    <FormCard titulo="Fechar caixa" onVoltar={onVoltar}>
      <div className="mb-4 rounded-xl bg-gray-50 px-4 py-3">
        <p className="text-xs font-medium text-secondary-text">Esperado em dinheiro</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-primary">
          {formatarMoeda(esperado)}
        </p>
      </div>
      <div className="space-y-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-primary-text">Valor contado</span>
          <input
            type="text"
            inputMode="numeric"
            value={valor}
            onChange={event => setValor(formatCurrencyInput(event.target.value))}
            className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 text-lg font-semibold tracking-tight outline-none transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <p className="text-sm text-secondary-text">
          Diferença:{' '}
          <strong
            className={cn(
              diferenca === 0 ? 'text-primary-text' : diferenca > 0 ? 'text-emerald-600' : 'text-red-500'
            )}
          >
            {formatarMoeda(diferenca)}
          </strong>
        </p>
        <button
          type="button"
          disabled={ocupado || !Number.isFinite(fornecido) || fornecido < 0}
          onClick={() => void onConfirm(fornecido)}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-60"
        >
          Confirmar fechamento
        </button>
      </div>
    </FormCard>
  )
}

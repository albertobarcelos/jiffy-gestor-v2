'use client'

import { useEffect, useMemo, useState } from 'react'
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import {
  JiffySidePanelModal,
  Z_INDEX_SOBRE_PAINEL_LATERAL,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import { calcularDiferencaFechamento } from '@/src/domain/caixa-estacao/regrasCaixaEstacao'
import { useFecharCaixaTerminal } from './hooks/useFecharCaixaTerminal'
import { sxEntradaCompactaProdutoSelect } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { usePreferenciasImpressaoDelivery } from '@/src/presentation/hooks/usePreferenciasImpressaoDelivery'
import { useEstacaoImpressaoDestePc } from '@/src/presentation/hooks/useEstacaoImpressaoQueries'
import { imprimirFechamentoCaixaTerminalPorId } from '@/src/infrastructure/printing/imprimirCupomFechamentoCaixaTerminal'

type UsuarioPdvOption = {
  id: string
  nome: string
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
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

export type FecharCaixaTerminalSidePanelProps = {
  open: boolean
  onClose: () => void
  onFechado: () => void
  terminalId: string
  codigoTerminal?: string | null
  nomeTerminal?: string | null
  valorEsperado: number
  abertoPorId?: string | null
  abertoPorNome?: string | null
}

export function FecharCaixaTerminalSidePanel({
  open,
  onClose,
  onFechado,
  terminalId,
  codigoTerminal,
  nomeTerminal,
  valorEsperado,
  abertoPorId,
  abertoPorNome,
}: FecharCaixaTerminalSidePanelProps) {
  const fecharMut = useFecharCaixaTerminal(terminalId)
  const { preferenciasImpressaoDelivery } = usePreferenciasImpressaoDelivery()
  const estacaoImpressaoQuery = useEstacaoImpressaoDestePc(open)
  const [valor, setValor] = useState(formatarMoeda(valorEsperado))
  const [fechadoPorId, setFechadoPorId] = useState(abertoPorId?.trim() || '')
  const [usuarios, setUsuarios] = useState<UsuarioPdvOption[]>([])
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false)

  const fornecido = parseCurrencyInput(valor)
  const diferenca = Number.isFinite(fornecido)
    ? calcularDiferencaFechamento(fornecido, valorEsperado)
    : 0

  const labelTerminal =
    [codigoTerminal, nomeTerminal].filter(Boolean).join(' · ') || 'Terminal'

  const usuariosComAbertura = useMemo(() => {
    const map = new Map<string, UsuarioPdvOption>()
    for (const u of usuarios) map.set(u.id, u)
    const aberturaId = abertoPorId?.trim()
    if (aberturaId && !map.has(aberturaId)) {
      map.set(aberturaId, {
        id: aberturaId,
        nome: abertoPorNome?.trim() || 'Operador que abriu o caixa',
      })
    }
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [usuarios, abertoPorId, abertoPorNome])

  useEffect(() => {
    if (!open) return
    setValor(formatarMoeda(valorEsperado))
    setFechadoPorId(abertoPorId?.trim() || '')
  }, [open, valorEsperado, abertoPorId])

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function carregarUsuarios() {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) return

      setCarregandoUsuarios(true)
      try {
        const all: UsuarioPdvOption[] = []
        let offset = 0
        let hasMore = true
        const limit = 100

        while (hasMore) {
          const params = new URLSearchParams({
            limit: String(limit),
            offset: String(offset),
            ativo: 'true',
          })
          const response = await fetchGestorApi(`/api/usuarios?${params.toString()}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          if (!response.ok) break
          const data = await response.json()
          const page = (data.items || []).map((u: { id?: string; nome?: string; name?: string }) => ({
            id: String(u.id || ''),
            nome: String(u.nome || u.name || 'Sem nome'),
          })).filter((u: UsuarioPdvOption) => u.id)

          all.push(...page)
          hasMore = page.length === limit
          offset += page.length
        }

        if (!cancelled) setUsuarios(all)
      } catch (error) {
        console.error('Erro ao carregar usuários PDV:', error)
        if (!cancelled) showToast.error('Não foi possível carregar os usuários PDV.')
      } finally {
        if (!cancelled) setCarregandoUsuarios(false)
      }
    }

    void carregarUsuarios()
    return () => {
      cancelled = true
    }
  }, [open])

  const podeConfirmar =
    !fecharMut.isPending &&
    Number.isFinite(fornecido) &&
    fornecido >= 0 &&
    Boolean(fechadoPorId.trim())

  async function handleConfirmar() {
    if (!podeConfirmar) return
    try {
      const resultado = await fecharMut.mutateAsync({
        valorFornecido: fornecido,
        fechadoPorId: fechadoPorId.trim(),
      })
      showToast.success('Caixa do terminal fechado com sucesso.')

      const operacaoId = resultado?.operacaoCaixaTerminalId?.trim()
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (operacaoId && token) {
        let mapeamentos = estacaoImpressaoQuery.data?.mapeamentos ?? []
        if (mapeamentos.length === 0) {
          const refetch = await estacaoImpressaoQuery.refetch()
          mapeamentos = refetch.data?.mapeamentos ?? []
        }
        const impressao = await imprimirFechamentoCaixaTerminalPorId({
          token,
          operacaoCaixaId: operacaoId,
          impressoraExpedicaoId: preferenciasImpressaoDelivery.impressoraExpedicaoId,
          mapeamentos,
        })
        if (impressao.ok) {
          showToast.success('Cupom de fechamento enviado à impressora de expedição.')
        } else if (impressao.mensagem) {
          showToast.warning(impressao.mensagem)
        }
      }

      onFechado()
      onClose()
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : 'Não foi possível fechar o caixa do terminal.'
      showToast.error(message)
    }
  }

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title="Fechar caixa do terminal"
      fullScreenOnMobile
      panelClassName="!bg-[#f9fafb] w-[min(100vw-1rem,420px)] min-w-[280px]"
      footerSlot={
        <button
          type="button"
          disabled={!podeConfirmar}
          onClick={() => void handleConfirmar()}
          className="flex h-full w-full items-center justify-center rounded-bl-lg bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {fecharMut.isPending ? 'Fechando…' : 'Confirmar fechamento'}
        </button>
      }
    >
      <div className="space-y-5 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-secondary-text">
            Terminal
          </p>
          <p className="mt-1 text-sm font-semibold text-primary-text">{labelTerminal}</p>
        </div>

        <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200/80">
          <p className="text-xs font-medium text-secondary-text">Esperado em dinheiro</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight text-primary">
            {formatarMoeda(valorEsperado)}
          </p>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-primary-text">Valor contado</span>
          <input
            type="text"
            inputMode="numeric"
            value={valor}
            onChange={event => setValor(formatCurrencyInput(event.target.value))}
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-lg font-semibold tracking-tight outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>

        <p className="text-sm text-secondary-text">
          Diferença:{' '}
          <strong
            className={cn(
              diferenca === 0
                ? 'text-primary-text'
                : diferenca > 0
                  ? 'text-emerald-600'
                  : 'text-red-500'
            )}
          >
            {formatarMoeda(diferenca)}
          </strong>
        </p>

        <FormControl fullWidth size="small">
          <InputLabel id="fechado-por-pdv-label">Responsável pelo fechamento</InputLabel>
          <Select
            labelId="fechado-por-pdv-label"
            label="Responsável pelo fechamento"
            value={fechadoPorId}
            disabled={carregandoUsuarios || fecharMut.isPending}
            onChange={event => setFechadoPorId(String(event.target.value))}
            sx={sxEntradaCompactaProdutoSelect}
            MenuProps={{
              sx: { zIndex: Z_INDEX_SOBRE_PAINEL_LATERAL },
            }}
          >
            {usuariosComAbertura.map(usuario => (
              <MenuItem key={usuario.id} value={usuario.id}>
                {usuario.nome}
                {usuario.id === abertoPorId?.trim() ? ' (abriu o caixa)' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
    </JiffySidePanelModal>
  )
}

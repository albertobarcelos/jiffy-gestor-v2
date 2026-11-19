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
import {
  validarMovimentacaoCaixaEstacao,
  validarSangriaContraSaldo,
  validarSuprimentoCaixaEstacao,
} from '@/src/domain/caixa-estacao/regrasCaixaEstacao'
import { sxEntradaCompactaProdutoSelect } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import {
  useHistoricoMovimentacoesCaixaTerminal,
  useRegistrarSangriaCaixaTerminal,
  useRegistrarSuprimentoCaixaTerminal,
} from './hooks/useMovimentacoesCaixaTerminal'

type UsuarioPdvOption = { id: string; nome: string }

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

function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export type MovimentacaoCaixaTerminalSidePanelProps = {
  open: boolean
  onClose: () => void
  onRegistrado: () => void
  tipo: 'sangria' | 'suprimento'
  terminalId: string
  codigoTerminal?: string | null
  nomeTerminal?: string | null
  saldoDisponivel: number
  abertoPorId?: string | null
}

export function MovimentacaoCaixaTerminalSidePanel({
  open,
  onClose,
  onRegistrado,
  tipo,
  terminalId,
  codigoTerminal,
  nomeTerminal,
  saldoDisponivel,
  abertoPorId,
}: MovimentacaoCaixaTerminalSidePanelProps) {
  const suprimentoMut = useRegistrarSuprimentoCaixaTerminal(terminalId)
  const sangriaMut = useRegistrarSangriaCaixaTerminal(terminalId)
  const historico = useHistoricoMovimentacoesCaixaTerminal(
    terminalId,
    tipo === 'suprimento' ? 'suprimentos' : 'sangrias',
    open
  )

  const [valor, setValor] = useState('R$ 0,00')
  const [descricao, setDescricao] = useState('')
  const [realizadoPorId, setRealizadoPorId] = useState(abertoPorId?.trim() || '')
  const [usuarios, setUsuarios] = useState<UsuarioPdvOption[]>([])
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false)

  const valorNumerico = parseCurrencyInput(valor)
  const ocupado = tipo === 'suprimento' ? suprimentoMut.isPending : sangriaMut.isPending
  const validacaoBase =
    tipo === 'suprimento'
      ? validarSuprimentoCaixaEstacao({ valor: valorNumerico, descricao })
      : validarMovimentacaoCaixaEstacao({ valor: valorNumerico, descricao })
  const validacaoSangria =
    tipo === 'sangria'
      ? validarSangriaContraSaldo(valorNumerico, saldoDisponivel)
      : ({ ok: true } as const)

  const labelTerminal =
    [codigoTerminal, nomeTerminal].filter(Boolean).join(' · ') || 'Terminal'

  const usuariosComAbertura = useMemo(() => {
    const map = new Map<string, UsuarioPdvOption>()
    for (const u of usuarios) map.set(u.id, u)
    const aberturaId = abertoPorId?.trim()
    if (aberturaId && !map.has(aberturaId)) {
      map.set(aberturaId, { id: aberturaId, nome: 'Operador que abriu o caixa' })
    }
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [usuarios, abertoPorId])

  useEffect(() => {
    if (!open) return
    setValor('R$ 0,00')
    setDescricao('')
    setRealizadoPorId(abertoPorId?.trim() || '')
  }, [open, abertoPorId, tipo])

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
          const page = (data.items || [])
            .map((u: { id?: string; nome?: string; name?: string }) => ({
              id: String(u.id || ''),
              nome: String(u.nome || u.name || 'Sem nome'),
            }))
            .filter((u: UsuarioPdvOption) => u.id)
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
    !ocupado &&
    validacaoBase.ok &&
    validacaoSangria.ok &&
    Boolean(realizadoPorId.trim())

  async function handleConfirmar() {
    if (!podeConfirmar) return
    const payload = {
      valor: valorNumerico,
      descricao: descricao.trim(),
      realizadoPorId: realizadoPorId.trim(),
    }
    try {
      if (tipo === 'suprimento') {
        await suprimentoMut.mutateAsync(payload)
        showToast.success('Suprimento registrado.')
      } else {
        await sangriaMut.mutateAsync({ ...payload, saldoDisponivel })
        showToast.success('Sangria registrada.')
      }
      onRegistrado()
      onClose()
    } catch (error) {
      showToast.error(
        error instanceof Error && error.message.trim()
          ? error.message
          : 'Não foi possível registrar a movimentação.'
      )
    }
  }

  const itens = historico.data ?? []

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title={tipo === 'suprimento' ? 'Suprimento' : 'Sangria'}
      fullScreenOnMobile
      panelClassName="!bg-[#f9fafb] w-[min(100vw-1rem,420px)] min-w-[280px]"
      footerSlot={
        <button
          type="button"
          disabled={!podeConfirmar}
          onClick={() => void handleConfirmar()}
          className="flex h-full w-full items-center justify-center rounded-bl-lg bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ocupado ? 'Salvando…' : 'Confirmar'}
        </button>
      }
    >
      <div className="space-y-4 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-secondary-text">
            Terminal
          </p>
          <p className="mt-1 text-sm font-semibold text-primary-text">{labelTerminal}</p>
        </div>

        {tipo === 'sangria' ? (
          <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200/80">
            <p className="text-xs font-medium text-secondary-text">Saldo em dinheiro</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight text-primary">
              {formatarMoeda(saldoDisponivel)}
            </p>
          </div>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-primary-text">Valor</span>
          <input
            type="text"
            inputMode="numeric"
            value={valor}
            onChange={event => setValor(formatCurrencyInput(event.target.value))}
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-lg font-semibold tracking-tight outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-primary-text">Descrição</span>
          <input
            type="text"
            value={descricao}
            onChange={event => setDescricao(event.target.value)}
            placeholder={
              tipo === 'suprimento' ? 'Ex.: Reforço de troco' : 'Ex.: Depósito no banco'
            }
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>

        {!validacaoBase.ok ? (
          <p className="text-xs text-error">{validacaoBase.message}</p>
        ) : !validacaoSangria.ok ? (
          <p className="text-xs text-error">{validacaoSangria.message}</p>
        ) : null}

        <FormControl fullWidth size="small">
          <InputLabel id="mov-realizado-por-label">Responsável</InputLabel>
          <Select
            labelId="mov-realizado-por-label"
            label="Responsável"
            value={realizadoPorId}
            disabled={carregandoUsuarios || ocupado}
            onChange={event => setRealizadoPorId(String(event.target.value))}
            sx={sxEntradaCompactaProdutoSelect}
            MenuProps={{ sx: { zIndex: Z_INDEX_SOBRE_PAINEL_LATERAL } }}
          >
            {usuariosComAbertura.map(usuario => (
              <MenuItem key={usuario.id} value={usuario.id}>
                {usuario.nome}
                {usuario.id === abertoPorId?.trim() ? ' (abriu o caixa)' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <div className="border-t border-gray-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary-text">
            Histórico deste caixa
            {!historico.isLoading && itens.length > 0 ? ` (${itens.length})` : ''}
          </p>
          {historico.isLoading ? (
            <p className="py-2 text-xs text-secondary-text">Carregando…</p>
          ) : historico.isError ? (
            <p className="text-xs text-error">Não foi possível carregar o histórico.</p>
          ) : itens.length === 0 ? (
            <p className="py-2 text-xs text-secondary-text">Nenhum registro ainda.</p>
          ) : (
            <ul className="max-h-44 space-y-2 overflow-y-auto overscroll-y-contain pr-0.5">
              {itens.map(item => (
                <li key={item.id} className="rounded-lg bg-white px-3 py-2 ring-1 ring-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-primary-text">
                        {item.descricao?.trim() || '—'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-secondary-text">
                        {formatarData(item.dataCriacao)}
                        {item.nomeResponsavel ? ` · ${item.nomeResponsavel}` : ''}
                      </p>
                    </div>
                    <p
                      className={cn(
                        'shrink-0 text-sm font-semibold tabular-nums',
                        tipo === 'suprimento' ? 'text-emerald-600' : 'text-red-500'
                      )}
                    >
                      {formatarMoeda(item.valor)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </JiffySidePanelModal>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listarEntregadoresDeliveryUseCase } from '@/src/application/use-cases/delivery/ListarEntregadoresDeliveryUseCase'
import {
  adaptPedidoDeliveryToVendaGestorApiResponse,
  extrairStatusFinanceiroPedidoDelivery,
} from '@/src/application/mappers/PedidoDeliveryDetalheAdapter'
import { salvarTaxaPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/SalvarTaxaPedidoDeliveryUseCase'
import { pedidoDeliveryEstaPago } from '@/src/application/mappers/TaxaPedidoDeliveryPayloadMapper'
import { useTaxasEntregaQuery } from '@/src/presentation/components/features/pedidos/hooks/data/useTaxasEntregaQuery'
import { patchVendaDeliveryKanbanColumnCaches } from '@/src/presentation/components/features/kanban/utils/kanbanDeliveryColumnCache'
import { invalidarPedidoKanbanQuickViewCache } from './carregarPedidoKanbanQuickView'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import {
  PainelPedidoBackdrop,
  JiffyPainelSlide,
  footerBarPrimaryMutedSx,
  footerSavePrimaryBarSx,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { Button } from '@/src/presentation/components/ui/button'
import { Label } from '@/src/presentation/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/presentation/components/ui/select'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { showToast } from '@/src/shared/utils/toast'
import {
  formatarTaxaEntregaDetalheExibicao,
  resolverTaxaEntregaDetalheKanban,
  resolverTaxaEntregaValorSync,
} from '@/src/application/mappers/VendaDetalheMapper'
import type { TaxaEntregaDetalhe } from '@/src/domain/types/vendaDetalhe'
import type { UsuarioPdvEntregadorOption } from '@/src/domain/types/vendaDetalhe'
import {
  obterEntregadorKanbanCache,
  resolverEntregadorIdVendaKanban,
  salvarEntregadorPedidoDelivery,
} from './entregadorKanbanStore'
import type { Venda } from '@/src/presentation/components/features/kanban/types'
import {
  obterPedidoDeliveryDetalheCache,
  salvarPedidoDeliveryDetalheCache,
} from '@/src/infrastructure/api/pedidoDeliveryDetalheCache'

/** Valor sentinela do Select para "sem taxa" (Radix não aceita value vazio). */
const SEM_TAXA = '__sem_taxa__'

interface AtribuirEntregadorKanbanPainelProps {
  open: boolean
  venda: Venda | null
  entregadorVinculadoId?: string | null
  onClose: () => void
  onSalvo: (vendaId: string, entregadorId: string) => void
}

function extrairEntregadorIdDoPedidoDelivery(
  pedido: Record<string, unknown>
): string {
  const entregadorRaw =
    pedido.entregador && typeof pedido.entregador === 'object'
      ? (pedido.entregador as Record<string, unknown>).id
      : pedido.entregadorId
  return String(entregadorRaw ?? '').trim()
}

async function buscarPedidoDeliveryKanban(
  vendaId: string,
  token: string
): Promise<Record<string, unknown> | null> {
  const cached = obterPedidoDeliveryDetalheCache(vendaId)
  if (cached) return cached

  const response = await fetch(`/api/delivery/pedidos/${encodeURIComponent(vendaId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) return null
  const pedidoRaw = await response.json()
  return salvarPedidoDeliveryDetalheCache(vendaId, pedidoRaw)
}

export function AtribuirEntregadorKanbanPainel({
  open,
  venda,
  entregadorVinculadoId,
  onClose,
  onSalvo,
}: AtribuirEntregadorKanbanPainelProps) {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const [entregadorId, setEntregadorId] = useState('')
  const [taxaEntregaDetalhe, setTaxaEntregaDetalhe] = useState<TaxaEntregaDetalhe | null>(null)
  const [taxaSelecionadaId, setTaxaSelecionadaId] = useState<string>(SEM_TAXA)
  const [pedidoPago, setPedidoPago] = useState(false)
  const [carregandoTaxa, setCarregandoTaxa] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvandoTaxa, setSalvandoTaxa] = useState(false)

  const ehPedidoGestor = !!venda && venda.tabelaOrigem === 'venda_gestor'

  const { taxasEntrega } = useTaxasEntregaQuery({
    open,
    modoVisualizacao: false,
    pedidoComEntrega: ehPedidoGestor,
  })

  const opcoesTaxa = useMemo(() => {
    const base = taxasEntrega.map(taxa => ({
      id: taxa.getId(),
      nome: taxa.getNome(),
      valor: taxa.getValor(),
    }))
    const atualId = taxaEntregaDetalhe?.taxaId?.trim()
    if (atualId && !base.some(opcao => opcao.id === atualId)) {
      base.unshift({
        id: atualId,
        nome: taxaEntregaDetalhe?.nome ?? 'Taxa atual',
        valor: taxaEntregaDetalhe?.valor ?? 0,
      })
    }
    return base
  }, [taxasEntrega, taxaEntregaDetalhe])

  const selecaoTaxaAtual = taxaEntregaDetalhe?.taxaId?.trim() || SEM_TAXA
  const taxaMudou = taxaSelecionadaId !== selecaoTaxaAtual

  const entregadoresQuery = useQuery({
    queryKey: ['delivery-entregadores', { ativo: true }],
    queryFn: async (): Promise<UsuarioPdvEntregadorOption[]> => {
      const token = auth?.getAccessToken()
      if (!token) return []
      return listarEntregadoresDeliveryUseCase.execute(token)
    },
    enabled: open,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  const entregadores = entregadoresQuery.data ?? []

  const carregarTaxaEntrega = useCallback(
    async (pedido: Record<string, unknown>, token: string) => {
      const vendaData = adaptPedidoDeliveryToVendaGestorApiResponse(pedido)
      const valorSync = resolverTaxaEntregaValorSync(vendaData)
      if (valorSync > 0) {
        setTaxaEntregaDetalhe({
          taxaId: null,
          nome: null,
          valor: valorSync,
        })
      }

      const taxaDetalhe = await resolverTaxaEntregaDetalheKanban(vendaData, token)
      setTaxaEntregaDetalhe(taxaDetalhe)
      setTaxaSelecionadaId(taxaDetalhe?.taxaId?.trim() || SEM_TAXA)
    },
    []
  )

  const carregarDadosVenda = useCallback(async () => {
    if (!open || !venda) return

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      return
    }

    const entregadorDoCard = venda.entregador?.id?.trim()
    const entregadorInicial =
      entregadorVinculadoId?.trim() ||
      entregadorDoCard ||
      obterEntregadorKanbanCache(venda.id) ||
      ''
    setEntregadorId(entregadorInicial)

    if (venda.tabelaOrigem === 'venda_gestor') {
      setCarregandoTaxa(true)
      try {
        const pedido =
          obterPedidoDeliveryDetalheCache(venda.id) ??
          (await buscarPedidoDeliveryKanban(venda.id, token))

        if (pedido) {
          setPedidoPago(pedidoDeliveryEstaPago(pedido))
          if (!entregadorInicial) {
            const doPedido = extrairEntregadorIdDoPedidoDelivery(pedido)
            if (doPedido) setEntregadorId(doPedido)
          }
          await carregarTaxaEntrega(pedido, token)
        } else {
          setPedidoPago(false)
          setTaxaEntregaDetalhe(null)
          setTaxaSelecionadaId(SEM_TAXA)
        }
      } catch {
        showToast.error('Erro ao carregar dados do pedido.')
      } finally {
        setCarregandoTaxa(false)
      }
      return
    }

    if (!entregadorInicial) {
      try {
        const resolvido = await resolverEntregadorIdVendaKanban({
          vendaId: venda.id,
          tabelaOrigem: 'venda',
          token,
        })
        if (resolvido) setEntregadorId(resolvido)
      } catch {
        showToast.error('Erro ao carregar entregador do pedido.')
      }
    }
  }, [auth, carregarTaxaEntrega, entregadorVinculadoId, open, venda])

  useEffect(() => {
    if (!open) {
      setEntregadorId('')
      setTaxaEntregaDetalhe(null)
      setTaxaSelecionadaId(SEM_TAXA)
      setPedidoPago(false)
      setCarregandoTaxa(false)
      setSalvando(false)
      setSalvandoTaxa(false)
      return
    }
    void carregarDadosVenda()
  }, [open, carregarDadosVenda])

  const handleSalvarTaxa = async () => {
    if (!venda || !ehPedidoGestor) return
    if (pedidoPago) {
      showToast.error('Pedido já pago: não é possível alterar ou adicionar a taxa.')
      return
    }
    if (!taxaMudou) return

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      return
    }

    const selecionadaId = taxaSelecionadaId === SEM_TAXA ? null : taxaSelecionadaId
    const selecionadaValor = selecionadaId
      ? opcoesTaxa.find(opcao => opcao.id === selecionadaId)?.valor ?? 0
      : 0

    setSalvandoTaxa(true)
    try {
      const { atualizado, pedido } = await salvarTaxaPedidoDeliveryUseCase.execute({
        pedidoId: venda.id,
        token,
        taxaAtualId: taxaEntregaDetalhe?.taxaId ?? null,
        taxaAtualValor: taxaEntregaDetalhe?.valor ?? 0,
        taxaSelecionadaId: selecionadaId,
        taxaSelecionadaValor: selecionadaValor,
      })

      if (!atualizado) {
        showToast.info('Nenhuma alteração na taxa.')
        return
      }

      salvarPedidoDeliveryDetalheCache(venda.id, pedido)
      const valorFinalNum = Number((pedido as Record<string, unknown>).valorFinal)
      patchVendaDeliveryKanbanColumnCaches(queryClient, venda.id, {
        valorFinal: Number.isFinite(valorFinalNum) ? valorFinalNum : undefined,
        statusFinanceiro: extrairStatusFinanceiroPedidoDelivery(pedido),
      })
      invalidarPedidoKanbanQuickViewCache(venda.id)
      setPedidoPago(pedidoDeliveryEstaPago(pedido))
      await carregarTaxaEntrega(pedido, token)
      showToast.success('Taxa atualizada.')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar taxa')
    } finally {
      setSalvandoTaxa(false)
    }
  }

  const handleSalvar = async () => {
    if (!venda) return
    if (venda.tabelaOrigem !== 'venda_gestor') {
      showToast.error('Vincular entregador só está disponível para pedidos do gestor.')
      return
    }

    const entregadorSelecionado = entregadorId.trim()
    if (!entregadorSelecionado) {
      showToast.error('Selecione um entregador.')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      return
    }

    setSalvando(true)
    try {
      await salvarEntregadorPedidoDelivery({
        vendaId: venda.id,
        entregadorId: entregadorSelecionado,
        token,
      })
      showToast.success('Entregador vinculado ao pedido.')
      onSalvo(venda.id, entregadorSelecionado)
      onClose()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao vincular entregador')
    } finally {
      setSalvando(false)
    }
  }

  const rotuloPedido = venda
    ? `Pedido ${venda.numeroVenda}${venda.codigoVenda ? ` - #${venda.codigoVenda}` : ''}`
    : ''

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) onClose()
      }}
      maxWidth={false}
      TransitionComponent={JiffyPainelSlide}
      transitionDuration={{ enter: 420, exit: 380 }}
      slots={{ backdrop: PainelPedidoBackdrop }}
      sx={{
        '& .MuiDialog-container': {
          zIndex: 1400,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'flex-end',
        },
        '& .MuiBackdrop-root': {
          zIndex: 1400,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          transition: 'none',
        },
        '& .MuiDialog-paper': {
          zIndex: 1400,
          backgroundColor: '#ffffff',
          opacity: 1,
          height: '100vh',
          maxHeight: '100vh',
          margin: 0,
          marginLeft: 'auto',
          width: { xs: '95vw', sm: '90vw', md: 'min(420px, 35vw)' },
          maxWidth: '100vw',
          borderTopLeftRadius: '0.75rem',
          borderBottomLeftRadius: '0.75rem',
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent
        sx={{
          width: '100%',
          height: '100%',
          maxHeight: '100vh',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-6 py-4">
          <DialogTitle className="!p-0 text-lg font-semibold text-primary-text">
            Vincular entregador
          </DialogTitle>
          {rotuloPedido && (
            <p className="mt-1 text-sm text-secondary-text">{rotuloPedido}</p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/15 bg-white p-3">
              <Label className="mb-2 block text-sm font-semibold text-primary-text">
                Entregador *
              </Label>
              <Select
                value={entregadorId || undefined}
                onValueChange={setEntregadorId}
                disabled={entregadoresQuery.isLoading}
              >
                <SelectTrigger className="border-primary/30 bg-white">
                  <SelectValue
                    placeholder={
                      entregadoresQuery.isLoading
                        ? 'Carregando entregadores...'
                        : 'Selecionar entregador'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {entregadores.map(entregador => (
                    <SelectItem key={entregador.id} value={entregador.id}>
                      {entregador.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-primary/15 bg-white p-3">
              <Label className="mb-2 block text-sm font-semibold text-primary-text">
                Taxa de entrega
              </Label>

              {pedidoPago ? (
                <>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-primary-text opacity-90">
                    {carregandoTaxa && !taxaEntregaDetalhe
                      ? 'Carregando taxa...'
                      : formatarTaxaEntregaDetalheExibicao(taxaEntregaDetalhe, transformarParaReal)}
                  </div>
                  <p className="mt-2 text-[11px] text-secondary-text">
                    Pedido já pago — não é possível alterar ou adicionar a taxa.
                  </p>
                </>
              ) : (
                <>
                  <Select
                    value={taxaSelecionadaId}
                    onValueChange={setTaxaSelecionadaId}
                    disabled={carregandoTaxa || salvandoTaxa}
                  >
                    <SelectTrigger className="border-primary/30 bg-white">
                      <SelectValue
                        placeholder={carregandoTaxa ? 'Carregando taxa...' : 'Selecionar taxa'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SEM_TAXA}>Sem taxa</SelectItem>
                      {opcoesTaxa.map(opcao => (
                        <SelectItem key={opcao.id} value={opcao.id}>
                          {`${opcao.nome} — ${transformarParaReal(opcao.valor)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outlined"
                    color="primary"
                    onClick={() => void handleSalvarTaxa()}
                    disabled={!taxaMudou || salvandoTaxa || carregandoTaxa}
                    isLoading={salvandoTaxa}
                    className="mt-3 h-9 min-h-9 w-full font-semibold shadow-none"
                  >
                    Salvar Taxa
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div
          className="grid w-full shrink-0 border-t border-gray-200"
          style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
        >
          <div className="min-w-0 border-r border-gray-200">
            <Button
              type="button"
              variant="outlined"
              color="inherit"
              onClick={onClose}
              disabled={salvando}
              className="h-12 min-h-12 w-full font-semibold shadow-none"
              sx={footerBarPrimaryMutedSx(true)}
            >
              Cancelar
            </Button>
          </div>
          <div className="min-w-0">
            <Button
              type="button"
              variant="contained"
              color="primary"
              onClick={() => void handleSalvar()}
              disabled={salvando || entregadoresQuery.isLoading}
              isLoading={salvando}
              className="h-12 min-h-12 w-full font-semibold shadow-none"
              sx={footerSavePrimaryBarSx(false)}
            >
              Salvar entregador
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

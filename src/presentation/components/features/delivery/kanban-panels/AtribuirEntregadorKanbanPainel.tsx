'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MdAttachMoney, MdSportsMotorsports } from 'react-icons/md'
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
  resolverTaxaEntregaAtivaDetalheKanban,
} from '@/src/application/mappers/VendaDetalheMapper'
import type { TaxaEntregaDetalhe } from '@/src/domain/types/vendaDetalhe'
import type { UsuarioPdvEntregadorOption } from '@/src/domain/types/vendaDetalhe'
import {
  obterEntregadorKanbanCache,
  resolverEntregadorIdVendaKanban,
  salvarEntregadorPedidoDelivery,
} from './entregadorKanbanStore'
import type { Venda } from '@/src/presentation/components/features/kanban/types'
import type { KanbanEntregadorCachePatch } from '@/src/application/dto/TransicaoKanbanDTO'
import {
  obterPedidoDeliveryDetalheCache,
  salvarPedidoDeliveryDetalheCache,
  invalidarPedidoDeliveryDetalheCache,
} from '@/src/infrastructure/api/pedidoDeliveryDetalheCache'

/** Valor sentinela do Select para "sem taxa" (Radix não aceita value vazio). */
const SEM_TAXA = '__sem_taxa__'

/** Valor sentinela do Select para "Nenhum" entregador (remove o vínculo). */
const SEM_ENTREGADOR = '__sem_entregador__'

/** Item do Select com texto roxo (selecionado/destacado) e realce de fundo suave, no lugar do azul. */
const SELECT_ITEM_ROXO =
  'data-[highlighted]:!bg-secondary/10 data-[highlighted]:!text-secondary data-[state=checked]:!text-secondary'

/** Trigger do Select com borda e anel de foco roxo claro, no lugar do azul padrão. */
const SELECT_TRIGGER_ROXO = 'border-secondary/30 bg-white focus:!ring-secondary/70'

interface AtribuirEntregadorKanbanPainelProps {
  open: boolean
  venda: Venda | null
  entregadorVinculadoId?: string | null
  onClose: () => void
  onSalvo: (vendaId: string, entregadorId: string | null) => void
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

function extrairEntregadorResumoDoPedidoDelivery(
  pedido: Record<string, unknown>
): KanbanEntregadorCachePatch | null {
  const raw = pedido.entregador
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const entregador = raw as Record<string, unknown>
  const id = String(entregador.id ?? '').trim()
  if (!id) return null
  return {
    id,
    nome: entregador.nome != null ? String(entregador.nome) : null,
    telefone: entregador.telefone != null ? String(entregador.telefone) : null,
  }
}

async function buscarPedidoDeliveryKanban(
  vendaId: string,
  token: string,
  options?: { forcarAtualizacao?: boolean }
): Promise<Record<string, unknown> | null> {
  if (options?.forcarAtualizacao) {
    invalidarPedidoDeliveryDetalheCache(vendaId)
  } else {
    const cached = obterPedidoDeliveryDetalheCache(vendaId)
    if (cached) return cached
  }

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

async function aplicarPedidoNoPainel(args: {
  pedido: Record<string, unknown>
  token: string
  carregarTaxaEntrega: (pedido: Record<string, unknown>, token: string) => Promise<void>
  setEntregadorId: (id: string) => void
  setPedidoPago: (pago: boolean) => void
}): Promise<void> {
  const { pedido, token, carregarTaxaEntrega, setEntregadorId, setPedidoPago } = args
  setPedidoPago(pedidoDeliveryEstaPago(pedido))
  setEntregadorId(extrairEntregadorIdDoPedidoDelivery(pedido))
  await carregarTaxaEntrega(pedido, token)
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
  const [entregadorInicialId, setEntregadorInicialId] = useState('')
  const [taxaEntregaDetalhe, setTaxaEntregaDetalhe] = useState<TaxaEntregaDetalhe | null>(null)
  const [taxaSelecionadaId, setTaxaSelecionadaId] = useState<string>(SEM_TAXA)
  const [pedidoPago, setPedidoPago] = useState(false)
  const [carregandoTaxa, setCarregandoTaxa] = useState(false)
  const [salvando, setSalvando] = useState(false)

  /** Sincroniza valor atual + baseline do entregador (usado ao carregar/refrescar o pedido). */
  const aplicarEntregadorId = useCallback((id: string) => {
    setEntregadorId(id)
    setEntregadorInicialId(id)
  }, [])

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
  const entregadorMudou = entregadorId.trim() !== entregadorInicialId.trim()
  const taxaMudouEEditavel = taxaMudou && !pedidoPago
  const temAlteracao = entregadorMudou || taxaMudouEEditavel

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
      const taxaDetalhe = await resolverTaxaEntregaAtivaDetalheKanban(vendaData, token)
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

    if (venda.tabelaOrigem === 'venda_gestor') {
      setCarregandoTaxa(true)
      try {
        const pedido = await buscarPedidoDeliveryKanban(venda.id, token, {
          forcarAtualizacao: true,
        })

        if (pedido) {
          await aplicarPedidoNoPainel({
            pedido,
            token,
            carregarTaxaEntrega,
            setEntregadorId: aplicarEntregadorId,
            setPedidoPago,
          })
        } else {
          setPedidoPago(false)
          aplicarEntregadorId('')
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

    const entregadorDoCard = venda.entregador?.id?.trim()
    const entregadorInicial =
      entregadorVinculadoId?.trim() ||
      entregadorDoCard ||
      obterEntregadorKanbanCache(venda.id) ||
      ''
    aplicarEntregadorId(entregadorInicial)

    if (!entregadorInicial) {
      try {
        const resolvido = await resolverEntregadorIdVendaKanban({
          vendaId: venda.id,
          tabelaOrigem: 'venda',
          token,
        })
        if (resolvido) aplicarEntregadorId(resolvido)
      } catch {
        showToast.error('Erro ao carregar entregador do pedido.')
      }
    }
  }, [aplicarEntregadorId, auth, carregarTaxaEntrega, entregadorVinculadoId, open, venda])

  useEffect(() => {
    if (!open) {
      setEntregadorId('')
      setEntregadorInicialId('')
      setTaxaEntregaDetalhe(null)
      setTaxaSelecionadaId(SEM_TAXA)
      setPedidoPago(false)
      setCarregandoTaxa(false)
      setSalvando(false)
      return
    }
    void carregarDadosVenda()
  }, [open, carregarDadosVenda])

  const handleSalvar = async () => {
    if (!venda) return
    if (venda.tabelaOrigem !== 'venda_gestor') {
      showToast.error('Vincular entregador só está disponível para pedidos do gestor.')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      return
    }

    const deveSalvarTaxa = taxaMudouEEditavel
    const deveSalvarEntregador = entregadorMudou

    if (!deveSalvarTaxa && !deveSalvarEntregador) {
      showToast.info('Nenhuma alteração para salvar.')
      return
    }

    const entregadorSelecionado = entregadorId.trim() || null

    setSalvando(true)
    try {
      let taxaFoiAtualizada = false

      if (deveSalvarTaxa) {
        const selecionadaId = taxaSelecionadaId === SEM_TAXA ? null : taxaSelecionadaId
        const selecionadaValor = selecionadaId
          ? opcoesTaxa.find(opcao => opcao.id === selecionadaId)?.valor ?? 0
          : 0
        const { atualizado } = await salvarTaxaPedidoDeliveryUseCase.execute({
          pedidoId: venda.id,
          token,
          taxaSelecionadaId: selecionadaId,
          taxaSelecionadaValor: selecionadaValor,
        })
        taxaFoiAtualizada = atualizado
      }

      if (deveSalvarEntregador) {
        await salvarEntregadorPedidoDelivery({
          vendaId: venda.id,
          entregadorId: entregadorSelecionado,
          token,
        })
      }

      invalidarPedidoKanbanQuickViewCache(venda.id)
      const pedidoAtualizado = await buscarPedidoDeliveryKanban(venda.id, token, {
        forcarAtualizacao: true,
      })

      if (pedidoAtualizado) {
        const valorFinalNum = Number(pedidoAtualizado.valorFinal)
        patchVendaDeliveryKanbanColumnCaches(queryClient, venda.id, {
          ...(deveSalvarEntregador
            ? { entregador: extrairEntregadorResumoDoPedidoDelivery(pedidoAtualizado) }
            : {}),
          ...(taxaFoiAtualizada
            ? {
                valorFinal: Number.isFinite(valorFinalNum) ? valorFinalNum : undefined,
                statusFinanceiro: extrairStatusFinanceiroPedidoDelivery(pedidoAtualizado),
              }
            : {}),
        })
        await aplicarPedidoNoPainel({
          pedido: pedidoAtualizado,
          token,
          carregarTaxaEntrega,
          setEntregadorId: aplicarEntregadorId,
          setPedidoPago,
        })
      }

      showToast.success('Alterações salvas.')
      onSalvo(venda.id, deveSalvarEntregador ? entregadorSelecionado : entregadorInicialId.trim() || null)
      onClose()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar alterações')
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
          <div className="space-y-6">
            <div className="rounded-lg border border-primary/15 bg-white p-3">
              <Label className="mb-4 !flex items-center gap-1.5 text-sm font-semibold !text-secondary">
                <MdSportsMotorsports className="shrink-0 text-xl" aria-hidden />
                <span className="font-semibold">Escolha um entregador</span>
              </Label>
              <Select
                value={entregadorId || SEM_ENTREGADOR}
                onValueChange={valor =>
                  setEntregadorId(valor === SEM_ENTREGADOR ? '' : valor)
                }
                disabled={entregadoresQuery.isLoading}
              >
                <SelectTrigger className={SELECT_TRIGGER_ROXO}>
                  <SelectValue
                    placeholder={
                      entregadoresQuery.isLoading
                        ? 'Carregando entregadores...'
                        : 'Selecionar entregador'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_ENTREGADOR} className={SELECT_ITEM_ROXO}>
                    Nenhum
                  </SelectItem>
                  {entregadores.map(entregador => (
                    <SelectItem
                      key={entregador.id}
                      value={entregador.id}
                      className={SELECT_ITEM_ROXO}
                    >
                      {entregador.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-primary/15 bg-white p-3">
              <Label className="mb-4 !flex items-center gap-1.5 text-sm font-semibold !text-secondary">
                <MdAttachMoney className="shrink-0 text-xl" aria-hidden />
                <span className="font-semibold">Escolha uma taxa de entrega</span>
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
                    disabled={carregandoTaxa || salvando}
                  >
                    <SelectTrigger className={SELECT_TRIGGER_ROXO}>
                      <SelectValue
                        placeholder={carregandoTaxa ? 'Carregando taxa...' : 'Selecionar taxa'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SEM_TAXA} className={SELECT_ITEM_ROXO}>
                        Sem taxa
                      </SelectItem>
                      {opcoesTaxa.map(opcao => (
                        <SelectItem key={opcao.id} value={opcao.id} className={SELECT_ITEM_ROXO}>
                          {`${opcao.nome} — ${transformarParaReal(opcao.valor)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              disabled={salvando || carregandoTaxa || entregadoresQuery.isLoading || !temAlteracao}
              isLoading={salvando}
              className="h-12 min-h-12 w-full font-semibold shadow-none"
              sx={footerSavePrimaryBarSx(false)}
            >
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

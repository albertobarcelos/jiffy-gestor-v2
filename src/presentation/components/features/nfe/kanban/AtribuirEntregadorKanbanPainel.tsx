'use client'

import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
} from '@/src/application/mappers/VendaDetalheMapper'
import type {
  TaxaEntregaDetalhe,
  UsuarioPdvEntregadorOption,
} from '@/src/domain/types/vendaDetalhe'
import {
  resolverEntregadorIdVendaKanban,
  salvarEntregadorVendaGestor,
} from './entregadorKanbanStore'
import type { Venda } from './types'

interface AtribuirEntregadorKanbanPainelProps {
  open: boolean
  venda: Venda | null
  entregadorVinculadoId?: string | null
  onClose: () => void
  onSalvo: (vendaId: string, entregadorId: string) => void
}

export function AtribuirEntregadorKanbanPainel({
  open,
  venda,
  entregadorVinculadoId,
  onClose,
  onSalvo,
}: AtribuirEntregadorKanbanPainelProps) {
  const { auth } = useAuthStore()
  const [entregadorId, setEntregadorId] = useState('')
  const [taxaEntregaDetalhe, setTaxaEntregaDetalhe] = useState<TaxaEntregaDetalhe | null>(null)
  const [carregandoDados, setCarregandoDados] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const entregadoresQuery = useQuery({
    queryKey: ['usuarios-pdv-entregadores', { tipoUsuarioPdv: 'entregador' }],
    queryFn: async (): Promise<UsuarioPdvEntregadorOption[]> => {
      const token = auth?.getAccessToken()
      if (!token) return []

      const response = await fetch('/api/usuarios-pdv/entregadores?limit=100&offset=0', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) return []

      const data = await response.json()
      const items = Array.isArray(data.items) ? data.items : []
      return items
        .filter((item: Record<string, unknown>) => {
          const tipo = String(item.tipoUsuarioPdv ?? '')
            .trim()
            .toLowerCase()
          return tipo === 'entregador'
        })
        .map((item: Record<string, unknown>) => ({
          id: String(item.id ?? item.usuarioId ?? ''),
          nome: String(item.nome ?? item.name ?? '').trim(),
          telefone: item.telefone != null ? String(item.telefone) : undefined,
        }))
        .filter((item: UsuarioPdvEntregadorOption) => item.id && item.nome)
    },
    enabled: open,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  const entregadores = entregadoresQuery.data ?? []

  const carregarDadosVenda = useCallback(async () => {
    if (!open || !venda) return

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      return
    }

    setCarregandoDados(true)
    try {
      const entregadorResolvido =
        entregadorVinculadoId?.trim() ||
        (await resolverEntregadorIdVendaKanban({
          vendaId: venda.id,
          tabelaOrigem: venda.tabelaOrigem === 'venda_gestor' ? 'venda_gestor' : 'venda',
          token,
        })) ||
        ''

      setEntregadorId(entregadorResolvido)

      if (venda.tabelaOrigem === 'venda_gestor') {
        const response = await fetch(
          `/api/vendas/gestor/${venda.id}?incluirFiscal=false`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            cache: 'no-store',
          }
        )
        if (response.ok) {
          const vendaData = (await response.json()) as Record<string, unknown>
          const taxaDetalhe = await resolverTaxaEntregaDetalheKanban(vendaData, token)
          setTaxaEntregaDetalhe(taxaDetalhe)
        } else {
          setTaxaEntregaDetalhe(null)
        }
      } else {
        setTaxaEntregaDetalhe(null)
      }
    } catch {
      showToast.error('Erro ao carregar dados do pedido.')
    } finally {
      setCarregandoDados(false)
    }
  }, [auth, entregadorVinculadoId, open, venda])

  useEffect(() => {
    if (!open) {
      setEntregadorId('')
      setTaxaEntregaDetalhe(null)
      setCarregandoDados(false)
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
      await salvarEntregadorVendaGestor({
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
          {carregandoDados ? (
            <p className="text-sm text-secondary-text">Carregando...</p>
          ) : (
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

              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
                <Label className="mb-1 block text-sm font-semibold text-primary-text">
                  Taxa de entrega
                </Label>
                <p className="mb-2 text-[11px] text-secondary-text">
                  Em breve será possível alterar a taxa por aqui. Por enquanto, defina na criação
                  do pedido.
                </p>
                <div className="rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm text-primary-text opacity-90">
                  {formatarTaxaEntregaDetalheExibicao(taxaEntregaDetalhe, transformarParaReal)}
                </div>
              </div>
            </div>
          )}
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
              disabled={salvando || carregandoDados}
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

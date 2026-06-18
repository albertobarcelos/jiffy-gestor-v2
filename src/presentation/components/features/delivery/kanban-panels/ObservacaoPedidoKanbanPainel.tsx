'use client'

import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import { Textarea } from '@/src/presentation/components/ui/textarea'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { showToast } from '@/src/shared/utils/toast'
import {
  OBSERVACAO_PEDIDO_MAX_CHARS,
  observacaoTextoParcialInvalido,
  observacaoTextoValidoParaEnvio,
} from '@/src/shared/helpers/observacaoPedido'
import {
  invalidateVendaDetalheCarregadaCache,
  patchVendaDetalheObservacaoPedidoCache,
} from '@/src/presentation/components/features/pedidos/hooks/data/useVendaDetalheCarregadaQuery'
import { observacoesArrayFromTexto } from '@/src/shared/helpers/observacaoPedido'
import { patchKanbanVendasListagemCache } from '@/src/presentation/components/features/kanban/utils/kanbanVendaCacheUpdate'
import {
  extrairObservacaoPedidoDeRespostaApi,
  observacoesPayloadPatchObservacaoPedido,
  resolverEndpointObservacaoPedidoKanban,
} from './observacaoPedidoKanban'
import { invalidarPedidoKanbanQuickViewCache } from './carregarPedidoKanbanQuickView'
import type { Venda } from '@/src/presentation/components/features/kanban/types'

interface ObservacaoPedidoKanbanPainelProps {
  open: boolean
  venda: Venda | null
  onClose: () => void
  onSalvo?: (vendaId: string, observacao: string) => void
}

export function ObservacaoPedidoKanbanPainel({
  open,
  venda,
  onClose,
  onSalvo,
}: ObservacaoPedidoKanbanPainelProps) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const { auth } = useAuthStore()
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const carregarObservacao = useCallback(async () => {
    if (!open || !venda) return

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      return
    }

    setCarregando(true)
    try {
      const { getUrl } = resolverEndpointObservacaoPedidoKanban(venda)
      const response = await fetch(getUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const message =
          typeof errorData.error === 'string'
            ? errorData.error
            : 'Não foi possível carregar a observação do pedido.'
        showToast.error(message)
        setTexto('')
        return
      }

      const data = await response.json()
      setTexto(extrairObservacaoPedidoDeRespostaApi(data))
    } catch {
      showToast.error('Erro ao carregar observação do pedido.')
      setTexto('')
    } finally {
      setCarregando(false)
    }
  }, [auth, open, venda])

  useEffect(() => {
    if (open && venda) {
      void carregarObservacao()
    } else if (!open) {
      setTexto('')
      setCarregando(false)
      setSalvando(false)
    }
  }, [open, venda, carregarObservacao])

  const handleSalvar = async () => {
    if (!venda) return

    if (!observacaoTextoValidoParaEnvio(texto)) {
      showToast.error('Observação do pedido deve ter entre 3 e 100 caracteres.')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      return
    }

    setSalvando(true)
    try {
      const { patchUrl } = resolverEndpointObservacaoPedidoKanban(venda)
      const response = await fetchGestorApi(patchUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(observacoesPayloadPatchObservacaoPedido(texto)),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const message =
          typeof errorData.error === 'string'
            ? errorData.error
            : 'Não foi possível salvar a observação do pedido.'
        showToast.error(message)
        return
      }

      const data = await response.json().catch(() => null)
      const observacaoSalva = data
        ? extrairObservacaoPedidoDeRespostaApi(data)
        : texto.trim()

      showToast.success('Observação do pedido salva.')
      patchVendaDetalheObservacaoPedidoCache(queryClient, empresaId, venda.id, observacaoSalva)
      patchKanbanVendasListagemCache(queryClient, venda.id, {
        observacoes: observacoesArrayFromTexto(observacaoSalva) ?? [],
      })
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['venda', venda.id] })
      await invalidateVendaDetalheCarregadaCache(queryClient, empresaId, venda.id)
      invalidarPedidoKanbanQuickViewCache(venda.id)
      onSalvo?.(venda.id, observacaoSalva)
      onClose()
    } catch {
      showToast.error('Erro ao salvar observação do pedido.')
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
            Observação do pedido
          </DialogTitle>
          {rotuloPedido && (
            <p className="mt-1 text-sm text-secondary-text">{rotuloPedido}</p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {carregando ? (
            <p className="text-sm text-secondary-text">Carregando...</p>
          ) : (
            <Textarea
              label="Observação"
              placeholder="Instruções gerais para o pedido (opcional)"
              value={texto}
              onChange={e => setTexto(e.target.value)}
              inputProps={{ maxLength: OBSERVACAO_PEDIDO_MAX_CHARS }}
              error={observacaoTextoParcialInvalido(texto)}
              helperText={
                observacaoTextoParcialInvalido(texto)
                  ? 'Mínimo 3 caracteres (ou deixe vazio).'
                  : `${texto.length}/${OBSERVACAO_PEDIDO_MAX_CHARS} caracteres`
              }
              rows={4}
            />
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
              disabled={salvando || carregando || observacaoTextoParcialInvalido(texto)}
              isLoading={salvando}
              className="h-12 min-h-12 w-full font-semibold shadow-none"
              sx={footerSavePrimaryBarSx(false)}
            >
              Salvar observação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { MdClose } from 'react-icons/md'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { showToast } from '@/src/shared/utils/toast'
import type { OperacaoCaixaEstacaoDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import { mapOperacaoCaixaEstacao } from '@/src/application/mappers/caixa-estacao/OperacaoCaixaEstacaoMapper'
import {
  fetchGestorApi,
  lerErroCaixaEstacao,
  pathOperacaoCaixaEstacao,
} from '@/src/presentation/hooks/caixa-estacao/caixaEstacaoApi'
import { resolverEstacaoImpressaoConfig } from '@/src/infrastructure/api/estacoesImpressaoApi'
import { imprimirCupomFechamentoCaixaEstacao } from '@/src/infrastructure/printing/imprimirCupomFechamentoCaixaEstacao'
import { useDeliveryConfigEstacaoImpressao } from '@/src/presentation/hooks/useDeliveryConfigImpressaoQueries'
import { usePreferenciasImpressaoDelivery } from '@/src/presentation/hooks/usePreferenciasImpressaoDelivery'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { FechamentoCaixaEstacaoRelatorioView } from './FechamentoCaixaEstacaoRelatorioView'

export function DetalhesFechamentoEstacao({
  idOperacaoCaixa,
  open,
  onClose,
}: {
  idOperacaoCaixa: string
  open: boolean
  onClose: () => void
}) {
  const [operacao, setOperacao] = useState<OperacaoCaixaEstacaoDTO | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [imprimindo, setImprimindo] = useState(false)
  const [erroImpressao, setErroImpressao] = useState<string | null>(null)
  const { preferenciasImpressaoDelivery } = usePreferenciasImpressaoDelivery()
  const estacaoImpressaoQuery = useDeliveryConfigEstacaoImpressao(open)

  useEffect(() => {
    if (!open || !idOperacaoCaixa) {
      setOperacao(null)
      return
    }
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) return
    let cancelado = false
    setIsLoading(true)
    void fetchGestorApi(pathOperacaoCaixaEstacao(idOperacaoCaixa), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async response => {
        if (!response.ok) throw new Error(await lerErroCaixaEstacao(response))
        const mapped = mapOperacaoCaixaEstacao(await response.json())
        if (!cancelado) setOperacao(mapped)
      })
      .catch(error => {
        console.error(error)
        showToast.error('Não foi possível carregar o fechamento da estação.')
      })
      .finally(() => {
        if (!cancelado) setIsLoading(false)
      })
    return () => {
      cancelado = true
    }
  }, [open, idOperacaoCaixa])

  async function handleImprimir() {
    if (!operacao || imprimindo) return
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) {
      setErroImpressao('Sessão expirada. Faça login novamente.')
      showToast.error('Sessão expirada.')
      return
    }

    setImprimindo(true)
    setErroImpressao(null)
    try {
      let mapeamentos = estacaoImpressaoQuery.data?.mapeamentos ?? []
      if (mapeamentos.length === 0) {
        const refetch = await estacaoImpressaoQuery.refetch()
        mapeamentos = refetch.data?.mapeamentos ?? []
      }
      if (mapeamentos.length === 0) {
        const config = await resolverEstacaoImpressaoConfig(token)
        mapeamentos = config.mapeamentos
      }

      const resultado = await imprimirCupomFechamentoCaixaEstacao({
        operacao,
        impressoraExpedicaoId: preferenciasImpressaoDelivery.impressoraExpedicaoId,
        mapeamentos,
        reprintKey: `modal-${Date.now()}`,
      })

      if (resultado.ok) {
        showToast.success('Cupom enviado à impressora de expedição.')
        return
      }

      const mensagem =
        resultado.mensagem?.trim() || 'Não foi possível enviar o cupom para impressão.'
      setErroImpressao(mensagem)
      showToast.error(mensagem)
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : 'Não foi possível enviar o cupom para impressão.'
      setErroImpressao(mensagem)
      showToast.error(mensagem)
    } finally {
      setImprimindo(false)
    }
  }

  if (!open) return null

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) onClose()
      }}
      fullWidth
      maxWidth={false}
      sx={{ zIndex: 1400 }}
      PaperProps={{
        sx: {
          borderRadius: '12px',
          width: { xs: '95vw', md: '620px' },
          maxHeight: '90vh',
          backgroundColor: '#FFFFD9',
          fontFamily: 'var(--font-general-sans), system-ui, sans-serif',
          color: '#000000',
        },
      }}
    >
      <DialogContent sx={{ p: 0, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="flex h-16 items-center justify-end px-4">
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-black/10">
            <MdClose size={26} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <JiffyLoading />
            </div>
          ) : operacao ? (
            <FechamentoCaixaEstacaoRelatorioView operacao={operacao} />
          ) : (
            <p className="text-sm">Fechamento não encontrado.</p>
          )}
        </div>
        {operacao ? (
          <div className="border-t border-black/10 px-4 py-3">
            {erroImpressao ? (
              <p className="mb-2 text-xs leading-relaxed text-red-700">{erroImpressao}</p>
            ) : null}
            <button
              type="button"
              disabled={imprimindo}
              onClick={() => void handleImprimir()}
              className="flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {imprimindo ? 'Enviando…' : 'Imprimir'}
            </button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { Button } from '@/src/presentation/components/ui/button'
import {
  footerBarGrayBarSx,
  footerBarPrimaryMutedSx,
  footerSavePrimaryBarSx,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { MdArrowBack, MdArrowForward, MdCancel } from 'react-icons/md'
import { useNovoPedidoDetalheContext } from '../../context/NovoPedidoDetalheContext'
import { useNovoPedidoFormContext } from '../../context/NovoPedidoFormContext'
import { useNovoPedidoUIContext } from '../../context/NovoPedidoUIContext'

export interface PedidoDetalhesFooterProps {
  createPending: boolean
  canSubmit: () => boolean
  onSubmit: () => void
  onNextStep: () => void
  onPreviousStep: () => void
  onClose: () => void
  onSuccess: () => void
  podeExibirCancelarVendaGestor: boolean
  podeExibirCancelarNotaFiscal: boolean
  isSavingPagamentoEntrega: boolean
  onSalvarPagamentoEntrega: () => void
}

export function PedidoDetalhesFooter({
  createPending,
  canSubmit,
  onSubmit,
  onNextStep,
  onPreviousStep,
  onClose,
  onSuccess,
  podeExibirCancelarVendaGestor,
  podeExibirCancelarNotaFiscal,
  isSavingPagamentoEntrega,
  onSalvarPagamentoEntrega,
}: PedidoDetalhesFooterProps) {
  const {
    modoVisualizacao,
    abaDetalhesPedido,
    podeEditarPagamentoEntregaEmAberto,
    cancelarVendaGestor,
    cancelarNotaFiscalVendaPdv,
    cancelarNotaFiscalVendaGestor,
    setTipoCancelamentoSelecionado,
  } = useNovoPedidoDetalheContext()
  const { pagamentos } = useNovoPedidoFormContext()
  const { currentStep, setModalCancelarVendaOpen, handleClose } = useNovoPedidoUIContext()

  if (currentStep === 4) {
    type ChaveRodape4 = 'cancelVenda' | 'cancelNota' | 'salvarCobranca' | 'fechar'
    const chaves: ChaveRodape4[] = []
    if (podeExibirCancelarVendaGestor) chaves.push('cancelVenda')
    if (podeExibirCancelarNotaFiscal) chaves.push('cancelNota')
    if (podeEditarPagamentoEntregaEmAberto && abaDetalhesPedido === 'pagamentos') {
      chaves.push('salvarCobranca')
    }
    chaves.push('fechar')
    const n = chaves.length
    const painelRaioEsqInf = '0.75rem'

    return (
      <div className="shrink-0 bg-white">
        <div
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {chaves.map((key, i) => (
            <div key={key} className={i < n - 1 ? 'min-w-0 border-r border-gray-200' : 'min-w-0'}>
              {key === 'cancelVenda' ? (
                <Button
                  type="button"
                  variant="contained"
                  color="error"
                  disabled={
                    cancelarVendaGestor.isPending ||
                    cancelarNotaFiscalVendaPdv.isPending ||
                    cancelarNotaFiscalVendaGestor.isPending
                  }
                  onClick={() => {
                    setTipoCancelamentoSelecionado('venda')
                    setModalCancelarVendaOpen(true)
                  }}
                  sx={{
                    ...footerBarGrayBarSx(i === 0),
                    borderBottomLeftRadius: painelRaioEsqInf,
                  }}
                  fullWidth
                >
                  Cancelar venda
                </Button>
              ) : null}
              {key === 'cancelNota' ? (
                <Button
                  type="button"
                  variant="contained"
                  color="error"
                  disabled={
                    cancelarVendaGestor.isPending ||
                    cancelarNotaFiscalVendaPdv.isPending ||
                    cancelarNotaFiscalVendaGestor.isPending
                  }
                  onClick={() => {
                    setTipoCancelamentoSelecionado('nota')
                    setModalCancelarVendaOpen(true)
                  }}
                  sx={footerBarGrayBarSx(i === 0)}
                  fullWidth
                >
                  Cancelar NF-e
                </Button>
              ) : null}
              {key === 'salvarCobranca' ? (
                <Button
                  type="button"
                  variant="contained"
                  disabled={isSavingPagamentoEntrega || pagamentos.length === 0}
                  onClick={onSalvarPagamentoEntrega}
                  sx={footerSavePrimaryBarSx(i === 0)}
                  fullWidth
                >
                  {isSavingPagamentoEntrega ? 'Salvando...' : 'Salvar cobrança'}
                </Button>
              ) : null}
              {key === 'fechar' ? (
                <Button
                  type="button"
                  variant="contained"
                  onClick={() => {
                    onSuccess()
                    handleClose()
                  }}
                  sx={{
                    ...footerBarPrimaryMutedSx,
                    ...(i === n - 1 ? { borderBottomRightRadius: painelRaioEsqInf } : {}),
                  }}
                  fullWidth
                >
                  Fechar
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (modoVisualizacao) {
    return (
      <div className="shrink-0 border-t border-gray-200 bg-white p-4">
        <Button type="button" variant="outlined" onClick={onClose} fullWidth>
          Fechar
        </Button>
      </div>
    )
  }

  return (
    <div className="shrink-0 border-t border-gray-200 bg-white p-4">
      <div className="flex gap-2">
        {currentStep > 1 ? (
          <Button
            type="button"
            variant="outlined"
            onClick={onPreviousStep}
            startIcon={<MdArrowBack />}
            className="flex-1"
          >
            Voltar
          </Button>
        ) : (
          <Button
            type="button"
            variant="outlined"
            color="error"
            onClick={onClose}
            startIcon={<MdCancel />}
            className="flex-1"
          >
            Cancelar
          </Button>
        )}

        {currentStep < 3 ? (
          <Button
            type="button"
            variant="contained"
            onClick={onNextStep}
            endIcon={<MdArrowForward />}
            className="flex-1"
          >
            Próximo
          </Button>
        ) : (
          <Button
            type="button"
            variant="contained"
            disabled={createPending || !canSubmit()}
            onClick={onSubmit}
            className="flex-1"
          >
            {createPending ? 'Salvando...' : 'Finalizar pedido'}
          </Button>
        )}
      </div>
    </div>
  )
}

'use client'

import { Button } from '@/src/presentation/components/ui/button'
import {
  footerBarErrorBarSx,
  footerBarPrimaryMutedSx,
  footerBarPrimaryTint10BarSx,
  footerSavePrimaryBarSx,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { MdArrowBack, MdArrowForward, MdCancel } from 'react-icons/md'
import { useNovoPedidoDetalheContext } from '../../context/NovoPedidoDetalheContext'
import { useNovoPedidoFormContext } from '../../context/NovoPedidoFormContext'
import { useNovoPedidoUIContext } from '../../context/NovoPedidoUIContext'

const FOOTER_BTN_CLASS = 'h-12 min-h-12 w-full font-semibold shadow-none'

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
    isLoadingVenda,
    abaDetalhesPedido,
    podeAjustarPagamentoEntregaEmAberto,
    cancelarVendaGestor,
    cancelarNotaFiscalVendaPdv,
    cancelarNotaFiscalVendaGestor,
    setTipoCancelamentoSelecionado,
  } = useNovoPedidoDetalheContext()
  const { pagamentos } = useNovoPedidoFormContext()
  const { currentStep, setModalCancelarVendaOpen, handleClose } = useNovoPedidoUIContext()

  /** Detalhes: rodapé só após a venda carregar (evita Fechar sozinho → Cancelar venda + Fechar). */
  if (modoVisualizacao && (isLoadingVenda || currentStep !== 4)) {
    return null
  }

  if (currentStep === 4) {
    type ChaveRodape4 = 'cancelVenda' | 'cancelNota' | 'salvarCobranca' | 'fechar'
    const chaves: ChaveRodape4[] = []
    if (podeExibirCancelarVendaGestor) chaves.push('cancelVenda')
    if (podeExibirCancelarNotaFiscal) chaves.push('cancelNota')
    if (podeAjustarPagamentoEntregaEmAberto && abaDetalhesPedido === 'pagamentos') {
      chaves.push('fechar')
      chaves.push('salvarCobranca')
    } else {
      chaves.push('fechar')
    }
    const n = chaves.length
    const painelRaioEsqInf = '0.75rem'

    return (
      <div className="shrink-0 bg-white">
        <div
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {chaves.map((key, i) => (
            <div
              key={key}
              className={`flex min-h-12 ${i < n - 1 ? 'min-w-0 border-r border-gray-200' : 'min-w-0'}`}
            >
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
                  className={FOOTER_BTN_CLASS}
                  sx={footerBarErrorBarSx(i === 0)}
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
                  className={FOOTER_BTN_CLASS}
                  sx={footerBarErrorBarSx(i === 0)}
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
                  className={FOOTER_BTN_CLASS}
                  sx={{
                    ...footerSavePrimaryBarSx(i === 0),
                    ...(i === n - 1 ? { borderBottomRightRadius: painelRaioEsqInf } : {}),
                  }}
                  fullWidth
                >
                  {isSavingPagamentoEntrega ? 'Salvando...' : 'Salvar cobrança'}
                </Button>
              ) : null}
              {key === 'fechar' ? (
                <Button
                  type="button"
                  variant="outlined"
                  color="inherit"
                  onClick={() => {
                    onSuccess()
                    handleClose()
                  }}
                  className={FOOTER_BTN_CLASS}
                  sx={{
                    ...footerBarPrimaryTint10BarSx(i === 0),
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

  const painelRaioEsqInf = '0.75rem'
  const showVoltar = currentStep > 1

  return (
    <div className="shrink-0 bg-white">
      <div
        className="grid w-full"
        style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
      >
        <div className="min-w-0 border-r border-gray-200">
          <Button
            type="button"
            variant="outlined"
            color={showVoltar ? 'inherit' : 'error'}
            onClick={showVoltar ? onPreviousStep : handleClose}
            fullWidth
            className={
              showVoltar ?
                'h-12 min-h-12 w-full font-semibold shadow-none'
              : 'h-12 min-h-12 w-full'
            }
            sx={
              showVoltar ?
                footerBarPrimaryMutedSx(true)
              : {
                  borderRadius: 0,
                  borderBottomLeftRadius: painelRaioEsqInf,
                  boxShadow: 'none',
                  border: 'none',
                  backgroundColor: '#fecaca',
                  '&.MuiButton-outlinedError': {
                    backgroundColor: '#fecaca',
                  },
                  
                }
            }
          >
            <span className="inline-flex w-full items-center justify-center gap-1.5">
              {showVoltar ?
                <>
                  <MdArrowBack className="h-5 w-5 shrink-0" aria-hidden />
                  Voltar
                </>
              : <>
                  <MdCancel className="h-5 w-5 shrink-0" aria-hidden />
                  Cancelar
                </>
              }
            </span>
          </Button>
        </div>

        <div className="min-w-0">
          {currentStep < 3 ? (
            <Button
              type="button"
              variant="contained"
              color="primary"
              onClick={onNextStep}
              fullWidth
              className="h-12 min-h-12 w-full font-semibold shadow-none"
              sx={{
                ...footerSavePrimaryBarSx(false),
                borderBottomRightRadius: painelRaioEsqInf,
              }}
            >
              <span className="inline-flex w-full items-center justify-center gap-1.5">
                Próximo
                <MdArrowForward className="h-5 w-5 shrink-0" aria-hidden />
              </span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="contained"
              color="primary"
              disabled={createPending}
              onClick={() => {
                if (createPending) return
                void onSubmit()
              }}
              fullWidth
              className={`h-12 min-h-12 w-full font-semibold shadow-none${!createPending && !canSubmit() ? ' opacity-60' : ''}`}
              sx={{
                ...footerSavePrimaryBarSx(false),
                borderBottomRightRadius: painelRaioEsqInf,
              }}
            >
              {createPending ? 'Salvando...' : 'Finalizar pedido'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

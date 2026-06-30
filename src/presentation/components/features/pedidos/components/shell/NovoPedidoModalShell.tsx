'use client'

import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { PainelPedidoBackdrop, JiffyPainelSlide } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovoPedidoHeader } from '../NovoPedidoHeader'
import { NovoPedidoStepper } from '../NovoPedidoStepper'
import { NovoPedidoFooterShell } from '../NovoPedidoFooter'
import { NovoPedidoAuxiliaryModals } from '../NovoPedidoAuxiliaryModals'
import { PedidoWizardStepsView } from '../PedidoWizardStepsView'
import { PedidoDetalhesView } from '../PedidoDetalhesView'
import { PedidoDetalhesFooter } from '../detalhes/PedidoDetalhesFooter'
import { EdicaoProdutosFooter } from '../detalhes/EdicaoProdutosFooter'
import type { NovoPedidoShellProps } from '../../hooks/orchestrator/types'
import { useNovoPedidoFormContext } from '../../context/NovoPedidoFormContext'
import { useNovoPedidoAtalhosTeclado } from '../../hooks/form/useNovoPedidoAtalhosTeclado'

export function NovoPedidoModalShell(props: NovoPedidoShellProps) {
  const {
    internalDialogOpen,
    handleDialogOpenChange,
    handlePedidoPainelExited,
    estaNoPassoProdutos,
    modoVisualizacao,
    modoEdicaoProdutos,
    salvandoProdutos,
    onSalvarProdutos,
    nomeUsuario,
    currentStep,
    isLoadingVenda,
    abaDetalhesPedido,
    setAbaDetalhesPedido,
    podeExibirAbaNotaFiscal,
    podeExibirAbaDadosEntrega,
    tipoInicioPedido,
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
  } = props

  const { setBuscaProdutoTexto } = useNovoPedidoFormContext()

  useNovoPedidoAtalhosTeclado({
    ativo: internalDialogOpen && !modoVisualizacao && !modoEdicaoProdutos,
    currentStep,
    setBuscaProdutoTexto,
    onNextStep,
    onPreviousStep,
  })

  const modalPaperWidth = estaNoPassoProdutos
    ? { xs: '95vw', sm: '90vw', md: '90vw' }
    : { xs: '95vw', sm: '50vw', md: '55vw' }

  return (
    <>
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      <Dialog
        open={internalDialogOpen}
        onOpenChange={handleDialogOpenChange}
        maxWidth={false}
        TransitionComponent={JiffyPainelSlide}
        transitionDuration={{ enter: 420, exit: 380 }}
        TransitionProps={{ onExited: handlePedidoPainelExited }}
        slots={{ backdrop: PainelPedidoBackdrop }}
        sx={{
          '& .MuiDialog-container': {
            zIndex: 1300,
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'flex-end',
          },
          '& .MuiBackdrop-root': {
            zIndex: 1300,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            transition: 'none',
          },
          '& .MuiDialog-paper': {
            zIndex: 1300,
            backgroundColor: '#ffffff',
            opacity: 1,
            height: '100vh',
            maxHeight: '100vh',
            margin: 0,
            marginLeft: 'auto',
            width: modalPaperWidth,
            maxWidth: '100vw',
            borderTopLeftRadius: '0.75rem',
            borderBottomLeftRadius: '0.75rem',
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            overflow: 'hidden',
            transition: 'width 0.25s ease',
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
          <NovoPedidoHeader
            modoVisualizacao={modoVisualizacao}
            modoEdicaoProdutos={modoEdicaoProdutos}
            nomeUsuario={nomeUsuario}
            currentStep={currentStep}
            isLoadingVenda={isLoadingVenda}
            abaDetalhesPedido={abaDetalhesPedido}
            onAbaDetalhesPedidoChange={setAbaDetalhesPedido}
            podeExibirAbaNotaFiscal={podeExibirAbaNotaFiscal}
            podeExibirAbaDadosEntrega={podeExibirAbaDadosEntrega}
          />
          {!modoEdicaoProdutos && (
            <NovoPedidoStepper
              currentStep={currentStep}
              modoVisualizacao={modoVisualizacao}
              tipoInicioPedido={tipoInicioPedido}
            />
          )}

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '0 24px',
              minHeight: 0,
            }}
            className="scrollbar-thin flex min-h-0 flex-1 flex-col"
          >
            {/* Loading em modo visualização - não mostrar steps até carregar */}
            {modoVisualizacao && isLoadingVenda && (
              <div className="flex h-full items-center justify-center bg-gray-50">
                <JiffyLoading />
              </div>
            )}

            <PedidoWizardStepsView />        
            <PedidoDetalhesView />
          </div>

          {modoEdicaoProdutos ? (
            <NovoPedidoFooterShell>
              <EdicaoProdutosFooter
                salvando={salvandoProdutos}
                onCancelar={onClose}
                onSalvar={onSalvarProdutos}
              />
            </NovoPedidoFooterShell>
          ) : (
            !(modoVisualizacao && isLoadingVenda) && (
              <NovoPedidoFooterShell>
                <PedidoDetalhesFooter
                  createPending={createPending}
                  canSubmit={canSubmit}
                  onSubmit={onSubmit}
                  onNextStep={onNextStep}
                  onPreviousStep={onPreviousStep}
                  onClose={onClose}
                  onSuccess={onSuccess}
                  podeExibirCancelarVendaGestor={podeExibirCancelarVendaGestor}
                  podeExibirCancelarNotaFiscal={podeExibirCancelarNotaFiscal}
                  isSavingPagamentoEntrega={isSavingPagamentoEntrega}
                  onSalvarPagamentoEntrega={onSalvarPagamentoEntrega}
                />
              </NovoPedidoFooterShell>
            )
          )}
        </DialogContent>

        <NovoPedidoAuxiliaryModals />
      </Dialog>
    </>
  )
}

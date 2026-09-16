'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useDeliveryBodyScrollLock } from '../../../shared/hooks/useDeliveryBodyScrollLock'
import { DeliveryComplementosObrigatoriosAlertDialog } from '../DeliveryComplementosObrigatoriosAlertDialog'
import { DeliveryProdutoPainelAmplo } from './DeliveryProdutoPainelAmplo'
import { DeliveryProdutoPainelEstreito } from './DeliveryProdutoPainelEstreito'
import {
  useDeliveryProdutoModalState,
  type DeliveryProdutoModalProps,
} from './useDeliveryProdutoModalState'

export type { DeliveryProdutoModalProps }

export function DeliveryProdutoModal(props: DeliveryProdutoModalProps) {
  useDeliveryBodyScrollLock()

  const state = useDeliveryProdutoModalState(props)
  const disabledSalvar = state.salvando || state.carregandoOpcoes

  return (
    <AnimatePresence onExitComplete={state.handleExitComplete}>
      {state.aberto ? (
        <>
          <motion.div
            key="delivery-produto-backdrop"
            className="delivery-vv-overlay z-50"
            style={{ backgroundColor: 'var(--delivery-overlay, rgba(0, 0, 0, 0.45))' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={state.handleOverlayClick}
            aria-hidden
          />

          <motion.aside
            key="delivery-produto-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Detalhes do produto"
            className={[
              'delivery-vv-panel z-50 flex flex-col shadow-2xl',
              state.painelAmplo ? 'delivery-vv-panel--produto-complementos' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ backgroundColor: 'var(--delivery-surface)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {state.painelAmplo ? (
              <DeliveryProdutoPainelAmplo
                produto={state.produto}
                precisaComplementos={state.precisaComplementos}
                carregandoOpcoes={state.carregandoOpcoes}
                grupos={state.grupos}
                valorComplementosUnitario={state.valorComplementosUnitario}
                getQuantidadeComplemento={state.getQuantidadeComplemento}
                ajustarQuantidadeComplemento={state.ajustarQuantidadeComplemento}
                scrollRef={state.scrollRef}
                bannerComplementosRef={state.bannerComplementosRef}
                observacao={state.observacao}
                onObservacaoChange={state.setObservacao}
                quantidade={state.quantidade}
                onQuantidadeChange={state.setQuantidade}
                valorTotal={state.valorTotal}
                salvando={state.salvando}
                isEdicao={state.isEdicao}
                disabledSalvar={disabledSalvar}
                onSalvar={state.handleSalvar}
                onClose={state.requestClose}
                onIrParaComplementos={state.handleIrParaComplementos}
                onCompartilhar={state.handleCompartilhar}
              />
            ) : (
              <DeliveryProdutoPainelEstreito
                produto={state.produto}
                alturaPrimeiraDobra={state.alturaPrimeiraDobra}
                scrollRef={state.scrollRef}
                bannerComplementosRef={state.bannerComplementosRef}
                observacao={state.observacao}
                onObservacaoChange={state.setObservacao}
                quantidade={state.quantidade}
                onQuantidadeChange={state.setQuantidade}
                valorTotal={state.valorTotal}
                salvando={state.salvando}
                isEdicao={state.isEdicao}
                disabledSalvar={disabledSalvar}
                onSalvar={state.handleSalvar}
                onClose={state.requestClose}
                onCompartilhar={state.handleCompartilhar}
              />
            )}
          </motion.aside>

          {state.gruposPendentesAlerta.length > 0 ? (
            <DeliveryComplementosObrigatoriosAlertDialog
              gruposPendentes={state.gruposPendentesAlerta}
              onConfirmar={state.handleConfirmarAlertaComplementos}
            />
          ) : null}
        </>
      ) : null}
    </AnimatePresence>
  )
}

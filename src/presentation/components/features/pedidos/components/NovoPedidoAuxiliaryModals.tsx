'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { Textarea } from '@/src/presentation/components/ui/textarea'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { SeletorClienteModal } from './SeletorClienteModal'
import { ModalLancamentoProdutoPainel } from './ModalLancamentoProdutoPainel'
import { PainelEdicaoProdutoLinhaPedido } from './PainelEdicaoProdutoLinhaPedido'
import { ProdutosTabsModal } from '@/src/presentation/components/features/produtos/ProdutosTabsModal'
import { ClientesTabsModal } from '@/src/presentation/components/features/clientes/ClientesTabsModal'
import { ComplementosTabsModal } from '@/src/presentation/components/features/complementos/ComplementosTabsModal'
import { useNovoPedidoDetalheContext } from '../context/NovoPedidoDetalheContext'
import { useNovoPedidoFormContext } from '../context/NovoPedidoFormContext'
import { useNovoPedidoUIContext } from '../context/NovoPedidoUIContext'

export function NovoPedidoAuxiliaryModals() {
  const {
    cancelarNotaFiscalVendaGestor,
    cancelarNotaFiscalVendaPdv,
    cancelarVendaGestor,
    handleConfirmarCancelamentoVenda,
    handleFecharProdutoTabsModal,
    handleTabChangeProdutoModal,
    justificativaCancelamento,
    produtoTabsModalState,
    setJustificativaCancelamento,
    setTipoCancelamentoSelecionado,
    tabelaOrigemVenda,
    tipoCancelamentoSelecionado,
    tipoInicioPedido,
  } = useNovoPedidoDetalheContext()
  const {
    seletorClienteOpen,
    setSeletorClienteOpen,
    modalCancelarVendaOpen,
    setModalCancelarVendaOpen,
    modalConfirmacaoSaidaOpen,
    setModalConfirmacaoSaidaOpen,
    modalEdicaoProdutoOpen,
    setModalEdicaoProdutoOpen,
    modalLancamentoProdutoPainelOpen,
    setModalLancamentoProdutoPainelOpen,
    handleCancelarSaida,
    handleConfirmarSaida,
    handleClose,
  } = useNovoPedidoUIContext()
  const {
    catalogoProdutosPorId,
    carregandoComplementosPainel,
    complementoTabsModalPainelState,
    abrirEdicaoComplementoNoPainel,
    fecharComplementoTabsModalNoPainel,
    handleTabChangeComplementoTabsModalPainel,
    recarregarProdutoPainelAposEdicaoComplemento,
    recarregarProdutoCarrinhoAposEdicao,
    confirmarEdicaoProduto,
    confirmarLancamentoProdutoPainel,
    ehAcrescimo,
    ehPorcentagem,
    handleFecharClienteTabsModalEntrega,
    handleReloadClienteEntregaAposEdicao,
    handleSelectCliente,
    handleTabChangeClienteTabsModalEntrega,
    indiceLinhaPainelProduto,
    painelLinhaModo,
    produtoIndexEdicao,
    produtoParaLancamentoPainel,
    produtos,
    produtosList,
    quantidadeEdicao,
    unidadeMedidaEdicao,
    setEhAcrescimo,
    setEhPorcentagem,
    setIndiceLinhaPainelProduto,
    setPainelLinhaModo,
    setProdutoIndexEdicao,
    setProdutoParaLancamentoPainel,
    setQuantidadeEdicao,
    setUnidadeMedidaEdicao,
    setValorDescontoAcrescimo,
    setValorUnitarioEdicaoPainel,
    clienteTabsModalEntregaState,
    valorDescontoAcrescimo,
    valorUnitarioEdicaoPainel,
  } = useNovoPedidoFormContext()

  return (
    <>        {seletorClienteOpen && (
          <SeletorClienteModal
            open={seletorClienteOpen}
            onClose={() => setSeletorClienteOpen(false)}
            onSelect={handleSelectCliente}
            title={tipoInicioPedido === 'entrega' ? 'Selecionar cliente da entrega' : undefined}
          />
        )}

        {produtoParaLancamentoPainel ? (
          <ModalLancamentoProdutoPainel
            open={modalLancamentoProdutoPainelOpen}
            onOpenChange={setModalLancamentoProdutoPainelOpen}
            onAfterClose={() => {
              setProdutoParaLancamentoPainel(null)
              setIndiceLinhaPainelProduto(null)
              setPainelLinhaModo('lancamento')
            }}
            carregandoComplementos={carregandoComplementosPainel}
            produto={produtoParaLancamentoPainel}
            mostrarAlterarPreco={
              painelLinhaModo !== 'observacao' &&
              produtoParaLancamentoPainel.permiteAlterarPrecoAtivo()
            }
            mostrarComplementos={
              painelLinhaModo === 'complementos' ||
              (painelLinhaModo === 'lancamento' &&
                produtoParaLancamentoPainel.abreComplementosAtivo())
            }
            mostrarObservacao={painelLinhaModo === 'observacao'}
            observacaoInicial={
              painelLinhaModo === 'observacao' && indiceLinhaPainelProduto !== null
                ? produtos[indiceLinhaPainelProduto]?.observacao
                : undefined
            }
            mostrarAvisoComplementosManual={
              painelLinhaModo === 'lancamento' &&
              indiceLinhaPainelProduto === null &&
              !produtoParaLancamentoPainel.abreComplementosAtivo()
            }
            tituloBarra={
              painelLinhaModo === 'observacao'
                ? 'Observação do item'
                : indiceLinhaPainelProduto !== null
                  ? 'Ajustar produto no pedido'
                  : 'Lançar na venda'
            }
            valorUnitarioInicial={
              indiceLinhaPainelProduto !== null
                ? produtos[indiceLinhaPainelProduto]?.valorUnitario
                : undefined
            }
            quantidadesComplementosIniciais={
              indiceLinhaPainelProduto !== null &&
              (painelLinhaModo === 'complementos' ||
                (painelLinhaModo === 'lancamento' &&
                  produtoParaLancamentoPainel.abreComplementosAtivo()))
                ? Object.fromEntries(
                    produtos[indiceLinhaPainelProduto]?.complementos?.map(
                      (c: { grupoId: string; id: string; quantidade: number }) => [
                        `${c.grupoId}-${c.id}`,
                        c.quantidade,
                      ]
                    ) ?? []
                  )
                : undefined
            }
            onConfirm={confirmarLancamentoProdutoPainel}
            onComplementoDoubleClick={abrirEdicaoComplementoNoPainel}
          />
        ) : null}

        <ComplementosTabsModal
          state={complementoTabsModalPainelState}
          onClose={fecharComplementoTabsModalNoPainel}
          onTabChange={handleTabChangeComplementoTabsModalPainel}
          onReload={recarregarProdutoPainelAposEdicaoComplemento}
          zIndex={1500}
        />

        {modalEdicaoProdutoOpen && produtoIndexEdicao !== null ? (
          <PainelEdicaoProdutoLinhaPedido
            open={modalEdicaoProdutoOpen}
            onClose={() => {
              setModalEdicaoProdutoOpen(false)
              setProdutoIndexEdicao(null)
              setValorUnitarioEdicaoPainel('')
            }}
            onConfirmar={confirmarEdicaoProduto}
            title={produtos[produtoIndexEdicao].nome}
            produtoLinha={produtos[produtoIndexEdicao]}
            permiteAlterarPreco={
              (() => {
                const id = produtos[produtoIndexEdicao].produtoId
                return (
                  catalogoProdutosPorId[id] ??
                  produtosList.find((p: any) => p.getId() === id)
                )?.permiteAlterarPrecoAtivo() ?? false
              })()
            }
            valorUnitarioInput={valorUnitarioEdicaoPainel}
            onValorUnitarioInputChange={setValorUnitarioEdicaoPainel}
            permiteDesconto={
              (() => {
                const id = produtos[produtoIndexEdicao].produtoId
                return (
                  catalogoProdutosPorId[id] ??
                  produtosList.find((p: any) => p.getId() === id)
                )?.permiteDescontoAtivo() ?? false
              })()
            }
            permiteAcrescimo={
              (() => {
                const id = produtos[produtoIndexEdicao].produtoId
                return (
                  catalogoProdutosPorId[id] ??
                  produtosList.find((p: any) => p.getId() === id)
                )?.permiteAcrescimoAtivo() ?? false
              })()
            }
            quantidadeEdicao={quantidadeEdicao}
            onQuantidadeEdicaoChange={setQuantidadeEdicao}
            unidadeMedida={unidadeMedidaEdicao}
            ehAcrescimo={ehAcrescimo}
            onEhAcrescimoChange={setEhAcrescimo}
            ehPorcentagem={ehPorcentagem}
            onEhPorcentagemChange={setEhPorcentagem}
            valorDescontoAcrescimo={valorDescontoAcrescimo}
            onValorDescontoAcrescimoChange={setValorDescontoAcrescimo}
          />
        ) : null}

        {/* Modal de Confirmação de Saída */}
        <Dialog
          open={modalConfirmacaoSaidaOpen}
          onOpenChange={setModalConfirmacaoSaidaOpen}
          maxWidth="sm"
          sx={{
            '& .MuiDialog-container': {
              zIndex: 1400,
            },
          }}
        >
          <DialogContent sx={{ p: 3 }}>
            <DialogTitle sx={{ mb: 2 }}>Confirmar Saída</DialogTitle>
            <div style={{ marginBottom: '24px' }}>
              <DialogDescription>
                Você tem certeza que deseja sair? Todos os dados da venda serão perdidos.
              </DialogDescription>
            </div>
            <DialogFooter sx={{ gap: 2, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={handleCancelarSaida}>
                Cancelar
              </Button>
              <Button variant="contained" color="error" onClick={handleConfirmarSaida}>
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de justificativa: cancelamento por origem (Gestor: venda | PDV: nota fiscal) */}
        <Dialog
          open={modalCancelarVendaOpen}
          onOpenChange={isOpen => {
            setModalCancelarVendaOpen(isOpen)
            if (!isOpen) {
              setJustificativaCancelamento('')
              setTipoCancelamentoSelecionado('venda')
            }
          }}
          maxWidth="sm"
          sx={{
            '& .MuiDialog-container': {
              zIndex: 1400,
            },
          }}
        >
          <DialogContent sx={{ p: 3 }}>
            <DialogTitle
              sx={{
                mb: 2,
                backgroundColor: 'var(--color-error, #d32f2f)',
                color: 'white',
                mx: -3,
                mt: -3,
                px: 3,
                py: 2,
              }}
            >
              {tipoCancelamentoSelecionado === 'venda' ? 'Cancelar Venda' : 'Cancelar Nota Fiscal'}
            </DialogTitle>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-600">
                {tipoCancelamentoSelecionado === 'venda'
                  ? 'Esta ação cancelará a venda e, se houver nota fiscal emitida, também a cancelará na SEFAZ.'
                  : tabelaOrigemVenda === 'venda_gestor'
                    ? 'Esta ação cancelará a nota fiscal vinculada à venda do Gestor na SEFAZ.'
                    : 'Esta ação cancelará a nota fiscal vinculada à venda PDV na SEFAZ.'}
              </p>
              <p className="text-sm font-semibold text-red-600">Esta ação não pode ser desfeita!</p>
              <Textarea
                label="Justificativa do Cancelamento"
                placeholder="Digite o motivo do cancelamento (mínimo 15 caracteres)"
                value={justificativaCancelamento}
                onChange={e => setJustificativaCancelamento(e.target.value)}
                error={
                  justificativaCancelamento.length > 0 &&
                  justificativaCancelamento.trim().length < 15
                }
                helperText={`${justificativaCancelamento.length}/15 caracteres mínimos`}
                rows={4}
              />
            </div>
            <DialogFooter sx={{ gap: 2, justifyContent: 'flex-end', mt: 3, pt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setModalCancelarVendaOpen(false)
                  setJustificativaCancelamento('')
                  setTipoCancelamentoSelecionado('venda')
                }}
                disabled={
                  cancelarVendaGestor.isPending ||
                  cancelarNotaFiscalVendaPdv.isPending ||
                  cancelarNotaFiscalVendaGestor.isPending
                }
              >
                Voltar
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleConfirmarCancelamentoVenda}
                disabled={
                  cancelarVendaGestor.isPending ||
                  cancelarNotaFiscalVendaPdv.isPending ||
                  cancelarNotaFiscalVendaGestor.isPending ||
                  justificativaCancelamento.trim().length < 15
                }
                isLoading={
                  cancelarVendaGestor.isPending ||
                  cancelarNotaFiscalVendaPdv.isPending ||
                  cancelarNotaFiscalVendaGestor.isPending
                }
              >
                Confirmar Cancelamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <ProdutosTabsModal
          state={produtoTabsModalState}
          onClose={handleFecharProdutoTabsModal}
          onReload={recarregarProdutoCarrinhoAposEdicao}
          onTabChange={handleTabChangeProdutoModal}
        />
        <ClientesTabsModal
          state={clienteTabsModalEntregaState}
          onClose={handleFecharClienteTabsModalEntrega}
          onReload={handleReloadClienteEntregaAposEdicao}
          onTabChange={handleTabChangeClienteTabsModalEntrega}
          zIndex={1700}
        />
      </>
  )
}
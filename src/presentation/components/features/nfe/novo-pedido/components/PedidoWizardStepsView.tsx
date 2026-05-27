'use client'

import { Button } from '@/src/presentation/components/ui/button'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { Label } from '@/src/presentation/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/presentation/components/ui/select'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { MdAccessTime, MdArrowBack, MdAttachMoney, MdClear, MdCreditCard, MdDelete, MdDeliveryDining, MdEdit, MdExpandLess, MdExpandMore, MdLaunch, MdPersonOutline, MdQrCode, MdSearch, MdStore } from 'react-icons/md'
import { EntregaClienteSelector } from '../../EntregaClienteSelector'
import { PedidoInformacoesStep } from './PedidoInformacoesStep'
import { PedidoPagamentoStep } from './PedidoPagamentoStep'
import { PedidoProdutosStep } from './PedidoProdutosStep'
import { SEM_ENTREGADOR_VALUE, SEM_TAXA_ENTREGA_VALUE, setUltimoEntregadorSelecionado, TEMPOS_PREVISTOS_ENTREGA } from '../novoPedidoTextHelpers'
import { useNovoPedidoContext } from '../context/NovoPedidoContext'

export function PedidoWizardStepsView() {
  const {
    adicionarPagamentoPorCard,
    buscaProdutoFiltrada,
    buscaProdutoTexto,
    abrirModalComplementosProdutoExistente,
    abrirModalEdicaoProduto,
    adicionarProduto,
    atualizarComplemento,
    atualizarProduto,
    calcularTotalProduto,
    clienteEntregaVinculado,
    clienteNome,
    currentStep,
    ehAcrescimo,
    ehPorcentagem,
    empresa,
    entregadorId,
    entregadores,
    entregadoresQuery,
    formatarDescontoAcrescimo,
    formatarNumeroComMilhar,
    formatarValorComplemento,
    formatarValorRecebido,
    fluxoPagamentoEntrega,
    grupoSelecionadoId,
    grupos,
    gruposExpandido,
    gruposScrollRef,
    handleAbrirEdicaoClienteEntrega,
    handleAbrirEdicaoProdutoDetalhes,
    handleMouseDown,
    handleMouseDownMeiosPagamento,
    handleMouseLeave,
    handleMouseMove,
    handleMouseUp,
    handleTipoAtendimentoDeliveryChange,
    hasMovedMeiosPagamentoRef,
    hasMovedRef,
    isDragging,
    isDraggingMeiosPagamento,
    isLoadingBuscaProdutos,
    isLoadingGruposVenda,
    isLoadingProdutos,
    meioPagamentoId,
    meiosPagamento,
    meiosPagamentoScrollRef,
    longPressComplementoIndexRef,
    longPressComplementoTimeoutRef,
    longPressIndexRef,
    longPressTimeoutRef,
    mostrarLoadingFormasPagamento,
    modoVisualizacao,
    obterIconeMeioPagamento,
    obterTotalComplemento,
    origem,
    pagamentos,
    pedidoComEntrega,
    pedidoComRetirada,
    pedidoDeliveryGestor,
    pedidoEntregaAceitaPagamentoPendente,
    pedidoGestorComPagamentoNoPasso3,
    produtos,
    produtosList,
    produtosError,
    removerPagamento,
    removerComplemento,
    removerProduto,
    rotuloCobrancaPendente,
    rotuloStatusPagamentoExibicao,
    rotuloStatusResumoModal,
    setClienteEntregaVinculado,
    setEhAcrescimo,
    setEhPorcentagem,
    setEntregadorId,
    setGrupoSelecionadoId,
    setGruposExpandido,
    setMeioPagamentoId,
    setFluxoPagamentoEntrega,
    setMoradaEntregaSelecionada,
    setPagamentos,
    setSeletorClienteOpen,
    setTaxaEntregaId,
    setTelefoneBuscadoEntrega,
    setTelefoneBuscaEntrega,
    setTempoPrevistoMinutos,
    setTooltipGrupoId,
    setTooltipPosition,
    setBuscaProdutoTexto,
    setValoresEmEdicao,
    setValorDescontoAcrescimo,
    setValorRecebido,
    statusPagamentoExibicao,
    taxaEntregaId,
    taxaEntregaSelecionada,
    taxasEntrega,
    taxasEntregaQuery,
    telefoneBuscadoEntrega,
    telefoneBuscaEntrega,
    tempoPrevistoMinutos,
    tipoInicioPedido,
    tooltipGrupoId,
    tooltipPosition,
    totalItensPedido,
    totalPagamentos,
    totalPagamentosLancados,
    totalProdutos,
    trocoLancamento,
    valorAPagarLancamento,
    valorAPagar,
    valorDescontoAcrescimo,
    valorRecebido,
    valorTaxaEntrega,
    valoresEmEdicao,
    moradaEntregaSelecionada,
    subtotalProdutos,
  } = useNovoPedidoContext()
  const nomeClienteResumo =
    tipoInicioPedido === 'entrega' ? (clienteEntregaVinculado?.nome ?? '') : clienteNome
  const restanteALancarExibicao = pedidoEntregaAceitaPagamentoPendente
    ? valorAPagarLancamento
    : valorAPagar
  const rotuloCampoValorRecebido =
    pedidoEntregaAceitaPagamentoPendente && fluxoPagamentoEntrega === 'cobrar_entregador'
      ? 'Valor a receber:'
      : 'Valor Recebido:'

  return (
    <>            {/* Informações do Pedido: somente delivery/entrega */}
            {!modoVisualizacao && tipoInicioPedido === 'entrega' && currentStep === 2 && (
              <PedidoInformacoesStep>
                {pedidoDeliveryGestor && (
                  <div className="rounded-lg border-2 border-primary/20 bg-gray-50 p-3">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <MdStore className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-lg font-semibold text-primary">
                        Tipo de atendimento
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleTipoAtendimentoDeliveryChange('entrega')}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                          pedidoComEntrega
                            ? 'border-primary bg-primary text-white'
                            : 'border-gray-200 bg-white text-primary-text hover:border-primary/50'
                        }`}
                      >
                        Entrega
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTipoAtendimentoDeliveryChange('retirada')}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                          pedidoComRetirada
                            ? 'border-primary bg-primary text-white'
                            : 'border-gray-200 bg-white text-primary-text hover:border-primary/50'
                        }`}
                      >
                        Retirada
                      </button>
                    </div>
                  </div>
                )}

                {/* Fluxo entrega: campo de telefone + seleção de morada */}
                {(
                  <div className="rounded-lg border-2 border-primary/20 bg-gray-50 p-3">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <MdPersonOutline className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-lg font-semibold text-primary">
                        {pedidoComEntrega ? 'Cliente e endereço de entrega' : 'Cliente da retirada'}
                      </span>
                    </div>
                    <EntregaClienteSelector
                      moradaSelecionada={moradaEntregaSelecionada}
                      onMoradaSelecionada={setMoradaEntregaSelecionada}
                      clienteVinculado={clienteEntregaVinculado}
                      onClienteVinculado={setClienteEntregaVinculado}
                      onEditarClientePorDuploClique={handleAbrirEdicaoClienteEntrega}
                      onAbrirSeletorCliente={() => setSeletorClienteOpen(true)}
                      telefoneExibicaoExterno={telefoneBuscaEntrega}
                      onTelefoneExibicaoExternoChange={setTelefoneBuscaEntrega}
                      digitosUltimaBuscaExterno={telefoneBuscadoEntrega}
                      onDigitosUltimaBuscaExternoChange={setTelefoneBuscadoEntrega}
                      enderecoPadrao={{
                        cidade: empresa?.cidade,
                        estado: empresa?.estado,
                      }}
                      mostrarEnderecos={pedidoComEntrega}
                    />
                    {pedidoComRetirada ? (
                      <div className="mt-3 rounded-lg border border-primary/15 bg-white p-3 text-sm text-secondary-text">
                        Pedido configurado para retirada no balcão. Entregador e taxa de entrega não
                        são necessários.
                      </div>
                    ) : null}
                    {pedidoComEntrega && (
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg border border-primary/15 bg-white p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <MdAccessTime className="h-4 w-4 text-primary" />
                          <Label className="text-sm font-semibold text-primary-text">
                            Tempo previsto
                          </Label>
                        </div>
                        <Select
                          value={String(tempoPrevistoMinutos)}
                          onValueChange={value => setTempoPrevistoMinutos(Number(value) || 30)}
                        >
                          <SelectTrigger className="border-primary/30 bg-white">
                            <SelectValue placeholder="Selecione o tempo" />
                          </SelectTrigger>
                          <SelectContent>
                            {TEMPOS_PREVISTOS_ENTREGA.map(minutos => (
                              <SelectItem key={minutos} value={String(minutos)}>
                                {minutos} minutos
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-1 text-xs text-secondary-text">
                          Enviado como <code>tempoPrevistoMinutos</code>; o backend calcula a previsão.
                        </p>
                      </div>

                      <div className="rounded-lg border border-primary/15 bg-white p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <MdDeliveryDining className="h-4 w-4 text-primary" />
                          <Label className="text-sm font-semibold text-primary-text">
                            Entregador
                          </Label>
                        </div>
                        <Select
                          value={entregadorId || SEM_ENTREGADOR_VALUE}
                          onValueChange={value => {
                            const novoEntregadorId = value === SEM_ENTREGADOR_VALUE ? '' : value
                            setEntregadorId(novoEntregadorId)
                            setUltimoEntregadorSelecionado(novoEntregadorId)
                          }}
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
                            <SelectItem value={SEM_ENTREGADOR_VALUE}>
                              Sem entregador definido
                            </SelectItem>
                            {entregadores.map((entregador: any) => (
                              <SelectItem key={entregador.id} value={entregador.id}>
                                {entregador.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-1 text-xs text-secondary-text">
                          Somente usuários PDV ativos do tipo entregador.
                        </p>
                      </div>

                      <div className="rounded-lg border border-primary/15 bg-white p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <MdAttachMoney className="h-4 w-4 text-primary" />
                          <Label className="text-sm font-semibold text-primary-text">
                            Taxa de entrega
                          </Label>
                        </div>
                        <Select
                          value={taxaEntregaId || SEM_TAXA_ENTREGA_VALUE}
                          onValueChange={value =>
                            setTaxaEntregaId(value === SEM_TAXA_ENTREGA_VALUE ? '' : value)
                          }
                          disabled={taxasEntregaQuery.isLoading}
                        >
                          <SelectTrigger className="border-primary/30 bg-white">
                            <SelectValue
                              placeholder={
                                taxasEntregaQuery.isLoading
                                  ? 'Carregando taxas...'
                                  : 'Selecionar taxa'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SEM_TAXA_ENTREGA_VALUE}>
                              Sem taxa de entrega
                            </SelectItem>
                            {taxasEntrega.map((taxa: any) => (
                              <SelectItem key={taxa.getId()} value={taxa.getId()}>
                                {taxa.getNome()} - {transformarParaReal(taxa.getValor())}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-1 text-xs text-secondary-text">
                          {taxaEntregaSelecionada
                            ? `Produtos ${transformarParaReal(subtotalProdutos)} + taxa ${transformarParaReal(valorTaxaEntrega)} = ${transformarParaReal(totalProdutos)}.`
                            : 'Selecione uma taxa cadastrada do tipo entrega.'}
                        </p>
                      </div>
                    </div>
                    )}
                  </div>
                )}
              </PedidoInformacoesStep>
            )}

            {/* Produtos: step 1 no balcão e no delivery */}
            {!modoVisualizacao &&
              ((tipoInicioPedido !== 'entrega' && currentStep === 1) ||
                (tipoInicioPedido === 'entrega' && currentStep === 1)) && (
              <PedidoProdutosStep>
                {/* Campo de pesquisa de produtos */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <MdSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar produto pelo nome..."
                      value={buscaProdutoTexto}
                      onChange={(e) => setBuscaProdutoTexto(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {buscaProdutoTexto.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setBuscaProdutoTexto('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <MdClear className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Área de Edição de Produtos Selecionados: altura fixa quando grupos visíveis, cresce quando grupos ocultos */}
                <div
                  className={`scrollbar-thin overflow-y-auto rounded-lg border bg-gray-50 ${
                    gruposExpandido ? 'h-48 flex-shrink-0' : 'min-h-64 flex-1'
                  }`}
                >
                  {produtos.length > 0 ? (
                    <div className="p-2">
                      {/* Cabeçalho da tabela */}
                      <div className="mb-2 flex gap-2 border-b border-gray-300 pb-2">
                        <div className="flex w-[60px] flex-shrink-0 items-center justify-center">
                          <span className="text-center text-xs font-semibold text-gray-700">
                            Qtd
                          </span>
                        </div>
                        <div className="flex-[4]">
                          <span className="text-xs font-semibold text-gray-700">Produto</span>
                        </div>
                        <div className="flex flex-1 justify-end">
                          <span className="text-right text-xs font-semibold text-gray-700">
                            Desc./Acres.
                          </span>
                        </div>
                        <div className="flex flex-1 justify-end">
                          <span className="text-right text-xs font-semibold text-gray-700">
                            Val Unit.
                          </span>
                        </div>
                        <div className="flex flex-1 justify-end">
                          <span className="text-right text-xs font-semibold text-gray-700">
                            Total
                          </span>
                        </div>
                        <div className="flex flex-1 justify-end">
                          <span className="mr-2 text-xs font-semibold text-gray-700">Ações</span>
                        </div>
                      </div>
                      {/* Linhas de produtos */}
                      <div className="space-y-1">
                        {produtos.map((produto: any, index: number) => {
                          // calcularTotalProduto já inclui complementos e desconto/acréscimo
                          const totalProdutoComComplementos = calcularTotalProduto(produto)

                          return (
                            <div key={index} className="space-y-0">
                              {/* Linha do Produto Principal */}
                              <div
                                className={`flex items-center gap-1 rounded ${
                                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                } cursor-pointer hover:bg-gray-100`}
                                onMouseDown={e => {
                                  // Iniciar long press apenas se não for em um input ou button
                                  const target = e.target as HTMLElement
                                  if (
                                    target.tagName === 'INPUT' ||
                                    target.tagName === 'BUTTON' ||
                                    target.closest('button') ||
                                    target.closest('input')
                                  ) {
                                    return
                                  }

                                  longPressIndexRef.current = index
                                  longPressTimeoutRef.current = setTimeout(() => {
                                    if (longPressIndexRef.current === index) {
                                      void abrirModalEdicaoProduto(index)
                                    }
                                  }, 800) // 800ms para long press
                                }}
                                onMouseUp={() => {
                                  // Limpar timeout se soltar antes do tempo
                                  if (longPressTimeoutRef.current) {
                                    clearTimeout(longPressTimeoutRef.current)
                                    longPressTimeoutRef.current = null
                                  }
                                  longPressIndexRef.current = null
                                }}
                                onMouseLeave={() => {
                                  // Limpar timeout se sair da área
                                  if (longPressTimeoutRef.current) {
                                    clearTimeout(longPressTimeoutRef.current)
                                    longPressTimeoutRef.current = null
                                  }
                                  longPressIndexRef.current = null
                                }}
                              >
                                {/* Quantidade */}
                                <div className="w-[60px] flex-shrink-0">
                                  <input
                                    type="number"
                                    min={1}
                                    value={Math.floor(produto.quantidade)}
                                    onChange={e => {
                                      const valor = parseInt(e.target.value) || 1
                                      atualizarProduto(index, 'quantidade', Math.max(1, valor))
                                    }}
                                    style={{
                                      MozAppearance: 'textfield',
                                      WebkitAppearance: 'none',
                                      appearance: 'none',
                                    }}
                                    className="h-7 w-full border-0 bg-transparent p-1 text-center text-xs focus:bg-white focus:ring-1 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  />
                                </div>
                                {/* Nome do Produto */}
                                <div className="min-w-0 flex-[4]">
                                  <span className="block truncate text-xs text-gray-900">
                                    {produto.nome}
                                  </span>
                                </div>
                                {/* Desconto/Acréscimo */}
                                <div className="flex-1">
                                  <span className="block text-right text-xs text-gray-600">
                                    {formatarDescontoAcrescimo(produto)}
                                  </span>
                                </div>
                                {/* Valor Unitário */}
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={
                                      valoresEmEdicao[index] !== undefined
                                        ? valoresEmEdicao[index]
                                        : produto.valorUnitario > 0
                                          ? formatarNumeroComMilhar(produto.valorUnitario)
                                          : ''
                                    }
                                    onChange={e => {
                                      let valorStr = e.target.value

                                      // Se vazio, limpa o campo
                                      if (valorStr === '') {
                                        setValoresEmEdicao((prev: any) => ({ ...prev, [index]: '' }))
                                        atualizarProduto(index, 'valorUnitario', 0)
                                        return
                                      }

                                      // Remove pontos (separadores de milhar) e vírgula, mantém apenas números
                                      valorStr = valorStr
                                        .replace(/\./g, '')
                                        .replace(',', '')
                                        .replace(/\D/g, '')

                                      // Se vazio após limpeza, limpa o campo
                                      if (valorStr === '') {
                                        setValoresEmEdicao((prev: any) => ({ ...prev, [index]: '' }))
                                        atualizarProduto(index, 'valorUnitario', 0)
                                        return
                                      }

                                      // Converte para número (centavos) e divide por 100 para obter reais
                                      const valorCentavos = parseInt(valorStr, 10)
                                      const valorReais = valorCentavos / 100

                                      // Formata com separadores de milhar
                                      const valorFormatado = formatarNumeroComMilhar(valorReais)

                                      // Atualiza o estado de edição com o valor formatado
                                      setValoresEmEdicao((prev: any) => ({
                                        ...prev,
                                        [index]: valorFormatado,
                                      }))

                                      // Atualiza o valor do produto
                                      atualizarProduto(index, 'valorUnitario', valorReais)
                                    }}
                                    onFocus={e => {
                                      // Ao focar, mantém o valor formatado (ex: "8,00" ou "1.000.000,00")
                                      const valorAtual = produto.valorUnitario
                                      if (valorAtual > 0) {
                                        const valorFormatado = formatarNumeroComMilhar(valorAtual)
                                        setValoresEmEdicao((prev: any) => ({
                                          ...prev,
                                          [index]: valorFormatado,
                                        }))
                                      } else {
                                        setValoresEmEdicao((prev: any) => ({ ...prev, [index]: '' }))
                                      }
                                      // Seleciona todo o texto para facilitar substituição
                                      setTimeout(() => e.target.select(), 0)
                                    }}
                                    onBlur={e => {
                                      // Garante formatação correta ao perder o foco
                                      const valor = produto.valorUnitario
                                      if (valor > 0) {
                                        const valorFormatado = formatarNumeroComMilhar(valor)
                                        setValoresEmEdicao((prev: any) => ({
                                          ...prev,
                                          [index]: valorFormatado,
                                        }))
                                        // Remove do estado após um pequeno delay para mostrar formato final
                                        setTimeout(() => {
                                          setValoresEmEdicao((prev: any) => {
                                            const novo = { ...prev }
                                            delete novo[index]
                                            return novo
                                          })
                                        }, 100)
                                      } else {
                                        // Remove do estado se vazio
                                        setValoresEmEdicao((prev: any) => {
                                          const novo = { ...prev }
                                          delete novo[index]
                                          return novo
                                        })
                                      }
                                    }}
                                    placeholder="0,00"
                                    style={{
                                      MozAppearance: 'textfield',
                                      WebkitAppearance: 'none',
                                      appearance: 'none',
                                    }}
                                    className="h-7 w-full border-0 bg-transparent p-1 text-right text-xs focus:bg-white focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                {/* Total */}
                                <div className="flex-1">
                                  <span className="block text-right text-xs font-semibold text-gray-900">
                                    R$ {formatarNumeroComMilhar(totalProdutoComComplementos)}
                                  </span>
                                </div>
                                {/* Ações: colunas fixas (editar | complementos | excluir) */}
                                <div
                                  className="flex w-[76px] flex-shrink-0 items-center justify-end gap-0"
                                  role="group"
                                  aria-label="Ações do produto"
                                >
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                                    <button
                                      onClick={() => void abrirModalEdicaoProduto(index)}
                                      type="button"
                                      title="Editar produto"
                                      className="flex h-5 w-5 items-center justify-center rounded border-0 p-0 transition-colors hover:bg-gray-200"
                                    >
                                      <MdEdit className="h-4 w-4 text-primary" />
                                    </button>
                                  </div>
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                                    <button
                                      onClick={() =>
                                        void abrirModalComplementosProdutoExistente(index)
                                      }
                                      type="button"
                                      className="flex h-5 w-5 items-center justify-center rounded border-0 p-0 transition-colors hover:bg-gray-200"
                                      title="Complementos (editar ou vincular)"
                                    >
                                      <MdLaunch className="h-4 w-4 text-primary" />
                                    </button>
                                  </div>
                                  <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                                    <button
                                      onClick={() => removerProduto(index)}
                                      type="button"
                                      title="Remover produto"
                                      className="flex h-6 w-6 items-center justify-center rounded border-0 p-0 transition-colors hover:bg-red-100"
                                    >
                                      <MdDelete className="h-4 w-4 text-red-500" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Linhas dos Complementos */}
                              {produto.complementos.map((complemento: any, compIndex: number) => {
                                const compKey = `comp-${index}-${complemento.grupoId}-${complemento.id}`
                                const valorEmEdicao = valoresEmEdicao[compKey]

                                return (
                                  <div
                                    key={compKey}
                                    className={`-mt-0.5 flex items-center gap-1 rounded ${
                                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                    } cursor-pointer hover:bg-gray-100`}
                                    style={{ minHeight: '24px' }}
                                    onMouseDown={e => {
                                      // Iniciar long press apenas se não for em um input ou button
                                      const target = e.target as HTMLElement
                                      if (
                                        target.tagName === 'INPUT' ||
                                        target.tagName === 'BUTTON' ||
                                        target.closest('button') ||
                                        target.closest('input')
                                      ) {
                                        return
                                      }

                                      longPressComplementoIndexRef.current = index
                                      longPressComplementoTimeoutRef.current = setTimeout(() => {
                                        if (longPressComplementoIndexRef.current === index) {
                                          void abrirModalComplementosProdutoExistente(index)
                                        }
                                      }, 800) // 800ms para long press
                                    }}
                                    onMouseUp={() => {
                                      // Limpar timeout se soltar antes do tempo
                                      if (longPressComplementoTimeoutRef.current) {
                                        clearTimeout(longPressComplementoTimeoutRef.current)
                                        longPressComplementoTimeoutRef.current = null
                                      }
                                      longPressComplementoIndexRef.current = null
                                    }}
                                    onMouseLeave={() => {
                                      // Limpar timeout se sair da área
                                      if (longPressComplementoTimeoutRef.current) {
                                        clearTimeout(longPressComplementoTimeoutRef.current)
                                        longPressComplementoTimeoutRef.current = null
                                      }
                                      longPressComplementoIndexRef.current = null
                                    }}
                                  >
                                    {/* Quantidade do Complemento */}
                                    <div className="w-[60px] flex-shrink-0 pl-4">
                                      <input
                                        type="number"
                                        min={1}
                                        value={complemento.quantidade}
                                        onChange={e => {
                                          const valor = parseInt(e.target.value) || 1
                                          atualizarComplemento(
                                            index,
                                            compIndex,
                                            'quantidade',
                                            Math.max(1, valor)
                                          )
                                        }}
                                        style={{
                                          MozAppearance: 'textfield',
                                          WebkitAppearance: 'none',
                                          appearance: 'none',
                                        }}
                                        className="h-5 w-full border-0 bg-transparent px-1 text-right text-xs focus:bg-white focus:ring-1 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                      />
                                    </div>
                                    {/* Nome do Complemento com indentação */}
                                    <div className="min-w-0 flex-[4] pl-4">
                                      <span className="block truncate text-xs leading-tight text-gray-600">
                                        {complemento.nome}
                                      </span>
                                    </div>
                                    {/* Espaço vazio para Desconto/Acréscimo (complementos não têm) */}
                                    <div className="flex-1"></div>
                                    {/* Valor Unitário do Complemento - Apenas exibição */}
                                    <div className="flex-1">
                                      <span className="block text-right text-xs leading-tight text-gray-600">
                                        {formatarValorComplemento(
                                          complemento.valor,
                                          complemento.tipoImpactoPreco
                                        )}
                                      </span>
                                    </div>
                                    {/* Espaço vazio onde seria o Total (complementos não têm total próprio) */}
                                    <div className="flex-1"></div>
                                    {/* Mesma grade de ações da linha do produto: remove alinhado à coluna Exc. */}
                                    <div className="flex w-[76px] flex-shrink-0 items-center justify-end gap-0.5">
                                      <span className="block h-6 w-6 shrink-0" aria-hidden />
                                      <span className="block h-6 w-6 shrink-0" aria-hidden />
                                      <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                                        <button
                                          onClick={() => removerComplemento(index, compIndex)}
                                          type="button"
                                          title="Remover complemento"
                                          className="flex h-6 w-6 items-center justify-center rounded border-0 p-0 transition-colors hover:bg-red-50"
                                        >
                                          <MdClear className="h-3.5 w-3.5 text-red-500" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm text-gray-500">Nenhum produto selecionado</p>
                    </div>
                  )}
                </div>

                {/* Total do Pedido */}
                <div className="flex flex-shrink-0 items-center justify-end gap-2">
                  <span className="text-sm font-semibold text-gray-700">Total do Pedido:</span>
                  <span className="text-lg font-semibold text-primary">
                    {transformarParaReal(totalProdutos)}
                  </span>
                </div>

                {/* Seção recolhível: Grupos de produtos — ao ocultar, a área de produtos selecionados acima ganha mais altura */}
                <div className="flex-shrink-0 overflow-hidden rounded-lg border bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setGruposExpandido(!gruposExpandido)}
                    className="flex w-full items-center justify-between gap-2 border-b border-gray-200/50 px-3 py-2 text-left transition-colors hover:bg-gray-100/80"
                    aria-expanded={gruposExpandido}
                  >
                    <span className="text-sm font-semibold text-gray-700">Grupos de produtos</span>
                    <span className="ml-auto flex items-center gap-2">
                      {gruposExpandido ? (
                        <>
                          <span className="text-xs text-gray-500">Ocultar</span>
                          <MdExpandLess className="h-5 w-5 flex-shrink-0 text-gray-600" />
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-gray-500">Mostrar grupos</span>
                          <MdExpandMore className="h-5 w-5 flex-shrink-0 text-gray-600" />
                        </>
                      )}
                    </span>
                  </button>
                  {gruposExpandido && (
                    <div className="space-y-2 px-3 pb-3 pt-1">
                      {/* Grid ou Lista Horizontal de Grupos - Ocultar durante busca */}
                      {buscaProdutoTexto.length < 2 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {!grupoSelecionadoId ? (
                              <Label className="text-sm text-gray-600">Selecione um grupo:</Label>
                            ) : (
                              <Button
                                variant="outlined"
                                size="sm"
                                onClick={() => setGrupoSelecionadoId(null)}
                                type="button"
                                className="flex h-7 min-h-[28px] min-w-[28px] items-center justify-center p-0"
                              >
                                <MdArrowBack className="h-4 w-4" /> Voltar aos grupos
                              </Button>
                            )}
                          </div>
                          {isLoadingGruposVenda ? (
                            <div className="py-4 text-center text-gray-500">
                              <JiffyLoading />
                            </div>
                          ) : grupos.length === 0 ? (
                            <div className="py-4 text-center text-gray-500">
                              Nenhum grupo encontrado
                            </div>
                          ) : !grupoSelecionadoId ? (
                            // Grid de Grupos (quando nenhum grupo está selecionado)
                            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                              {grupos.map((grupo: any) => {
                                const corHex = grupo.getCorHex()
                                const iconName = grupo.getIconName()
                                return (
                                  <div key={grupo.getId()} className="relative">
                                    <button
                                      onClick={() => setGrupoSelecionadoId(grupo.getId())}
                                      className="flex aspect-square w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border-2 p-2 text-center transition-all hover:opacity-80"
                                      style={{
                                        borderColor: corHex,
                                        backgroundColor: `${corHex}15`,
                                      }}
                                    >
                                      <div
                                        className="flex h-[40px] w-[40px] flex-shrink-0 items-center justify-center"
                                        style={{
                                          borderColor: corHex,
                                        }}
                                      >
                                        <DinamicIcon iconName={iconName} color={corHex} size={34} />
                                      </div>
                                      <div className="line-clamp-2 w-full overflow-hidden text-ellipsis px-1 text-[10px] font-medium text-gray-900">
                                        {grupo.getNome()}
                                      </div>
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            // Lista Horizontal de Grupos (quando um grupo está selecionado)
                            <div
                              ref={gruposScrollRef}
                              className="scrollbar-thin flex cursor-grab select-none gap-3 overflow-x-auto pb-2 active:cursor-grabbing"
                              style={{ scrollbarWidth: 'thin' }}
                              onMouseDown={handleMouseDown}
                              onMouseMove={handleMouseMove}
                              onMouseUp={handleMouseUp}
                              onMouseLeave={handleMouseLeave}
                            >
                              {grupos.map((grupo: any) => {
                                const corHex = grupo.getCorHex()
                                const iconName = grupo.getIconName()
                                const isSelected = grupoSelecionadoId === grupo.getId()
                                return (
                                  <div
                                    key={grupo.getId()}
                                    className="relative flex-shrink-0"
                                    style={{ width: '100px' }}
                                  >
                                    <button
                                      onClick={e => {
                                        // Só executar o clique se não houve movimento significativo durante o arraste
                                        if (!hasMovedRef.current && !isDragging) {
                                          setGrupoSelecionadoId(grupo.getId())
                                        }
                                      }}
                                      onMouseDown={e => {
                                        // Permitir que o evento propague para o container para iniciar o arraste
                                        // O onClick só será executado se não houver movimento
                                      }}
                                      className="pointer-events-auto flex aspect-square h-full w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border-2 p-2 text-center transition-all"
                                      style={{
                                        borderColor: corHex,
                                        backgroundColor: isSelected ? corHex : `${corHex}15`,
                                        color: isSelected ? '#ffffff' : '#1f2937',
                                      }}
                                    >
                                      <div className="flex h-[40px] w-[40px] flex-shrink-0 items-center justify-center">
                                        <DinamicIcon
                                          iconName={iconName}
                                          color={isSelected ? '#ffffff' : corHex}
                                          size={34}
                                        />
                                      </div>
                                      <div className="line-clamp-2 w-full overflow-hidden text-ellipsis px-1 text-[10px] font-medium">
                                        {grupo.getNome()}
                                      </div>
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Grid de Produtos do Grupo Selecionado ou Resultado da Busca */}
                      {(grupoSelecionadoId || buscaProdutoTexto.length >= 2) &&
                        (() => {
                          const grupoSelecionado = grupos.find(
                            (g: any) => g.getId() === grupoSelecionadoId
                          )
                          const corHexGrupo = grupoSelecionado?.getCorHex() || '#6b7280'
                          const tituloGrade =
                            buscaProdutoTexto.length >= 2
                              ? `Resultados para "${buscaProdutoTexto}"`
                              : `Produtos do grupo: `
                          const isLoadingAtual =
                            buscaProdutoTexto.length >= 2
                              ? isLoadingBuscaProdutos
                              : isLoadingProdutos

                          return (
                            <div className="space-y-2">
                              <Label className="text-sm text-gray-600">
                                {tituloGrade}
                                {buscaProdutoTexto.length < 2 && (
                                  <span className="font-semibold">{grupoSelecionado?.getNome()}</span>
                                )}
                              </Label>
                              {isLoadingAtual ? (
                                <div className="py-4 text-center text-gray-500">
                                  <JiffyLoading />
                                </div>
                              ) : buscaProdutoTexto.length < 2 && produtosError ? (
                                <div className="py-4 text-center text-red-500">
                                  Erro ao carregar produtos:{' '}
                                  {produtosError instanceof Error
                                    ? produtosError.message
                                    : 'Erro desconhecido'}
                                </div>
                              ) : produtosList.length === 0 ? (
                                <div className="py-4 text-center text-gray-500">
                                  Nenhum produto encontrado neste grupo
                                </div>
                              ) : (
                                <div
                                  className="grid max-h-60 grid-cols-3 gap-2 overflow-y-auto rounded-lg border p-2 sm:grid-cols-4 md:grid-cols-7"
                                  style={{
                                    backgroundColor: `${corHexGrupo}15`,
                                  }}
                                >
                                  {produtosList.map((produto: any) => {
                                    return (
                                      <div key={produto.getId()} className="relative">
                                        <button
                                          onClick={() => adicionarProduto(produto.getId())}
                                          onMouseEnter={e => {
                                            e.currentTarget.style.borderColor = corHexGrupo
                                            e.currentTarget.style.backgroundColor = '#ffffff'
                                          }}
                                          onMouseLeave={e => {
                                            e.currentTarget.style.borderColor = corHexGrupo
                                            e.currentTarget.style.backgroundColor = '#ffffff'
                                          }}
                                          className="relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 text-center transition-all"
                                          style={{
                                            borderColor: corHexGrupo,
                                            backgroundColor: '#ffffff',
                                          }}
                                        >
                                          <div className="mb-1 break-words text-[10px] font-medium text-gray-900">
                                            {produto.getNome()}
                                          </div>
                                          <div className="text-[10px] font-semibold text-primary-text">
                                            {transformarParaReal(produto.getValor())}
                                          </div>
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                    </div>
                  )}
                </div>
              </PedidoProdutosStep>
            )}

            {/* STEP 3: Pagamento */}
            {!modoVisualizacao && currentStep === 3 && (
              <PedidoPagamentoStep>
                {/* Informações do Pedido */}
                <div className="rounded-lg border bg-gray-50 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">Informações do Pedido</h3>
                    <Button
                      type="button"
                      variant="outlined"
                      size="sm"
                      onClick={() => setSeletorClienteOpen(true)}
                      className="h-6 shrink-0 px-1 text-xs font-semibold text-white"
                      sx={{
                        backgroundColor: 'var(--color-primary)',
                        borderColor: 'var(--color-primary)',
                        color: '#fff',
                        padding: '4px',
                        '&:hover': {
                          backgroundColor: 'var(--color-primary)',
                          borderColor: 'var(--color-primary)',
                          opacity: 0.9,
                        },
                      }}
                    >
                      <MdPersonOutline className="mr-1 h-4 w-4 text-white" />
                      {nomeClienteResumo ? 'Alterar Cliente' : 'Vincular Cliente'}
                    </Button>
                  </div>
                  <div className="text-sm">
                    <div className="flex justify-between rounded-lg bg-white px-1">
                      <span className="text-gray-600">Data:</span>
                      <span className="font-medium">
                        {new Date().toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between px-1">
                      <span className="text-gray-600">Origem:</span>
                      <span className="font-medium">{origem}</span>
                    </div>
                    <div className="flex justify-between rounded-lg bg-white px-1">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium">{rotuloStatusResumoModal}</span>
                    </div>
                    {nomeClienteResumo && (
                      <div className="flex justify-between px-1">
                        <span className="text-gray-600">Cliente:</span>
                        <span className="font-medium">{nomeClienteResumo}</span>
                      </div>
                    )}

                    <div className="flex justify-between rounded-lg bg-white px-1">
                      <span className="text-gray-600">Total de Itens:</span>
                      <span className="font-medium">
                        {totalItensPedido} {totalItensPedido === 1 ? 'produto' : 'produtos'}
                      </span>
                    </div>
                    {pedidoEntregaAceitaPagamentoPendente && valorTaxaEntrega > 0 && (
                      <div className="flex justify-between rounded-lg bg-white px-1">
                        <span className="text-gray-600">Taxa de entrega:</span>
                        <span className="font-medium text-primary">
                          + {transformarParaReal(valorTaxaEntrega)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pagamento: balcão finalizado/NFe ou entrega em triagem (ABERTA) */}
                {pedidoGestorComPagamentoNoPasso3 && (
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-white px-4">
                      <h3 className="text-lg font-semibold">Pagamento</h3>

                      {/* Total do Pedido e A pagar */}
                      <div className="mb-2 space-y-2 text-sm">
                        {pedidoEntregaAceitaPagamentoPendente && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setFluxoPagamentoEntrega('cobrar_entregador')
                                setPagamentos((prev: any) =>
                                  prev.map((pagamento: any) => ({ ...pagamento, cobrarNaEntrega: true }))
                                )
                              }}
                              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                                fluxoPagamentoEntrega === 'cobrar_entregador'
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-gray-200 bg-white text-primary-text'
                              }`}
                            >
                              {rotuloCobrancaPendente}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFluxoPagamentoEntrega('ja_pago')
                                setPagamentos((prev: any) =>
                                  prev.map((pagamento: any) => ({ ...pagamento, cobrarNaEntrega: false }))
                                )
                              }}
                              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                                fluxoPagamentoEntrega === 'ja_pago'
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-gray-200 bg-white text-primary-text'
                              }`}
                            >
                              Já foi pago
                            </button>
                          </div>
                        )}
                        {pedidoEntregaAceitaPagamentoPendente && valorTaxaEntrega > 0 && (
                          <>
                            <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                              <span className="font-medium text-gray-700">Produtos:</span>
                              <span className="text-base font-semibold text-gray-900">
                                {transformarParaReal(subtotalProdutos)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                              <span className="font-medium text-gray-700">Taxa de entrega:</span>
                              <span className="text-base font-semibold text-gray-900">
                                + {transformarParaReal(valorTaxaEntrega)}
                              </span>
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                          <span className="font-medium text-gray-700">Total do Pedido:</span>
                          <span className="text-base font-semibold text-primary">
                            {transformarParaReal(totalProdutos)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                          <span className="font-medium text-gray-700">A pagar:</span>
                          <span
                            className={`text-base font-semibold ${
                              valorAPagar > 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {transformarParaReal(valorAPagar)}
                          </span>
                        </div>
                        {pedidoEntregaAceitaPagamentoPendente && (
                          <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                            <span className="font-medium text-gray-700">Status pagamento:</span>
                            <span
                              className={`text-base font-semibold ${
                                statusPagamentoExibicao === 'pago'
                                  ? 'text-green-600'
                                  : statusPagamentoExibicao === 'parcial'
                                    ? 'text-amber-600'
                                    : 'text-red-600'
                              }`}
                            >
                              {rotuloStatusPagamentoExibicao}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-primary-text">
                            {rotuloCampoValorRecebido}
                          </span>
                          <input
                            type="text"
                            value={valorRecebido}
                            onChange={e => {
                              const valorFormatado = formatarValorRecebido(e.target.value)
                              setValorRecebido(valorFormatado)
                            }}
                            placeholder="0,00"
                            className="rounded-lg border-2 p-1 text-right font-semibold transition-colors hover:border-primary-text"
                          />
                        </div>
                      </div>

                      {/* Formas de Pagamento - Cards */}
                      <div className="mb-2">
                        <Label className="mb-2 block text-base font-semibold">
                          Forma de Pagamento
                        </Label>
                        <div
                          ref={meiosPagamentoScrollRef}
                          className={`scrollbar-thin flex gap-3 overflow-x-auto pb-2 ${mostrarLoadingFormasPagamento ? 'min-h-[120px] cursor-default' : 'cursor-grab select-none active:cursor-grabbing'}`}
                          style={{ scrollbarWidth: 'thin' }}
                          onMouseDown={
                            mostrarLoadingFormasPagamento
                              ? undefined
                              : handleMouseDownMeiosPagamento
                          }
                        >
                          {mostrarLoadingFormasPagamento ? (
                            <div className="flex w-full flex-1 items-center justify-center py-2">
                              <JiffyLoading />
                            </div>
                          ) : (
                            meiosPagamento.map((meio: any) => {
                              const Icone = obterIconeMeioPagamento(meio.getNome())

                              return (
                                <button
                                  key={meio.getId()}
                                  type="button"
                                  onClick={e => {
                                    // Só executar o clique se não houve movimento significativo durante o arraste
                                    if (
                                      !hasMovedMeiosPagamentoRef.current &&
                                      !isDraggingMeiosPagamento
                                    ) {
                                      adicionarPagamentoPorCard(meio.getId())
                                    }
                                  }}
                                  onMouseDown={e => {
                                    // Permitir que o evento propague para o container para iniciar o arraste
                                  }}
                                  disabled={valorAPagarLancamento <= 0 && !valorRecebido.trim()}
                                  className={`flex min-w-[100px] flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-primary bg-white p-2 transition-all hover:bg-primary hover:text-white ${valorAPagarLancamento <= 0 && !valorRecebido.trim() ? 'cursor-not-allowed opacity-50' : ''} `}
                                >
                                  <Icone className="h-8 w-8" />
                                  <span className="text-center text-xs font-medium">
                                    {meio.getNome()}
                                  </span>
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>

                      {/* Totais de Pagamento */}
                      <div className="border-t pt-2 text-sm">
                        <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                          <span className="font-semibold text-gray-700">
                            Total Recebido (Efetivo):
                          </span>
                          <span className="text-base font-semibold text-green-700">
                            {transformarParaReal(totalPagamentos)}
                          </span>
                        </div>
                        {pedidoEntregaAceitaPagamentoPendente &&
                          totalPagamentosLancados - totalPagamentos > 0 && (
                          <div className="mt-1 flex items-center justify-between rounded-lg bg-amber-50 p-1">
                            <span className="font-semibold text-gray-700">
                              A receber na entrega:
                            </span>
                            <span className="text-base font-semibold text-amber-700">
                              {transformarParaReal(totalPagamentosLancados - totalPagamentos)}
                            </span>
                          </div>
                        )}
                        {trocoLancamento > 0 && (
                          <div className="mt-1 flex items-center justify-between rounded-lg bg-gray-50 p-1">
                            <span className="font-semibold text-gray-700">Troco previsto:</span>
                            <span className="text-base font-semibold text-green-600">
                              {transformarParaReal(trocoLancamento)}
                            </span>
                          </div>
                        )}
                        {pedidoEntregaAceitaPagamentoPendente && restanteALancarExibicao > 0 && (
                          <div className="mt-1 flex items-center justify-between rounded-lg bg-red-50 p-1">
                            <span className="font-semibold text-gray-700">
                              Restante a lançar:
                            </span>
                            <span className="text-base font-semibold text-red-600">
                              {transformarParaReal(restanteALancarExibicao)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Detalhes dos Pagamentos Aplicados */}
                      {pagamentos.length > 0 && (
                        <div className="mt-2 border-t pt-2">
                          <Label className="mb-2 block text-sm font-semibold">Detalhes:</Label>
                          <div className="flex flex-wrap gap-2">
                            {pagamentos.map((pagamento: any, index: number) => {
                              const meio = meiosPagamento.find(
                                (m: any) => m.getId() === pagamento.meioPagamentoId
                              )
                              const Icone = meio
                                ? obterIconeMeioPagamento(meio.getNome())
                                : MdCreditCard

                              return (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-100 p-2"
                                >
                                  <Icone className="h-6 w-6 text-green-700" />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-medium text-green-900">
                                      {meio?.getNome() || 'Meio de pagamento'}
                                    </span>
                                    <span className="text-xs font-semibold text-green-900">
                                      {transformarParaReal(pagamento.valor)}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => removerPagamento(index)}
                                    type="button"
                                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 p-0 hover:bg-green-200"
                                  >
                                    <MdDelete className="h-4 w-4 text-green-700" />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </PedidoPagamentoStep>
            )}

    </>
  )
}
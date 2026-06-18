'use client'

import type { MoradaTelefone } from '@/src/presentation/hooks/useMoradaTelefone'

export type { NovoPedidoModalProps } from './types.ui'

export type {
  ComplementoSelecionado,
  ProdutoSelecionado,
  PagamentoSelecionado,
  StatusVenda,
} from '@/src/domain/types/pedido'

export type {
  OrigemVenda,
  FluxoPagamentoEntrega,
  TipoAtendimentoDelivery,
  AbaDetalhesPedido,
  EnderecoEntregaDetalhe,
  TaxaEntregaDetalhe,
  DetalhesEntregaPedido,
  UsuarioPdvEntregadorOption,
  DetalhesPedidoMeta,
  ResumoFinanceiroDetalhes,
  ResumoFiscalVenda,
  TabelaOrigemVenda,
  CanalAberturaPedido,
  MoradaEntregaSelecionada,
} from '@/src/domain/types/vendaDetalhe'

export type NovoPedidoClienteEntregaVinculado = {
  id: string
  nome: string
  cpf?: string | null
  cnpj?: string | null
} | null

export type NovoPedidoMoradaEntrega = MoradaTelefone | null

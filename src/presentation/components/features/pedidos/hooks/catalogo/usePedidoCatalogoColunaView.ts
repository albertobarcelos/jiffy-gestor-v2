'use client'

import { MIN_CARACTERES_BUSCA_CATALOGO_VENDA } from '@/src/domain/policies/pedido/CatalogoVendaPolicy'
import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import type { Produto } from '@/src/domain/entities/Produto'
import { COR_HEX_GRUPO_CATALOGO_PADRAO } from '../../components/catalogo/pedidoCatalogoLayout'

export function usePedidoCatalogoColunaView(input: {
  buscaProdutoTexto: string
  grupoSelecionadoId: string | null
  grupos: GrupoProduto[]
  isLoadingGruposVenda: boolean
  isLoadingBuscaProdutos: boolean
  isLoadingProdutos: boolean
  tipoInicioPedido: 'balcao' | 'entrega'
}) {
  const emBusca = input.buscaProdutoTexto.length >= MIN_CARACTERES_BUSCA_CATALOGO_VENDA
  const podeExibirProdutos = emBusca || !!input.grupoSelecionadoId
  const grupoSelecionado = input.grupos.find(grupo => grupo.getId() === input.grupoSelecionadoId)
  const corHexGrupo = grupoSelecionado?.getCorHex() || COR_HEX_GRUPO_CATALOGO_PADRAO
  const tituloGrade = emBusca
    ? `Resultados para "${input.buscaProdutoTexto}"`
    : `Produtos do grupo: `
  const isLoadingAtual = emBusca ? input.isLoadingBuscaProdutos : input.isLoadingProdutos
  const isLoadingCatalogo = input.isLoadingGruposVenda || (podeExibirProdutos && isLoadingAtual)
  const mensagemMenuIndisponivel =
    input.tipoInicioPedido === 'entrega'
      ? 'Configure o menu em Configurações → Delivery.'
      : 'Configure o menu em Configurações → Empresa.'

  return {
    emBusca,
    podeExibirProdutos,
    grupoSelecionado,
    corHexGrupo,
    tituloGrade,
    isLoadingCatalogo,
    mensagemMenuIndisponivel,
  }
}

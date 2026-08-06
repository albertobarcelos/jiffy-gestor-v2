/** DTOs espelhando o catálogo público delivery do backend (sem auth). */

import type { DeliveryPublicoDesignConfigDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'

export type CatalogoPublicoComplementoDTO = {
  id: string
  nome: string
  descricao: string | null
  imagemUrl: string | null
  valor: number
  tipoImpactoPreco: string
}

export type CatalogoPublicoGrupoComplementoDTO = {
  id: string
  nome: string
  imagemUrl: string | null
  obrigatorio: boolean
  qtdMinima: number
  qtdMaxima: number
  ordem: number
  complementoIds: string[]
}

export type CatalogoPublicoProdutoDTO = {
  id: string
  nome: string
  valor: number
  descricao: string | null
  imagemUrl: string | null
  ordem: number
  unidadeMedida: string
  favorito: boolean
  abreComplementos: boolean
  grupoComplementosIds: string[]
}

export type PecaTambemProdutoDTO = CatalogoPublicoProdutoDTO & {
  grupoIdOrigem: string
}

export type GetPecaTambemPublicoResponseDTO = {
  produtos: PecaTambemProdutoDTO[]
}

export type CatalogoPublicoGrupoProdutoDTO = {
  id: string
  nome: string
  imagemUrl: string | null
  /** Cor hex pré-definida do grupo (ex.: `#FF5722`). */
  cor: string
  /** Nome do ícone Material Design do grupo. */
  icone: string
  ordem: number
  produtos: CatalogoPublicoProdutoDTO[]
}

export type CatalogoPublicoPaginacaoDTO = {
  count: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export type CatalogoPublicoPaginaDTO = {
  gruposProdutos: CatalogoPublicoGrupoProdutoDTO[]
  gruposComplementos: CatalogoPublicoGrupoComplementoDTO[] | null
  complementos: CatalogoPublicoComplementoDTO[] | null
  paginacao: CatalogoPublicoPaginacaoDTO
}

export type EmpresaPublicaDTO = {
  id: string
  nomeFantasia: string
  slug: string
  telefone: string | null
  segmento: string | null
  logoUrl: string | null
  bannerUrl: string | null
  /**
   * Design publicado do cardápio (backend Fase 2+).
   * Ausente só em respostas legadas; o tema público usa defaults nesse caso.
   */
  design?: DeliveryPublicoDesignConfigDTO | null
  endereco: {
    rua: string
    numero: string
    bairro: string | null
    cidade: string | null
    estado: string | null
    cep: string | null
  } | null
}

export type GetCatalogoPublicoResponseDTO = {
  empresa: EmpresaPublicaDTO
  catalogo: CatalogoPublicoPaginaDTO
}

export type MeioPagamentoPublicoDTO = {
  id: string
  nome: string
  formaPagamentoFiscal: string
  formaPagamentoFiscalLabel: string
  isParcelavel: boolean
  tipoParcelamento: string
}

export type GetMeiosPagamentoPublicosResponseDTO = {
  meiosPagamento: MeioPagamentoPublicoDTO[]
}

export type EnderecoClienteDeliveryPublicoDTO = {
  id: string
  etiqueta: string
  rua: string
  numero: string
  bairro: string
  cidade: string | null
  estado: string | null
  cep: string | null
  complemento: string | null
  ultimaUtilizacaoEm?: string | null
}

export type ClienteDeliveryPublicoDTO = {
  telefone: string
  nome: string | null
  cpf: string | null
  clienteIdVinculado: string | null
  enderecos: EnderecoClienteDeliveryPublicoDTO[]
}

export {
  AtualizarClienteDeliveryPublicoInputSchema,
  ClientePedidoPublicoInputSchema,
  CobrancaPedidoPublicoInputSchema,
  ComplementoPedidoPublicoInputSchema,
  CreatePedidoPublicoInputSchema,
  CriarClienteDeliveryPublicoInputSchema,
  EnderecoDeliveryPublicoInputSchema,
  ProdutoPedidoPublicoInputSchema,
} from './DeliveryPublicoInputSchemas'

export type {
  AtualizarClienteDeliveryPublicoInput,
  ClientePedidoPublicoInput,
  CobrancaPedidoPublicoInput,
  ComplementoPedidoPublicoInput,
  CreatePedidoPublicoInput,
  CriarClienteDeliveryPublicoInput,
  EnderecoDeliveryPublicoInput,
  ProdutoPedidoPublicoInput,
} from './DeliveryPublicoInputSchemas'

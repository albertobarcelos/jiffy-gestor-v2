/** DTOs espelhando o catálogo público delivery do backend (sem auth). */

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

export type CatalogoPublicoGrupoProdutoDTO = {
  id: string
  nome: string
  imagemUrl: string | null
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

export type ComplementoPedidoPublicoInput = {
  complementoId: string
  grupoComplementoId: string
  quantidade: number
}

export type ProdutoPedidoPublicoInput = {
  produtoId: string
  quantidade: number
  observacoes?: string[]
  complementos?: ComplementoPedidoPublicoInput[]
}

export type EnderecoDeliveryPublicoInput = {
  etiqueta: 'casa' | 'trabalho' | 'outro'
  rua: string
  numero: string
  bairro: string
  cidade?: string | null
  estado?: string | null
  cep?: string
  complemento?: string | null
}

export type ClientePedidoPublicoInput = {
  telefone: string
  nome?: string | null
  enderecos?: EnderecoDeliveryPublicoInput[]
}

export type CobrancaPedidoPublicoInput = {
  meioPagamentoId: string
  valor: number
  momentoCobranca: 'na_entrega'
}

export type CreatePedidoPublicoInput = {
  slug: string
  origem: 'JIFFY_DELIVERY'
  tipoEntrega: 'entrega' | 'retirada'
  cliente: ClientePedidoPublicoInput
  produtos: ProdutoPedidoPublicoInput[]
  cobrancas?: CobrancaPedidoPublicoInput[]
  observacoes?: string[]
}

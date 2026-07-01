import type { SxProps, Theme } from '@mui/material/styles'
import type {
  FiltroColunaVazia,
  FiscalCampoChave,
  FiscalLoteDraft,
  PermissaoCampoChave,
  TabPainelLote,
} from './types'

/** Título da página por aba ativa. */
export const TITULO_ABA_LOTE: Record<TabPainelLote, string> = {
  precos: 'Atualizar Preços em Lote',
  impressoras: 'Atualizar Impressoras em Lote',
  gruposComplementos: 'Atualizar Grupos de Complementos em Lote',
  permissoes: 'Atualizar Permissões em Lote',
  fiscal: 'Atualizar Dados Fiscais em Lote',
}

/** Tamanho de página da listagem (paginação infinita). */
export const PRODUTOS_LOTE_PAGE_SIZE = 50

/** Valor do filtro "sem dado em…" que não restringe a listagem. */
export const FILTRO_COLUNA_TODOS = 'todos'

export const LABEL_FILTRO_COLUNA: Record<FiltroColunaVazia, string> = {
  [FILTRO_COLUNA_TODOS]: 'Todos',
  sem_impressoras: 'Sem impressoras',
  sem_ncm: 'Sem NCM',
  sem_grupos_complementos: 'Sem grupos de complementos',
}

/** Campos de permissão PDV exibidos na aba de permissões. */
export const CAMPOS_PERMISSAO_PDV: { chave: PermissaoCampoChave; label: string }[] = [
  { chave: 'favorito', label: 'Favorito' },
  { chave: 'permiteDesconto', label: 'Permite Desconto' },
  { chave: 'permiteAcrescimo', label: 'Permite Acréscimo' },
  { chave: 'permiteAlterarPreco', label: 'Permitir Alterar Preço' },
  { chave: 'incideTaxa', label: 'Incide Taxa' },
  { chave: 'abreComplementos', label: 'Abre Complementos' },
]

/** Checkbox MUI nas grades (impressoras / complementos / permissões): padding mínimo e hover em rounded-lg. */
export const sxCheckboxListaLote: SxProps<Theme> = {
  p: 0,
  m: 0,
  borderRadius: '8px',
  '&:hover': {
    borderRadius: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  '& .MuiSvgIcon-root': {
    fontSize: '1.125rem',
  },
}

/** Campos fiscais exibidos no modo "Limpar campos selecionados". */
export const CAMPOS_FISCAL_LOTE: { chave: FiscalCampoChave; label: string }[] = [
  { chave: 'ncm', label: 'NCM' },
  { chave: 'cest', label: 'CEST' },
  { chave: 'origemMercadoria', label: 'Origem da Mercadoria' },
  { chave: 'tipoProduto', label: 'Tipo do Produto' },
  { chave: 'indicadorProducaoEscala', label: 'Indicador Produção em Escala' },
]

export const FISCAL_LOTE_VAZIO: FiscalLoteDraft = {
  ncm: '',
  cest: '',
  origemMercadoria: '',
  tipoProduto: '',
  indicadorProducaoEscala: '',
}

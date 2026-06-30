import type { SxProps, Theme } from '@mui/material/styles'
import type { FiltroColunaVazia, FiscalLoteDraft, PermissaoCampoChave } from './types'

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

export const FISCAL_LOTE_VAZIO: FiscalLoteDraft = {
  ncm: '',
  cest: '',
  origemMercadoria: '',
  tipoProduto: '',
  indicadorProducaoEscala: '',
}

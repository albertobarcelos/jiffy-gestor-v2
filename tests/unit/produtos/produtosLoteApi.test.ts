import { describe, expect, it } from 'vitest'
import { buildProdutosLoteParams } from '@/src/presentation/components/features/produtos/AtualizarProdutosLote/utils/produtosLoteApi'
import { FILTRO_COLUNA_TODOS, FILTRO_NCM_TODOS, FILTRO_NCM_SEM_CADASTRO } from '@/src/presentation/components/features/produtos/AtualizarProdutosLote/constants'
import type { ProdutosLoteFilterState } from '@/src/presentation/components/features/produtos/AtualizarProdutosLote/types'

const baseFilters: ProdutosLoteFilterState = {
  searchText: '',
  filterStatus: 'Ativo',
  ativoLocalFilter: 'Todos',
  ativoDeliveryFilter: 'Todos',
  grupoProdutoFilter: '',
  filtroColunaVazia: FILTRO_COLUNA_TODOS,
  filtroNcm: FILTRO_NCM_TODOS,
}

describe('buildProdutosLoteParams', () => {
  it('não envia semDadoEm quando filtroColunaVazia é todos', () => {
    const params = buildProdutosLoteParams(baseFilters, 0)
    expect(params.get('semDadoEm')).toBeNull()
  })

  it('envia ncm quando filtro fiscal ativo', () => {
    const params = buildProdutosLoteParams(
      { ...baseFilters, filtroNcm: '22021000' },
      0
    )
    expect(params.get('ncm')).toBe('22021000')
    expect(params.get('semDadoEm')).toBeNull()
  })

  it('envia semDadoEm=sem_ncm quando filtro Sem NCM ativo', () => {
    const params = buildProdutosLoteParams(
      { ...baseFilters, filtroNcm: FILTRO_NCM_SEM_CADASTRO },
      0
    )
    expect(params.get('semDadoEm')).toBe('sem_ncm')
    expect(params.get('ncm')).toBeNull()
  })

  it('envia semDadoEm=sem_impressoras quando filtro de impressoras ativo', () => {
    const params = buildProdutosLoteParams(
      { ...baseFilters, filtroColunaVazia: 'sem_impressoras' },
      50
    )
    expect(params.get('semDadoEm')).toBe('sem_impressoras')
    expect(params.get('offset')).toBe('50')
    expect(params.get('ativo')).toBe('true')
  })
})

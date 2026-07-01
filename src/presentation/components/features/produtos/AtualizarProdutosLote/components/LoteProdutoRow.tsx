'use client'

import { transformarParaReal } from '@/src/shared/utils/formatters'
import { Checkbox } from '@/src/presentation/components/ui/checkbox'
import { ProdutoActionIconsDisplay } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoActionIconsDisplay'
import { MdExpandMore, MdExpandLess } from 'react-icons/md'
import type { Produto } from '@/src/domain/entities/Produto'
import type { TabPainelLote } from '../types'
import type { FiscalInlineEditApi } from '../hooks/useFiscalInlineEdit'
import { textoOuNenhum } from '../utils/produtosLoteUi'
import { LAYOUT_GRID_FISCAL } from '../utils/fiscalLoteDisplay'
import { LoteFiscalColunasProduto, LoteFiscalDetalhesMobile } from './LoteFiscalColunasProduto'

export interface LoteProdutoRowProps {
  produto: Produto
  index: number
  activeTab: TabPainelLote
  isSelected: boolean
  foiAlteradoNaSessao: boolean
  isExpanded: boolean
  onToggleSelecao: (produtoId: string) => void
  onToggleExpansao: (produtoId: string) => void
  fiscalInline: FiscalInlineEditApi
}

function SelectRelacionados({
  items,
  labelSingular,
  labelPlural,
}: {
  items: { id: string; nome: string }[]
  labelSingular: string
  labelPlural: string
}) {
  if (items.length === 0) {
    return <span className="text-xs text-secondary-text">Nenhum</span>
  }

  return (
    <select
      className="w-full h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs text-primary-text focus:outline-none focus:border-primary cursor-pointer"
      defaultValue=""
      onChange={(event) => {
        event.currentTarget.value = ''
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="" disabled>
        {items.length} {items.length !== 1 ? labelPlural : labelSingular}
      </option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.nome}
        </option>
      ))}
    </select>
  )
}

export function LoteProdutoRow({
  produto,
  index,
  activeTab,
  isSelected,
  foiAlteradoNaSessao,
  isExpanded,
  onToggleSelecao,
  onToggleExpansao,
  fiscalInline,
}: LoteProdutoRowProps) {
  const impressorasDoProduto = produto.getImpressoras()
  const gruposComplementosDoProduto = produto.getGruposComplementos()

  const bgColor = isSelected
    ? foiAlteradoNaSessao
      ? 'bg-primary/25'
      : 'bg-primary/20'
    : foiAlteradoNaSessao
      ? 'bg-primary-bg'
      : index % 2 === 0
        ? 'bg-gray-50'
        : 'bg-white'

  const mostrarExpansaoMobile =
    activeTab === 'impressoras' || activeTab === 'gruposComplementos' || activeTab === 'fiscal'

  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center md:px-4 px-2 ${activeTab === 'fiscal' ? 'gap-1.5' : 'gap-2'} ${bgColor} hover:bg-primary-bg transition-colors cursor-default`}
        style={{ minHeight: '36px' }}
      >
        <div className="flex-none md:w-10 w-6 flex justify-center">
          <Checkbox
            checked={isSelected}
            onChange={(checked) => {
              if (checked !== undefined) onToggleSelecao(produto.getId())
            }}
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        </div>
        <div
          className={`font-mono text-xs text-secondary-text ${
            activeTab === 'fiscal'
              ? `${LAYOUT_GRID_FISCAL.codigo} text-center truncate`
              : 'flex-1 md:w-24'
          }`}
          title={String(produto.getCodigoProduto() ?? '')}
        >
          {textoOuNenhum(String(produto.getCodigoProduto() ?? ''))}
        </div>
        <div
          className={`min-w-0 ${
            activeTab === 'fiscal'
              ? `${LAYOUT_GRID_FISCAL.nome} md:pr-2`
              : 'md:flex-[1.5] flex-[2] md:pr-4'
          }`}
        >
          <p
            className={`break-words text-xs font-normal text-primary-text ${
              activeTab === 'fiscal' ? 'md:text-xs line-clamp-2' : 'md:text-sm'
            }`}
          >
            {produto.getNome()}
          </p>
          {activeTab === 'permissoes' ? <ProdutoActionIconsDisplay produto={produto} /> : null}
        </div>
        {activeTab === 'impressoras' ? (
          <div className="flex-[1.2] justify-center hidden md:flex">
            <SelectRelacionados
              items={impressorasDoProduto}
              labelSingular="impressora"
              labelPlural="impressoras"
            />
          </div>
        ) : null}
        {activeTab === 'gruposComplementos' ? (
          <div className="flex-[1.2] justify-center hidden md:flex">
            <SelectRelacionados
              items={gruposComplementosDoProduto}
              labelSingular="grupo"
              labelPlural="grupos"
            />
          </div>
        ) : null}
        {activeTab === 'fiscal' ? (
          <LoteFiscalColunasProduto produto={produto} fiscalInline={fiscalInline} />
        ) : null}
        <div
          className={`text-right font-normal text-primary-text ${
            activeTab === 'fiscal'
              ? `${LAYOUT_GRID_FISCAL.valor} text-xs whitespace-nowrap`
              : 'flex-1 md:text-sm text-xs'
          }`}
        >
          {transformarParaReal(produto.getValor())}
        </div>
        {mostrarExpansaoMobile && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpansao(produto.getId())
            }}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-primary/10 transition-colors"
            aria-label={isExpanded ? 'Ocultar detalhes' : 'Expandir detalhes'}
          >
            {isExpanded ? (
              <MdExpandLess size={20} className="text-primary-text" />
            ) : (
              <MdExpandMore size={20} className="text-primary-text" />
            )}
          </button>
        )}
      </div>

      {isExpanded && activeTab === 'impressoras' && (
        <div
          className={`md:hidden px-2 pb-2 pt-1 border-b border-gray-200 ${
            foiAlteradoNaSessao ? 'bg-primary-bg' : 'bg-gray-50'
          }`}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-secondary-text">Impressoras</label>
            <SelectRelacionados
              items={impressorasDoProduto}
              labelSingular="impressora"
              labelPlural="impressoras"
            />
          </div>
        </div>
      )}

      {isExpanded && activeTab === 'gruposComplementos' && (
        <div
          className={`md:hidden px-2 pb-2 pt-1 border-b border-gray-200 ${
            foiAlteradoNaSessao ? 'bg-primary-bg' : 'bg-gray-50'
          }`}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-secondary-text">Grupos de Complementos</label>
            <SelectRelacionados
              items={gruposComplementosDoProduto}
              labelSingular="grupo"
              labelPlural="grupos"
            />
          </div>
        </div>
      )}

      {isExpanded && activeTab === 'fiscal' && (
        <div
          className={`md:hidden px-2 pb-2 pt-1 border-b border-gray-200 ${
            foiAlteradoNaSessao ? 'bg-primary-bg' : 'bg-gray-50'
          }`}
        >
          <LoteFiscalDetalhesMobile produto={produto} fiscalInline={fiscalInline} />
        </div>
      )}
    </div>
  )
}

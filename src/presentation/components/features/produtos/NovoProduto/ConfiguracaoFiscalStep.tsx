'use client'

import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { MdClose } from 'react-icons/md'

interface ConfiguracaoFiscalStepProps {
  ncm: string
  onNcmChange: (value: string) => void
  cest: string
  onCestChange: (value: string) => void
  origemMercadoria: string | null
  onOrigemMercadoriaChange: (value: string | null) => void
  tipoProduto: string | null
  onTipoProdutoChange: (value: string | null) => void
  indicadorProducaoEscala: string | null
  onIndicadorProducaoEscalaChange: (value: string | null) => void
  onBack: () => void
  onNext: () => void
}

/**
 * Step 3: Configuração Fiscal
 * Replica exatamente o design das etapas 1 e 2
 */
export function ConfiguracaoFiscalStep({
  ncm,
  onNcmChange,
  cest,
  onCestChange,
  origemMercadoria,
  onOrigemMercadoriaChange,
  tipoProduto,
  onTipoProdutoChange,
  indicadorProducaoEscala,
  onIndicadorProducaoEscalaChange,
  onBack,
  onNext,
}: ConfiguracaoFiscalStepProps) {
  // Opções para Origem da Mercadoria
  const origensMercadoria = [
    { value: '0', label: '0 - Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8' },
    { value: '1', label: '1 - Estrangeira - Importação direta, exceto a indicada no código 6' },
    { value: '2', label: '2 - Estrangeira - Adquirida no mercado interno, exceto a indicada no código 7' },
    { value: '3', label: '3 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40% e inferior ou igual a 70%' },
    { value: '4', label: '4 - Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos de que tratam as legislações citadas nos Ajustes' },
    { value: '5', label: '5 - Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%' },
    { value: '6', label: '6 - Estrangeira - Importação direta, sem similar nacional, constante em lista da CAMEX e gás natural' },
    { value: '7', label: '7 - Estrangeira - Adquirida no mercado interno, sem similar nacional, constante em lista da CAMEX e gás natural' },
    { value: '8', label: '8 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70%' },
  ]

  // Opções para Tipo do Produto
  const tiposProduto = [
    { value: '00', label: '00 - Mercadoria para Revenda' },
    { value: '01', label: '01 - Matéria Prima' },
    { value: '02', label: '02 - Embalagem' },
    { value: '03', label: '03 - Produto em Processo' },
    { value: '04', label: '04 - Produto Acabado' },
    { value: '05', label: '05 - Subproduto' },
    { value: '06', label: '06 - Produto Intermediário' },
    { value: '07', label: '07 - Material de Uso e Consumo' },
    { value: '08', label: '08 - Ativo Imobilizado' },
    { value: '09', label: '09 - Serviços' },
    { value: '10', label: '10 - Outros Insumos' },
    { value: '99', label: '99 - Outras' },
    { value: 'KT', label: 'KT - Kit' },
  ]

  // Opções para Indicador de Produção em Escala Relevante
  const indicadoresProducao = [
    { value: '0', label: 'Produzido em Escala NÃO Relevante' },
    { value: '1', label: 'Produzido em Escala Relevante' },
  ]

  return (
    <div className="rounded-[24px] border border-[#E5E7F2] bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      {/* Título */}
      <div className="flex flex-col gap-2 mb-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-primary text-xl font-semibold font-exo">
            Configuração Fiscal
          </h3>
          <div className="flex-1 h-[2px] bg-primary/50" />
        </div>
        <p className="text-sm text-secondary-text font-nunito">
          Preencha as informações fiscais do produto. Essas informações serão usadas para emissão de notas fiscais.
        </p>
      </div>

      {/* Campos do formulário */}
      <div className="space-y-2">
        {/* Linha: NCM e CEST */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* NCM */}
          <div className="flex-1">
            <label className="block text-sm font-semibold font-nunito mb-2 text-primary-text">
              NCM
            </label>
            <Input
              type="text"
              value={ncm}
              onChange={(e) => onNcmChange(e.target.value)}
              placeholder="Digite o código NCM"
              className="w-full rounded-lg"
              maxLength={8}
            />
          </div>

          {/* CEST */}
          <div className="flex-1">
            <label className="block text-sm font-semibold font-nunito mb-2 text-primary-text">
              CEST
            </label>
            <Input
              type="text"
              value={cest}
              onChange={(e) => onCestChange(e.target.value)}
              placeholder="Selecione na lista o CEST relacionado ao NCM"
              className="w-full rounded-lg"
              maxLength={7}
            />
          </div>
        </div>

        {/* Linha: Origem da Mercadoria e Tipo do Produto */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Origem da Mercadoria */}
          <div className="flex-1">
            <label className="block text-sm font-semibold font-nunito mb-2 text-primary-text">
              Origem da Mercadoria
            </label>
            <select
              value={origemMercadoria || ''}
              onChange={(e) => onOrigemMercadoriaChange(e.target.value || null)}
              className="w-full h-14 px-4 rounded-lg border border-[#CBD0E3] bg-white text-primary-text focus:outline-none focus:border-primary-text hover:border-primary-text focus:border-2 font-nunito text-sm"
            >
              <option value="">Selecione a origem da mercadoria</option>
              {origensMercadoria.map((origem) => (
                <option key={origem.value} value={origem.value}>
                  {origem.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo do Produto */}
          <div className="flex-1">
            <label className="block text-sm font-semibold font-nunito mb-2 text-primary-text">
              Tipo do Produto
            </label>
            <select
              value={tipoProduto || ''}
              onChange={(e) => onTipoProdutoChange(e.target.value || null)}
              className="w-full h-14 px-4 rounded-lg border border-[#CBD0E3] bg-white text-primary-text focus:outline-none focus:border-primary-text hover:border-primary-text focus:border-2 font-nunito text-sm"
            >
              <option value="">Selecione o tipo do produto</option>
              {tiposProduto.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Indicador de Produção em Escala Relevante */}
        <div className="flex-1">
          <p className="text-xs text-secondary-text font-nunito mb-2">
            Obrigatório para produtos no Anexo XXVII (52/2017)
          </p>
          <label className="block text-sm font-semibold font-nunito mb-2 text-primary-text">
            Indicador de Produção em Escala Relevante
          </label>
          <div className="relative">
            <select
              value={indicadorProducaoEscala || ''}
              onChange={(e) => onIndicadorProducaoEscalaChange(e.target.value || null)}
              className="w-full h-14 px-4 pr-12 rounded-lg border border-[#CBD0E3] bg-white text-primary-text focus:outline-none focus:border-primary-text hover:border-primary-text focus:border-2 font-nunito text-sm appearance-none"
            >
              <option value="">Selecione o indicador</option>
              {indicadoresProducao.map((indicador) => (
                <option key={indicador.value} value={indicador.value}>
                  {indicador.label}
                </option>
              ))}
            </select>
            {indicadorProducaoEscala && (
              <button
                type="button"
                onClick={() => onIndicadorProducaoEscalaChange(null)}
                className="absolute right-8 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-secondary-text hover:text-primary-text z-10"
                aria-label="Limpar seleção"
              >
                <MdClose size={14} />
              </button>
            )}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-secondary-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex justify-between pt-6 border-t border-dashed border-[#E4E7F4] mt-4">
        <Button
          onClick={onBack}
          className="h-8 px-10 border-2 rounded-lg font-semibold font-exo text-sm hover:bg-primary/20"
          sx={{
            backgroundColor: 'var(--color-info)',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-primary)',
            border: '1px solid',
          }}
        >
          Voltar
        </Button>
        <Button
          onClick={onNext}
          className="h-8 px-10 rounded-lg text-white font-semibold font-exo text-sm hover:bg-primary/90"
          sx={{
            backgroundColor: 'var(--color-primary)',
          }}
        >
          Salvar
        </Button>
      </div>
    </div>
  )
}

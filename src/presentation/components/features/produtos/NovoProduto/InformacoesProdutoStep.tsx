'use client'

import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'

interface InformacoesProdutoStepProps {
  nomeProduto: string
  onNomeProdutoChange: (value: string) => void
  descricaoProduto: string
  onDescricaoProdutoChange: (value: string) => void
  precoVenda: string
  onPrecoVendaChange: (value: string) => void
  unidadeProduto: string | null
  onUnidadeProdutoChange: (value: string | null) => void
  grupoProduto: string | null
  onGrupoProdutoChange: (value: string | null) => void
  grupos: any[]
  isLoadingGrupos: boolean
  onNext: () => void
}

/**
 * Step 1: Informações do Produto
 * Replica exatamente o design do Flutter InformacoesProdutoStepWidget
 */
export function InformacoesProdutoStep({
  nomeProduto,
  onNomeProdutoChange,
  descricaoProduto,
  onDescricaoProdutoChange,
  precoVenda,
  onPrecoVendaChange,
  unidadeProduto,
  onUnidadeProdutoChange,
  grupoProduto,
  onGrupoProdutoChange,
  grupos,
  isLoadingGrupos,
  onNext,
}: InformacoesProdutoStepProps) {
  const formatCurrency = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/[^\d]/g, '')
    if (!numbers) return ''

    // Converte para número e formata
    const num = parseFloat(numbers) / 100
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num)
  }

  const handlePrecoChange = (value: string) => {
    const formatted = formatCurrency(value)
    onPrecoVendaChange(formatted)
  }

  return (
    <div className="bg-info rounded-[10px] p-5">
      {/* Título */}
      <div className="flex items-center gap-5 mb-5">
        <h3 className="text-secondary text-xl font-semibold font-exo">
          Informações
        </h3>
        <div className="flex-1 h-px bg-alternate" />
      </div>

      {/* Campos do formulário */}
      <div className="space-y-5">
        {/* Nome do Produto */}
        <div className="flex-1">
          <label className="block text-sm font-nunito mb-2 text-primary-text">
            Nome do Produto
          </label>
          <Input
            type="text"
            value={nomeProduto}
            onChange={(e) => onNomeProdutoChange(e.target.value)}
            placeholder="Digite o nome que aparecerá no PDV"
            className="w-full"
          />
        </div>

        {/* Linha: Unidade e Grupo */}
        <div className="flex gap-[30px]">
          {/* Unidade */}
          <div className="flex-1">
            <label className="block text-sm font-nunito mb-2 text-primary-text">
              Unidade
            </label>
            <select
              value={unidadeProduto || ''}
              onChange={(e) =>
                onUnidadeProdutoChange(e.target.value || null)
              }
              className="w-full h-10 px-3 rounded-lg border border-[#CCCCCC] bg-info text-primary-text focus:outline-none focus:border-primary focus:border-2 font-nunito text-sm"
            >
              <option value="">Escolha a unidade de venda do Produto</option>
              <option value="UN">Unidade</option>
              <option value="KG">Kg</option>
              <option value="LT">Litro</option>
            </select>
          </div>

          {/* Grupo */}
          <div className="flex-1">
            <label className="block text-sm font-nunito mb-2 text-primary-text">
              Grupo
            </label>
            {isLoadingGrupos ? (
              <div className="w-full h-10 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <select
                value={grupoProduto || ''}
                onChange={(e) => onGrupoProdutoChange(e.target.value || null)}
                className="w-full h-10 px-3 rounded-lg border border-[#CCCCCC] bg-info text-primary-text focus:outline-none focus:border-primary focus:border-2 font-nunito text-sm"
              >
                <option value="">Selecione o grupo do Produto</option>
                {grupos.map((grupo) => (
                  <option key={grupo.id} value={grupo.id}>
                    {grupo.nome}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Linha: Preço de Venda e Descrição */}
        <div className="flex gap-[30px]">
          {/* Preço de Venda */}
          <div className="flex-1">
            <label className="block text-sm font-nunito mb-2 text-primary-text">
              Preço de Venda
            </label>
            <Input
              type="text"
              value={precoVenda}
              onChange={(e) => handlePrecoChange(e.target.value)}
              placeholder="Digite o preço de venda do Produto"
              className="w-full"
            />
          </div>

          {/* Descrição */}
          <div className="flex-1">
            <label className="block text-sm font-nunito mb-2 text-primary-text">
              Descrição
            </label>
            <textarea
              value={descricaoProduto}
              onChange={(e) => onDescricaoProdutoChange(e.target.value)}
              placeholder="Digite a descrição do Produto"
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-[#CCCCCC] bg-info text-primary-text focus:outline-none focus:border-primary focus:border-2 font-nunito text-sm resize-none"
            />
          </div>
        </div>

        {/* Botão Próximo */}
        <div className="flex justify-end pt-5">
          <Button
            onClick={onNext}
            className="h-9 px-[26px] bg-primary text-info rounded-[30px] font-semibold font-exo text-sm hover:bg-primary/90 transition-colors"
          >
            Próximo
          </Button>
        </div>
      </div>
    </div>
  )
}


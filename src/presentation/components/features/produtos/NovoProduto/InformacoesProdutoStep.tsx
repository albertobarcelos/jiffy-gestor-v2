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

  const getGrupoId = (grupo: any) => {
    if (!grupo) return ''
    if (typeof grupo.getId === 'function') return grupo.getId()
    return grupo.id ?? ''
  }

  const getGrupoNome = (grupo: any) => {
    if (!grupo) return ''
    if (typeof grupo.getNome === 'function') return grupo.getNome()
    return grupo.nome ?? ''
  }

  const isGrupoAtivo = (grupo: any) => {
    if (!grupo) return true
    if (typeof grupo.isAtivo === 'function') return grupo.isAtivo()
    if (typeof grupo.ativo === 'boolean') return grupo.ativo
    return true
  }

  return (
    <div className="rounded-[24px] border border-[#E5E7F2] bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      {/* Título */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-alternate text-xl font-semibold font-exo">
            Informações
          </h3>
          <div className="flex-1 h-px bg-[#CBA4FF]/60" />
        </div>
        <p className="text-sm text-secondary-text font-nunito">
          Preencha os dados principais do produto. Essas informações serão usadas para identificação e exibição no PDV.
        </p>
      </div>

      {/* Campos do formulário */}
      <div className="space-y-4">
        {/* Nome do Produto */}
        <div className="flex-1">
          <label className="block text-sm font-semibold font-nunito mb-2 text-primary-text">
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
        <div className="grid gap-4 md:grid-cols-2">
          {/* Unidade */}
          <div className="flex-1">
            <label className="block text-sm font-semibold font-nunito mb-2 text-primary-text">
              Unidade
            </label>
            <select
              value={unidadeProduto || ''}
              onChange={(e) => onUnidadeProdutoChange(e.target.value || null)}
              className="w-full h-12 px-4 rounded-[14px] border border-[#CBD0E3] bg-white text-primary-text focus:outline-none focus:border-alternate focus:ring-2 focus:ring-[#CBA4FF]/60 font-nunito text-sm"
            >
              <option value="">Escolha a unidade de venda do Produto</option>
              <option value="UN">Unidade</option>
              <option value="KG">Kg</option>
              <option value="LT">Litro</option>
            </select>
          </div>

          {/* Grupo */}
          <div className="flex-1">
            <label className="block text-sm font-semibold font-nunito mb-2 text-primary-text">
              Grupo
            </label>
            {isLoadingGrupos ? (
              <div className="w-full h-12 flex items-center justify-center rounded-[14px] border border-dashed border-[#CBD0E3]">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <select
                value={grupoProduto || ''}
                onChange={(e) => onGrupoProdutoChange(e.target.value || null)}
                className="w-full h-12 px-4 rounded-[14px] border border-[#CBD0E3] bg-white text-primary-text focus:outline-none focus:border-[#5318A3] focus:ring-2 focus:ring-[#CBA4FF]/60 font-nunito text-sm"
              >
                <option value="">Selecione o grupo do Produto</option>
                {grupos.map((grupo) => {
                  const id = getGrupoId(grupo)
                  const nome = getGrupoNome(grupo)
                  const ativo = isGrupoAtivo(grupo)
                  return (
                    <option
                      key={id}
                      value={id}
                      className={ativo ? 'text-primary-text' : 'text-secondary-text'}
                      style={ativo ? undefined : { color: '#9CA3AF' }}
                    >
                      {ativo ? nome : `${nome} (inativo)`}
                    </option>
                  )
                })}
              </select>
            )}
          </div>
        </div>

        {/* Linha: Preço de Venda e Descrição */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Preço de Venda */}
          <div className="flex-1">
            <label className="block text-sm font-semibold font-nunito mb-2 text-primary-text">
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
            <label className="block text-sm font-semibold font-nunito mb-2 text-primary-text">
              Descrição
            </label>
            <textarea
              value={descricaoProduto}
              onChange={(e) => onDescricaoProdutoChange(e.target.value)}
              placeholder="Descreva o Produto"
              rows={4}
              className="w-full px-4 py-3 rounded-[14px] border border-[#CBD0E3] bg-white text-primary-text focus:outline-none focus:border-[#5318A3] focus:ring-2 focus:ring-[#CBA4FF]/60 font-nunito text-sm resize-none"
            />
          </div>
        </div>
      </div>

      {/* Botão Próximo */}
      <div className="flex justify-end pt-6 border-t border-dashed border-[#E4E7F4] mt-4">
        <Button
          onClick={onNext}
          className="h-11 px-8 rounded-[30px] bg-primary text-white font-semibold font-exo text-sm hover:bg-primary"
        >
          Próximo
        </Button>
      </div>
    </div>
  )
}


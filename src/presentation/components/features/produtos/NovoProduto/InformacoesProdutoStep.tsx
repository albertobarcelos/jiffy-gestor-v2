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
  /** Salva com dados preenchidos até aqui e encerra o fluxo (sem passos seguintes) */
  onSaveAndClose: () => void
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
  onSaveAndClose,
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
    <div className="rounded-[24px] border border-[#E5E7F2] bg-white p-1 shadow-[0_20px_45px_rgba(15,23,42,0.08)] md:p-4">
      {/* Título */}
      <div className="mb-1 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-exo text-xl font-semibold text-primary">Informações</h3>
          <div className="h-[2px] flex-1 bg-primary/50" />
        </div>
        <p className="font-nunito text-sm text-secondary-text">
          Preencha os dados principais do produto. Essas informações serão usadas para identificação
          e exibição no PDV.
        </p>
      </div>

      {/* Campos do formulário */}
      <div className="space-y-2">
        {/* Nome do Produto */}
        <div className="flex-1">
          <label className="font-nunito mb-2 block text-sm font-semibold text-primary-text">
            Nome do Produto
          </label>
          <Input
            type="text"
            size="small"
            value={nomeProduto}
            onChange={e => onNomeProdutoChange(e.target.value)}
            placeholder="Digite o nome que aparecerá no PDV"
            className="w-full rounded-lg"
          />
        </div>

        {/* Linha: Unidade e Grupo */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Unidade */}
          <div className="flex-1">
            <label className="font-nunito mb-2 block text-sm font-semibold text-primary-text">
              Unidade
            </label>
            <select
              value={unidadeProduto || ''}
              onChange={e => onUnidadeProdutoChange(e.target.value || null)}
              className="font-nunito h-14 w-full rounded-lg border border-[#CBD0E3] bg-white px-1.5 text-xs text-primary-text hover:border-primary-text focus:border-2 focus:border-primary-text focus:outline-none md:px-4 md:text-sm"
            >
              <option value="">Escolha a unidade do Produto</option>
              <option value="UN">Unitário</option>
              <option value="KG">Kg</option>
              <option value="LT">Litro</option>
            </select>
          </div>

          {/* Grupo */}
          <div className="min-w-full flex-1">
            <label className="font-nunito mb-2 block text-sm font-semibold text-primary-text">
              Grupo
            </label>
            {isLoadingGrupos ? (
              <div className="flex h-12 w-full items-center justify-center rounded-[14px] border border-dashed border-[#CBD0E3]">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <select
                value={grupoProduto || ''}
                onChange={e => onGrupoProdutoChange(e.target.value || null)}
                className="font-nunito h-14 w-full rounded-lg border border-[#CBD0E3] bg-white px-1.5 text-xs text-primary-text hover:border-primary-text focus:border-2 focus:border-primary-text focus:outline-none md:px-4 md:text-sm"
              >
                <option value="">Selecione o grupo</option>
                {grupos.map(grupo => {
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
            <label className="font-nunito mb-2 block text-sm font-semibold text-primary-text">
              Preço de Venda
            </label>
            <Input
              type="text"
              value={precoVenda}
              onChange={e => handlePrecoChange(e.target.value)}
              placeholder="Digite o preço de venda do Produto"
              className="w-full"
            />
          </div>

          {/* Descrição */}
          <div className="flex-1">
            <label className="font-nunito mb-2 block text-sm font-semibold text-primary-text">
              Descrição
            </label>
            <textarea
              value={descricaoProduto}
              onChange={e => onDescricaoProdutoChange(e.target.value)}
              placeholder="Descreva o Produto"
              rows={4}
              className="font-nunito w-full resize-none rounded-[14px] border border-[#CBD0E3] bg-white px-4 py-3 text-sm text-primary-text hover:border-primary-text focus:border-2 focus:border-primary-text focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Salvar e fechar + Próximo */}
      <div className="mt-4 flex flex-col gap-3 border-t border-dashed border-[#E4E7F4] pt-6 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={onSaveAndClose}
            className="h-8 rounded-lg border-2 px-6 font-exo text-sm font-semibold hover:bg-primary/10 sm:px-8"
            sx={{
              backgroundColor: 'var(--color-info)',
              color: 'var(--color-primary)',
              borderColor: 'var(--color-primary)',
              border: '1px solid',
            }}
          >
            Salvar e fechar
          </Button>
          <Button
            onClick={onNext}
            className="h-8 rounded-lg px-10 font-exo text-sm font-semibold text-white hover:bg-primary/90"
            sx={{
              backgroundColor: 'var(--color-primary)',
            }}
          >
            Próximo
          </Button>
        </div>
      </div>
    </div>
  )
}

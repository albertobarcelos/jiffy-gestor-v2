import type { PrecoComplementoPizza, TipoImpactoPreco } from '@/src/shared/types/pizza'

export function nomeImpactoPizzaComplemento(tipoImpactoPreco: TipoImpactoPreco) {
  if (tipoImpactoPreco === 'aumenta') return 'Acréscimo'
  if (tipoImpactoPreco === 'diminui') return 'Desconto'
  return 'Sem impacto de preço'
}

export function buildPizzaComplementoPrecosSelecionados(input: {
  tamanhos: Array<{ id: string; nome: string }>
  valores: Record<string, { ativo: boolean; valor: number }>
  tipoImpactoPreco: TipoImpactoPreco
}): { ok: true; precos: PrecoComplementoPizza[] } | { ok: false; message: string } {
  const selecionados = input.tamanhos.filter(tamanho => input.valores[tamanho.id]?.ativo)
  if (selecionados.length === 0) {
    return {
      ok: false,
      message: 'Selecione ao menos um tamanho para disponibilizar este adicional',
    }
  }

  const novosPrecos: PrecoComplementoPizza[] = []
  for (const tamanho of selecionados) {
    if (input.tipoImpactoPreco === 'nenhum') {
      novosPrecos.push({ pizzaTamanhoId: tamanho.id, valor: 0 })
      continue
    }

    const valor = input.valores[tamanho.id]?.valor
    if (!Number.isFinite(valor) || valor < 0) {
      return {
        ok: false,
        message: `Informe um preço válido para o tamanho ${tamanho.nome}`,
      }
    }
    novosPrecos.push({ pizzaTamanhoId: tamanho.id, valor })
  }

  return { ok: true, precos: novosPrecos }
}

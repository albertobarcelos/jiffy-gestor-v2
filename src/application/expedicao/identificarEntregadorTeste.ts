export const SENHA_TESTE_EXPEDICAO = '1234'

export type EntregadorIdentificadoResumo = {
  id: string
  nome: string
  telefone: string | null
  ativo: boolean
}

export function escolherEntregadorParaSenhaTeste(
  items: unknown[],
  senha: string
): EntregadorIdentificadoResumo | null {
  if (senha !== SENHA_TESTE_EXPEDICAO) return null
  const lista = items
    .map(item => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const id = String(row.id ?? '').trim()
      const nome = String(row.nome ?? '').trim()
      if (!id || !nome) return null
      if (row.ativo === false) return null
      return {
        id,
        nome,
        telefone: row.telefone != null ? String(row.telefone) : null,
        ativo: true,
      }
    })
    .filter((item): item is EntregadorIdentificadoResumo => item !== null)

  const peloNome = lista.find(item => item.nome.toUpperCase() === 'ENTREGADOR')
  return peloNome ?? (lista.length === 1 ? lista[0] : null)
}

export function permitirFallbackIdentificarTeste(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.EXPEDICAO_IDENTIFICAR_FALLBACK === '1'
}

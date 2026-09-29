import { normalizeTipoImpactoPreco } from '@/src/application/mappers/VendaApiNormalizer'

function numeroFinito(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const parsed = Number(v.replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/**
 * Preço unitário do complemento no lançamento.
 * Prefere `valor` (snapshot do cardápio/pedido) a `valorUnitario` (cadastro base).
 */
export function magnitudeValorComplementoLancamento(c: Record<string, unknown>): number {
  const fromValor = numeroFinito(c.valor)
  const fromUnit = numeroFinito(c.valorUnitario)
  const raw = fromValor ?? fromUnit ?? 0
  return Math.abs(raw)
}

/** Impacto monetário assinado para impressão/resumo (aumenta +, diminui −, nenhum 0). */
export function valorAssinadoComplementoImpressao(
  tipoImpactoPreco: unknown,
  valorUnitarioMagnitude: number,
  quantidade: number
): { valorUnitario: number; valorFinal: number } {
  const tipo = normalizeTipoImpactoPreco(tipoImpactoPreco)
  const qtd = Math.max(1, Math.floor(quantidade))
  const mag = Math.abs(valorUnitarioMagnitude)
  if (tipo === 'nenhum' || mag < 0.0005) {
    return { valorUnitario: 0, valorFinal: 0 }
  }
  const signedUnit = tipo === 'diminui' ? -mag : mag
  return { valorUnitario: signedUnit, valorFinal: signedUnit * qtd }
}

/**
 * Valor a exibir no cupom de expedição.
 * Reaplica `tipoImpactoPreco` mesmo se `impressao.valorFinal` veio sem sinal.
 */
export function valorComplementoParaExibicaoCupom(comp: {
  tipoImpactoPreco?: string | null
  quantidade?: number | null
  impressao?: {
    quantidade?: number | null
    valorFinal?: number | null
    valorTotal?: number | null
    valorUnitario?: number | null
  } | null
} | null): number | null {
  if (!comp) return null
  const tipo = normalizeTipoImpactoPreco(comp.tipoImpactoPreco)
  const qtd = Math.max(
    1,
    Math.floor(numeroFinito(comp.impressao?.quantidade) ?? numeroFinito(comp.quantidade) ?? 1)
  )
  const unitRaw = numeroFinito(comp.impressao?.valorUnitario)
  const finalRaw = numeroFinito(comp.impressao?.valorFinal ?? comp.impressao?.valorTotal)

  let magnitudeUnit: number | null = null
  if (unitRaw != null) {
    magnitudeUnit = Math.abs(unitRaw)
  } else if (finalRaw != null) {
    magnitudeUnit = Math.abs(finalRaw) / qtd
  }
  if (magnitudeUnit == null) return null
  if (tipo === 'nenhum' || magnitudeUnit < 0.0005) return null
  if (tipo === 'diminui') return -magnitudeUnit * qtd
  return magnitudeUnit * qtd
}

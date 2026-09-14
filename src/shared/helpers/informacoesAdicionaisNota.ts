/** Limite do Swagger `EmitirNotaVendaRequest.informacoesAdicionais` (infCpl reserva o restante para o rodapé). */
export const INFORMACOES_ADICIONAIS_NOTA_MAX = 3500

export function informacoesAdicionaisFromTexto(
  texto: string | undefined | null
): string | undefined {
  const t = texto?.trim()
  if (!t) return undefined
  return t.length > INFORMACOES_ADICIONAIS_NOTA_MAX
    ? t.slice(0, INFORMACOES_ADICIONAIS_NOTA_MAX)
    : t
}

const rascunhosPorVendaId = new Map<string, string>()

/** Rascunho local até o POST emitir-nota — a API não persiste isso na venda. */
export function salvarRascunhoInformacoesAdicionais(vendaId: string, texto: string): void {
  const id = vendaId.trim()
  if (!id) return
  const t = informacoesAdicionaisFromTexto(texto)
  if (!t) {
    rascunhosPorVendaId.delete(id)
    return
  }
  rascunhosPorVendaId.set(id, t)
}

export function obterRascunhoInformacoesAdicionais(vendaId: string): string | undefined {
  const id = vendaId.trim()
  if (!id) return undefined
  return rascunhosPorVendaId.get(id)
}

export function anexarInformacoesAdicionaisEmitirNota(
  body: Record<string, unknown>,
  vendaId: string,
  textoExplicit?: string | null
): Record<string, unknown> {
  const texto = informacoesAdicionaisFromTexto(
    textoExplicit ?? obterRascunhoInformacoesAdicionais(vendaId)
  )
  if (texto) {
    body.informacoesAdicionais = texto
  }
  return body
}

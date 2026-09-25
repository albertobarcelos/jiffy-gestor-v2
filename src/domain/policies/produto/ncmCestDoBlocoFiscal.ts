import { unwrapProdutoApiPayloadAsRecord } from '@/src/shared/utils/unwrapProdutoApiPayload'

export type NcmCestFiscal = {
  ncm: string
  cest: string
}

/** Leitura do fiscal: códigos vazios ≠ GET indisponível. */
export type NcmCestFiscalLeitura = NcmCestFiscal & {
  indisponivel: boolean
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function primeiroTexto(...candidatos: unknown[]): string {
  for (const raw of candidatos) {
    if (raw == null) continue
    const texto = String(raw).trim()
    if (texto) return texto
  }
  return ''
}

/**
 * NCM/CEST só do bloco fiscal do produto (`fiscal` / `dadosFiscais`).
 * Ignora `ncm`/`cest` na raiz do cadastro/venda — esse campo será removido.
 */
export function ncmCestDoBlocoFiscal(payload: unknown): NcmCestFiscal {
  const produto = unwrapProdutoApiPayloadAsRecord(payload)
  const fiscal = {
    ...asRecord(produto.dadosFiscais),
    ...asRecord(produto.fiscal),
  }

  return {
    ncm: primeiroTexto(fiscal.ncm, fiscal.codigoNcm, fiscal.codigo_ncm),
    cest: primeiroTexto(fiscal.cest, fiscal.codigoCest, fiscal.cestCodigo, fiscal.codigo_cest),
  }
}

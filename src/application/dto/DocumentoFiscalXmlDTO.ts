/**
 * Resposta de GET /api/v1/fiscal/documentos/{documentId}
 * (proxy do microserviço fiscal — inclui XMLs quando disponíveis).
 */
export interface DocumentoFiscalXmlDTO {
  documentId: string
  status?: string | null
  xmlEnvio?: string | null
  xmlRetorno?: string | null
  xmlAutorizado?: string | null
  mensagemAmigavel?: string | null
  codigoRejeicao?: string | null
  categoriaRejeicao?: string | null
  modelo?: number | null
  serie?: number | null
  numero?: number | null
  chave?: string | null
  protocolo?: string | null
}

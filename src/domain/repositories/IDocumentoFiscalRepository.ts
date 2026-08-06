import type { DocumentoFiscalXmlDTO } from '@/src/application/dto/DocumentoFiscalXmlDTO'

export interface IDocumentoFiscalRepository {
  buscarPorId(documentId: string): Promise<DocumentoFiscalXmlDTO>
}

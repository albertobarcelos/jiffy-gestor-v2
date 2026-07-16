import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { DocumentoFiscalXmlDTO } from '@/src/application/dto/DocumentoFiscalXmlDTO'
import type { IDocumentoFiscalRepository } from '@/src/domain/repositories/IDocumentoFiscalRepository'

/**
 * Implementação HTTP via BFF Next.js (`/api/v1/fiscal/documentos/{id}`).
 */
export class DocumentoFiscalApiRepository implements IDocumentoFiscalRepository {
  constructor(private readonly token: string) {}

  async buscarPorId(documentId: string): Promise<DocumentoFiscalXmlDTO> {
    const id = documentId.trim()
    if (!id) {
      throw new Error('ID do documento fiscal é obrigatório')
    }

    const response = await fetchGestorApi(
      `/api/v1/fiscal/documentos/${encodeURIComponent(id)}`,
      {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(
        String(
          (data as { error?: string; message?: string }).error ||
            (data as { message?: string }).message ||
            `Erro ao buscar documento fiscal (${response.status})`
        )
      )
    }

    return (await response.json()) as DocumentoFiscalXmlDTO
  }
}

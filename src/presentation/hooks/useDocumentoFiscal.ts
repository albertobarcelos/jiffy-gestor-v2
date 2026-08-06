'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { DocumentoFiscalApiRepository } from '@/src/infrastructure/api/repositories/DocumentoFiscalApiRepository'
import { BuscarDocumentoFiscalUseCase } from '@/src/application/use-cases/fiscal/BuscarDocumentoFiscalUseCase'
import type { DocumentoFiscalXmlDTO } from '@/src/application/dto/DocumentoFiscalXmlDTO'

export type { DocumentoFiscalXmlDTO }

export function useDocumentoFiscal(documentId: string | null | undefined) {
  const id = documentId?.trim() || null

  return useSecureTenantQuery(
    ['fiscal', 'documento', id],
    async ({ token }) => {
      const repository = new DocumentoFiscalApiRepository(token)
      const useCase = new BuscarDocumentoFiscalUseCase(repository)
      return useCase.execute(id!)
    },
    {
      enabled: Boolean(id),
      staleTime: 30_000,
    }
  )
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { NFe, NFeStatus } from '@/src/domain/entities/NFe'
import { useAuthStore } from '@/src/presentation/stores/authStore'

interface NfesGroupedByStatus {
  PENDENTE: NFe[]
  EM_PROCESSAMENTO: NFe[]
  AUTORIZADA: NFe[]
  REJEITADA: NFe[]
  CANCELADA: NFe[]
}

/**
 * Hook para buscar NFes com cache e otimização
 * Usa React Query para gerenciar estado e cache
 */
export function useNfes() {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  return useQuery<NfesGroupedByStatus>({
    queryKey: ['nfes'],
    queryFn: async (): Promise<NfesGroupedByStatus> => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      // TODO: Implementar chamada à API quando disponível
      // const response = await fetch('/api/nfes', {
      //   headers: { Authorization: `Bearer ${token}` },
      // })
      // const data = await response.json()

      // Mock data para desenvolvimento
      const mockNfes: NFe[] = [
        NFe.fromJSON({
          id: '1',
          numero: '000001',
          serie: '1',
          clienteId: '1',
          clienteNome: 'Cliente Exemplo 1',
          clienteCpfCnpj: '123.456.789-00',
          dataEmissao: new Date().toISOString(),
          status: 'PENDENTE',
          valorTotal: 1500.0,
          itens: [
            {
              produtoId: '1',
              produtoNome: 'Produto A',
              quantidade: 2,
              valorUnitario: 750.0,
              valorTotal: 1500.0,
            },
          ],
        }),
        NFe.fromJSON({
          id: '2',
          numero: '000002',
          serie: '1',
          clienteId: '2',
          clienteNome: 'Cliente Exemplo 2',
          clienteCpfCnpj: '987.654.321-00',
          dataEmissao: new Date().toISOString(),
          status: 'EM_PROCESSAMENTO',
          valorTotal: 2300.5,
          itens: [
            {
              produtoId: '2',
              produtoNome: 'Produto B',
              quantidade: 5,
              valorUnitario: 460.1,
              valorTotal: 2300.5,
            },
          ],
        }),
        NFe.fromJSON({
          id: '3',
          numero: '000003',
          serie: '1',
          clienteId: '3',
          clienteNome: 'Cliente Exemplo 3',
          clienteCpfCnpj: '111.222.333-44',
          dataEmissao: new Date().toISOString(),
          status: 'AUTORIZADA',
          valorTotal: 890.0,
          chaveAcesso: '35210712345678901234567890123456789012345678',
          protocolo: '123456789012345',
          dataAutorizacao: new Date().toISOString(),
          itens: [
            {
              produtoId: '3',
              produtoNome: 'Produto C',
              quantidade: 1,
              valorUnitario: 890.0,
              valorTotal: 890.0,
            },
          ],
        }),
      ]

      // Agrupar por status
      const nfesAgrupadas: NfesGroupedByStatus = {
        PENDENTE: [],
        EM_PROCESSAMENTO: [],
        AUTORIZADA: [],
        REJEITADA: [],
        CANCELADA: [],
      }

      mockNfes.forEach((nfe) => {
        nfesAgrupadas[nfe.getStatus()].push(nfe)
      })

      return nfesAgrupadas
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  })
}

/**
 * Hook para mutações de NFe (criar, atualizar status, etc)
 */
export function useNfeMutation() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({ nfeId, novoStatus }: { nfeId: string; novoStatus: NFeStatus }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      // TODO: Implementar chamada à API quando disponível
      // const response = await fetch(`/api/nfes/${nfeId}`, {
      //   method: 'PATCH',
      //   headers: {
      //     Authorization: `Bearer ${token}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ status: novoStatus }),
      // })
      // return response.json()

      return { nfeId, novoStatus }
    },
    onSuccess: () => {
      // Invalidar cache para forçar refetch
      queryClient.invalidateQueries({ queryKey: ['nfes'] })
    },
  })
}



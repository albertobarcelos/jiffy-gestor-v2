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

      // Mock data para desenvolvimento - Múltiplos cards para testar scroll
      const mockNfes: NFe[] = [
        // PENDENTE
        NFe.fromJSON({
          id: '1',
          numero: '258',
          serie: '1',
          clienteId: '1',
          clienteNome: 'CONCRELAJE',
          clienteCpfCnpj: '12.345.678/0001-90',
          dataEmissao: new Date().toISOString(),
          status: 'PENDENTE',
          valorTotal: 15323.8,
          itens: [{ produtoId: '1', produtoNome: 'Produto A', quantidade: 2, valorUnitario: 7661.9, valorTotal: 15323.8 }],
        }),
        NFe.fromJSON({
          id: '2',
          numero: '259',
          serie: '1',
          clienteId: '2',
          clienteNome: 'EMPRESA ABC LTDA',
          clienteCpfCnpj: '98.765.432/0001-10',
          dataEmissao: new Date().toISOString(),
          status: 'PENDENTE',
          valorTotal: 8500.0,
          itens: [{ produtoId: '2', produtoNome: 'Produto B', quantidade: 5, valorUnitario: 1700.0, valorTotal: 8500.0 }],
        }),
        NFe.fromJSON({
          id: '3',
          numero: '260',
          serie: '1',
          clienteId: '3',
          clienteNome: 'COMERCIAL XYZ',
          clienteCpfCnpj: '11.222.333/0001-44',
          dataEmissao: new Date().toISOString(),
          status: 'PENDENTE',
          valorTotal: 3200.5,
          itens: [{ produtoId: '3', produtoNome: 'Produto C', quantidade: 1, valorUnitario: 3200.5, valorTotal: 3200.5 }],
        }),
        NFe.fromJSON({
          id: '4',
          numero: '261',
          serie: '1',
          clienteId: '4',
          clienteNome: 'INDUSTRIAS DEF',
          clienteCpfCnpj: '55.666.777/0001-88',
          dataEmissao: new Date().toISOString(),
          status: 'PENDENTE',
          valorTotal: 12000.0,
          itens: [{ produtoId: '4', produtoNome: 'Produto D', quantidade: 3, valorUnitario: 4000.0, valorTotal: 12000.0 }],
        }),
        // EM_PROCESSAMENTO
        NFe.fromJSON({
          id: '5',
          numero: '262',
          serie: '1',
          clienteId: '5',
          clienteNome: 'DISTRIBUIDORA GHI',
          clienteCpfCnpj: '22.333.444/0001-55',
          dataEmissao: new Date().toISOString(),
          status: 'EM_PROCESSAMENTO',
          valorTotal: 2300.5,
          itens: [{ produtoId: '5', produtoNome: 'Produto E', quantidade: 5, valorUnitario: 460.1, valorTotal: 2300.5 }],
        }),
        NFe.fromJSON({
          id: '6',
          numero: '263',
          serie: '1',
          clienteId: '6',
          clienteNome: 'VAREJO JKL',
          clienteCpfCnpj: '33.444.555/0001-66',
          dataEmissao: new Date().toISOString(),
          status: 'EM_PROCESSAMENTO',
          valorTotal: 6500.0,
          itens: [{ produtoId: '6', produtoNome: 'Produto F', quantidade: 10, valorUnitario: 650.0, valorTotal: 6500.0 }],
        }),
        NFe.fromJSON({
          id: '7',
          numero: '264',
          serie: '1',
          clienteId: '7',
          clienteNome: 'ATACADO MNO',
          clienteCpfCnpj: '44.555.666/0001-77',
          dataEmissao: new Date().toISOString(),
          status: 'EM_PROCESSAMENTO',
          valorTotal: 15000.0,
          itens: [{ produtoId: '7', produtoNome: 'Produto G', quantidade: 20, valorUnitario: 750.0, valorTotal: 15000.0 }],
        }),
        // AUTORIZADA
        NFe.fromJSON({
          id: '8',
          numero: '265',
          serie: '1',
          clienteId: '8',
          clienteNome: 'SERVICOS PQR',
          clienteCpfCnpj: '66.777.888/0001-99',
          dataEmissao: new Date().toISOString(),
          status: 'AUTORIZADA',
          valorTotal: 890.0,
          chaveAcesso: '35210712345678901234567890123456789012345678',
          protocolo: '123456789012345',
          dataAutorizacao: new Date().toISOString(),
          itens: [{ produtoId: '8', produtoNome: 'Produto H', quantidade: 1, valorUnitario: 890.0, valorTotal: 890.0 }],
        }),
        NFe.fromJSON({
          id: '9',
          numero: '266',
          serie: '1',
          clienteId: '9',
          clienteNome: 'TECNOLOGIA STU',
          clienteCpfCnpj: '77.888.999/0001-00',
          dataEmissao: new Date().toISOString(),
          status: 'AUTORIZADA',
          valorTotal: 25000.0,
          chaveAcesso: '35210712345678901234567890123456789012345679',
          protocolo: '123456789012346',
          dataAutorizacao: new Date().toISOString(),
          itens: [{ produtoId: '9', produtoNome: 'Produto I', quantidade: 5, valorUnitario: 5000.0, valorTotal: 25000.0 }],
        }),
        NFe.fromJSON({
          id: '10',
          numero: '267',
          serie: '1',
          clienteId: '10',
          clienteNome: 'CONSTRUCAO VWX',
          clienteCpfCnpj: '88.999.000/0001-11',
          dataEmissao: new Date().toISOString(),
          status: 'AUTORIZADA',
          valorTotal: 45000.0,
          chaveAcesso: '35210712345678901234567890123456789012345680',
          protocolo: '123456789012347',
          dataAutorizacao: new Date().toISOString(),
          itens: [{ produtoId: '10', produtoNome: 'Produto J', quantidade: 10, valorUnitario: 4500.0, valorTotal: 45000.0 }],
        }),
        NFe.fromJSON({
          id: '11',
          numero: '268',
          serie: '1',
          clienteId: '11',
          clienteNome: 'ALIMENTOS YZ',
          clienteCpfCnpj: '99.000.111/0001-22',
          dataEmissao: new Date().toISOString(),
          status: 'AUTORIZADA',
          valorTotal: 1800.0,
          chaveAcesso: '35210712345678901234567890123456789012345681',
          protocolo: '123456789012348',
          dataAutorizacao: new Date().toISOString(),
          itens: [{ produtoId: '11', produtoNome: 'Produto K', quantidade: 2, valorUnitario: 900.0, valorTotal: 1800.0 }],
        }),
        // REJEITADA
        NFe.fromJSON({
          id: '12',
          numero: '269',
          serie: '1',
          clienteId: '12',
          clienteNome: 'FARMACIA ABC',
          clienteCpfCnpj: '00.111.222/0001-33',
          dataEmissao: new Date().toISOString(),
          status: 'REJEITADA',
          valorTotal: 5000.0,
          motivoRejeicao: 'Erro na validação do CPF/CNPJ',
          itens: [{ produtoId: '12', produtoNome: 'Produto L', quantidade: 1, valorUnitario: 5000.0, valorTotal: 5000.0 }],
        }),
        NFe.fromJSON({
          id: '13',
          numero: '270',
          serie: '1',
          clienteId: '13',
          clienteNome: 'AUTOPECAS DEF',
          clienteCpfCnpj: '11.222.333/0001-44',
          dataEmissao: new Date().toISOString(),
          status: 'REJEITADA',
          valorTotal: 7500.0,
          motivoRejeicao: 'Produto sem código NCM',
          itens: [{ produtoId: '13', produtoNome: 'Produto M', quantidade: 3, valorUnitario: 2500.0, valorTotal: 7500.0 }],
        }),
        // CANCELADA
        NFe.fromJSON({
          id: '14',
          numero: '271',
          serie: '1',
          clienteId: '14',
          clienteNome: 'ELETRONICOS GHI',
          clienteCpfCnpj: '22.333.444/0001-55',
          dataEmissao: new Date().toISOString(),
          status: 'CANCELADA',
          valorTotal: 12000.0,
          itens: [{ produtoId: '14', produtoNome: 'Produto N', quantidade: 4, valorUnitario: 3000.0, valorTotal: 12000.0 }],
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



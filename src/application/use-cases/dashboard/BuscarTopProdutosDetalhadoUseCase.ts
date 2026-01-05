import { DashboardTopProduto } from '@/src/domain/entities/DashboardTopProduto';
import { useAuthStore } from '@/src/presentation/stores/authStore'; // Para obter o token de autenticação

interface VendaListApiResponse {
  items: { id: string }[];
}

interface VendaDetalhesApiResponse {
  id: string;
  produtosLancados: {
    id: string;
    produtoId: string;
    quantidade: number;
    valorFinal: number; // Valor final deste produto na venda (após descontos/acréscimos)
  }[];
}

interface ProdutoApiResponse {
  id: string;
  nome: string;
  valor: number; // Valor base do produto
}

interface PeriodoDates {
  periodoInicial: string;
  periodoFinal: string;
}

function getPeriodoDates(periodo: string): PeriodoDates {
  const now = new Date();

  let inicio: Date | null = null;
  let fim: Date | null = null;

  switch (periodo) {
    case 'hoje':
      inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      fim.setHours(23, 59, 59, 999);
      break;
    case 'semana': // Corresponde a 'Últimos 7 Dias'
      inicio = new Date(now);
      inicio.setDate(now.getDate() - 6); // Hoje - 6 dias = 7 dias no total
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      fim.setHours(23, 59, 59, 999);
      break;
    case '30dias': // Adicionado para 'Últimos 30 Dias'
      inicio = new Date(now);
      inicio.setDate(now.getDate() - 29); // Hoje - 29 dias = 30 dias no total
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      fim.setHours(23, 59, 59, 999);
      break;
    case 'mes': // Corresponde a 'Mês Atual'
      inicio = new Date(now.getFullYear(), now.getMonth(), 1);
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      fim.setHours(23, 59, 59, 999);
      break;
    case '60dias': // Adicionado para 'Últimos 60 Dias'
      inicio = new Date(now);
      inicio.setDate(now.getDate() - 59); // Hoje - 59 dias = 60 dias no total
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      fim.setHours(23, 59, 59, 999);
      break;
    case '90dias': // Adicionado para 'Últimos 90 Dias'
      inicio = new Date(now);
      inicio.setDate(now.getDate() - 89); // Hoje - 89 dias = 90 dias no total
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      fim.setHours(23, 59, 59, 999);
      break;
    default:
      // Se o período for 'todos' ou inválido, não aplica filtro de data
      return { periodoInicial: '', periodoFinal: '' };
  }

  return {
    periodoInicial: inicio ? inicio.toISOString() : '',
    periodoFinal: fim ? fim.toISOString() : '',
  };
}

export class BuscarTopProdutosDetalhadoUseCase {
  async execute(periodo: string = 'hoje', limit: number = 10): Promise<DashboardTopProduto[]> {
    const { auth } = useAuthStore.getState();
    const token = auth?.getAccessToken();
    const baseUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL;

    if (!token || !baseUrl) {
      throw new Error('Token de autenticação ou URL da API não disponíveis.');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const { periodoInicial, periodoFinal } = getPeriodoDates(periodo);
    const params = new URLSearchParams();

    if (periodoInicial && periodoFinal) {
      params.append('periodoInicial', periodoInicial);
      params.append('periodoFinal', periodoFinal);
    }
    params.append('status', 'FINALIZADA'); // Apenas vendas finalizadas
    params.append('limit', '100'); // Adicionado para buscar todos os itens (ou um número grande o suficiente)

    // Passo 1: Buscar IDs das Vendas
    const vendasResponse = await fetch(`${baseUrl}/api/v1/operacao-pdv/vendas?${params.toString()}`, { headers });
    if (!vendasResponse.ok) {
      throw new Error('Erro ao buscar vendas por período.');
    }
    const vendasData: VendaListApiResponse = await vendasResponse.json();
    const vendaIds = vendasData.items.map(venda => venda.id);

    if (vendaIds.length === 0) {
      return []; // Não há vendas para processar
    }

    // Cache para nomes dos produtos
    const productNamesCache = new Map<string, string>();

    // Função auxiliar para buscar o nome do produto
    const getProductName = async (id: string): Promise<string> => {
      if (productNamesCache.has(id)) {
        return productNamesCache.get(id)!;
      }

      const response = await fetch(`${baseUrl}/api/v1/cardapio/produtos/${id}`, { headers });
      if (!response.ok) {
        console.warn(`Não foi possível buscar o nome para o produto ID: ${id}. Status: ${response.status}`);
        return 'Produto Desconhecido';
      }
      const data: ProdutoApiResponse = await response.json();
      productNamesCache.set(id, data.nome);
      return data.nome;
    };

    // Passo 2: Buscar Detalhes de Cada Venda
    const detailedVendasPromises = vendaIds.map(async (vendaId) => {
      const detalhesResponse = await fetch(`${baseUrl}/api/v1/operacao-pdv/vendas/${vendaId}`, { headers });
      if (!detalhesResponse.ok) {
        console.warn(`Não foi possível buscar detalhes para a venda ID: ${vendaId}. Status: ${detalhesResponse.status}`);
        return null; // Ignorar vendas que não puderam ser detalhadas
      }
      return detalhesResponse.json() as Promise<VendaDetalhesApiResponse>;
    });

    const detailedVendas = (await Promise.all(detailedVendasPromises)).filter(Boolean) as VendaDetalhesApiResponse[];

    // Passo 3: Agregar e Comparar Produtos
    const productAggregation = new Map<string, { produto: string; quantidade: number; valorTotal: number }>();

    for (const venda of detailedVendas) {
      for (const produtoLancado of venda.produtosLancados) {
        const produtoId = produtoLancado.produtoId;
        const quantidade = produtoLancado.quantidade;
        const valorUnitarioTotalDoItem = produtoLancado.valorFinal; // Valor final deste item na venda

        const produtoNome = await getProductName(produtoId); // Resolve o nome do produto aqui

        if (productAggregation.has(produtoNome)) {
          const existing = productAggregation.get(produtoNome)!;
          existing.quantidade += quantidade;
          existing.valorTotal += valorUnitarioTotalDoItem;
          productAggregation.set(produtoNome, existing);
        } else {
          productAggregation.set(produtoNome, {
            produto: produtoNome,
            quantidade: quantidade,
            valorTotal: valorUnitarioTotalDoItem,
          });
        }
      }
    }

    // Passo 4: Retornar no Formato DashboardTopProduto[]
    const topProdutos: DashboardTopProduto[] = Array.from(productAggregation.values())
      .sort((b, a) => a.quantidade - b.quantidade) // Ordena pela quantidade em ordem crescente
      .slice(0, limit) // Limita a quantidade de top produtos
      .map((item, index) => DashboardTopProduto.create({
        rank: index + 1,
        produto: item.produto,
        quantidade: item.quantidade,
        valorTotal: item.valorTotal,
      }));

    return topProdutos;
  }
}


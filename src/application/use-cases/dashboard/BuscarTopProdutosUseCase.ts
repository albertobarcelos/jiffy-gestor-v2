import { DashboardTopProduto } from '@/src/domain/entities/DashboardTopProduto'

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

export class BuscarTopProdutosUseCase {
  async execute(periodo: string = 'hoje', limit: number = 10): Promise<DashboardTopProduto[]> {
    const { periodoInicial, periodoFinal } = getPeriodoDates(periodo);
    const params = new URLSearchParams();
    
    if (periodoInicial && periodoFinal) {
      params.append('periodoInicial', periodoInicial);
      params.append('periodoFinal', periodoFinal);
    }

    // Para buscar top produtos, a API de vendas deve retornar os itens da venda
    // e então a agregação será feita no frontend.
    const response = await fetch(`/api/vendas?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao buscar top produtos');
    }

    const data = await response.json();
    const vendasDoPeriodo = data.items || [];

    // Agregação de produtos
    const productAggregation = new Map<string, { produto: string; quantidade: number; valorTotal: number }>();

    vendasDoPeriodo.forEach((venda: any) => {
      // Assumindo que cada venda tem um array de produtos
      // A estrutura de venda não foi totalmente definida, então farei uma suposição aqui.
      // Se a API /api/vendas não retornar detalhes dos produtos dentro de cada item de venda,
      // teremos que ajustar este ponto ou o endpoint da API.
      // Por exemplo, se venda.produtos é um array de { produtoId, nomeProduto, quantidade, precoUnitario }
      (venda.produtos || []).forEach((itemProduto: any) => {
        const produtoId = itemProduto.produtoId || itemProduto.id; // Tentativa de pegar ID
        const nomeProduto = itemProduto.nome || itemProduto.name || 'Produto Desconhecido';
        const quantidade = itemProduto.quantidade || 0;
        const valorTotalProduto = (itemProduto.quantidade || 0) * (itemProduto.precoUnitario || 0);

        if (productAggregation.has(produtoId)) {
          const existing = productAggregation.get(produtoId)!;
          existing.quantidade += quantidade;
          existing.valorTotal += valorTotalProduto;
          productAggregation.set(produtoId, existing);
        } else {
          productAggregation.set(produtoId, {
            produto: nomeProduto,
            quantidade: quantidade,
            valorTotal: valorTotalProduto,
          });
        }
      });
    });

    // Converte para array e classifica por valor total
    const topProdutos = Array.from(productAggregation.values())
      .sort((a, b) => b.valorTotal - a.valorTotal) // Classifica do maior para o menor valor total
      .slice(0, limit) // Limita ao número desejado de top produtos
      .map((item, index) => DashboardTopProduto.create({
        produto: item.produto,
        quantidade: item.quantidade,
        valorTotal: item.valorTotal,
        rank: index + 1,
      }));

    return topProdutos;
  }
}
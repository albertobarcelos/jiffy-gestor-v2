import { DashboardEvolucao } from '@/src/domain/entities/DashboardEvolucao'

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

export class BuscarEvolucaoVendasUseCase {
  private async fetchAllVendas(periodoInicial: string, periodoFinal: string, status: string): Promise<any[]> {
    const baseParams = new URLSearchParams();
    if (periodoInicial && periodoFinal) {
      baseParams.append('periodoInicial', periodoInicial);
      baseParams.append('periodoFinal', periodoFinal);
    }
    baseParams.append('status', status); // Apenas um status por chamada

    const limitPerPage = 100; // Um limite razoável por página
    let allVendas: any[] = [];
    let currentPage = 0;
    let totalPages = 1;

    while (currentPage < totalPages) {
      const currentParams = new URLSearchParams(baseParams.toString());
      currentParams.append('limit', limitPerPage.toString());
      currentParams.append('offset', (currentPage * limitPerPage).toString());

      const response = await fetch(`/api/vendas?${currentParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao buscar vendas para status ${status}`);
      }

      const data = await response.json();
      allVendas = allVendas.concat(data.items || []);

      if (currentPage === 0 && data.totalPages) {
        totalPages = data.totalPages;
      } else if (currentPage === 0 && data.count && data.limit) {
        totalPages = Math.ceil(data.count / data.limit);
      }
      currentPage++;
    }
    return allVendas;
  }

  async execute(
    periodo: string = 'hoje', 
    selectedStatuses: string[] = ['FINALIZADA'],
    periodoInicialCustom?: Date | null,
    periodoFinalCustom?: Date | null,
    intervaloHora?: number // Intervalo em minutos (15, 30 ou 60)
  ): Promise<DashboardEvolucao[]> {
      let periodoInicial: string;
      let periodoFinal: string;
      const isCustomDates = periodoInicialCustom && periodoFinalCustom;
      
      // Se datas personalizadas foram fornecidas, usa elas
      if (isCustomDates) {
        periodoInicial = periodoInicialCustom.toISOString();
        periodoFinal = periodoFinalCustom.toISOString();
      } else {
        // Caso contrário, usa a função de cálculo de período
        const dates = getPeriodoDates(periodo);
        periodoInicial = dates.periodoInicial;
        periodoFinal = dates.periodoFinal;
      }
      
      // Faz chamadas separadas para cada status selecionado
      const fetchPromises = selectedStatuses.map(status => 
        this.fetchAllVendas(periodoInicial, periodoFinal, status)
    );
    const results = await Promise.all(fetchPromises);

    // Combina os resultados de todas as chamadas
    const allVendasData: any[] = results.flat();

    // Detecta se deve agrupar por hora (quando há datas personalizadas com horários específicos)
    // Agrupa por hora se:
    // 1. São datas personalizadas
    // 2. E (o intervalo é menor que 48 horas OU há horários específicos definidos)
    let shouldGroupByHour = false;
    if (isCustomDates && periodoInicialCustom && periodoFinalCustom) {
      const diffInHours = (periodoFinalCustom.getTime() - periodoInicialCustom.getTime()) / (1000 * 60 * 60);
      const hasSpecificHours = periodoInicialCustom.getHours() !== 0 || periodoInicialCustom.getMinutes() !== 0 ||
                                periodoFinalCustom.getHours() !== 23 || periodoFinalCustom.getMinutes() !== 59;
      // Se o intervalo for menor que 48 horas OU houver horários específicos, agrupa por hora
      shouldGroupByHour = diffInHours < 48 || hasSpecificHours;
    }
    
    // Define o intervalo padrão se não foi fornecido (30 minutos)
    const intervaloMinutos = intervaloHora || 30;

    // Inicializa mapas para cada status
    const finalizadasDailyMap = new Map<string, number>();
    const canceladasDailyMap = new Map<string, number>();

    allVendasData.forEach((venda: any) => {
      const saleDate = new Date(venda.dataCriacao);
      const year = saleDate.getFullYear();
      const month = (saleDate.getMonth() + 1).toString().padStart(2, '0');
      const day = saleDate.getDate().toString().padStart(2, '0');
      
      let groupKey: string;
      if (shouldGroupByHour) {
        // Agrupa por intervalo personalizado (15, 30 ou 60 minutos)
        const hour = saleDate.getHours();
        const saleMinutes = saleDate.getMinutes();
        
        let roundedMinutes: number;
        let finalHour = hour;
        
        if (intervaloMinutos === 15) {
          // Arredonda para o intervalo de 15 minutos mais próximo (00, 15, 30, 45)
          roundedMinutes = Math.round(saleMinutes / 15) * 15;
          if (roundedMinutes === 60) {
            roundedMinutes = 0;
            finalHour = (hour + 1) % 24; // Ajusta para a próxima hora
          }
        } else if (intervaloMinutos === 30) {
          // Arredonda para o intervalo de 30 minutos mais próximo (00 ou 30)
          // Se minutos < 15, vai para :00; se >= 15, vai para :30
          roundedMinutes = saleMinutes < 15 ? 0 : 30;
        } else if (intervaloMinutos === 60) {
          // Arredonda para a hora completa (sempre :00)
          roundedMinutes = 0;
        } else {
          // Fallback para 30 minutos
          roundedMinutes = saleMinutes < 15 ? 0 : 30;
        }
        
        const hourStr = finalHour.toString().padStart(2, '0');
        const minutesStr = roundedMinutes.toString().padStart(2, '0');
        groupKey = `${year}-${month}-${day} ${hourStr}:${minutesStr}`;
      } else {
        // Agrupa por dia: YYYY-MM-DD
        groupKey = `${year}-${month}-${day}`;
      }
      
      const valor = venda.valorFinal || 0;

      let vendaStatus: string;
      if (venda.dataCancelamento) {
        vendaStatus = 'CANCELADA';
      } else {
        vendaStatus = 'FINALIZADA';
      }

      switch (vendaStatus) {
        case 'FINALIZADA':
          finalizadasDailyMap.set(groupKey, (finalizadasDailyMap.get(groupKey) || 0) + valor);
          break;
        case 'CANCELADA':
          canceladasDailyMap.set(groupKey, (canceladasDailyMap.get(groupKey) || 0) + valor);
          break;
        default:
          break;
             }
           });

           // Gera dados para todos os períodos (dias ou horas), preenchendo ausentes com 0
           const evolucaoDiaria: DashboardEvolucao[] = [];
    
    let effectiveStartDate: Date;
    let effectiveEndDate: Date;

    // Prioriza datas personalizadas se fornecidas
    if (periodoInicial && periodoFinal) {
      effectiveStartDate = new Date(periodoInicial);
      effectiveEndDate = new Date(periodoFinal);
      // Se não foram datas personalizadas, ajusta para o final do dia
      // Se foram datas personalizadas, mantém as horas definidas
      if (!isCustomDates) {
        effectiveEndDate.setHours(23, 59, 59, 999);
      }
    } else if (allVendasData.length > 0) {
      // Se o período for 'todos', determina o intervalo de datas a partir dos dados obtidos
      const dates = allVendasData.map((venda: any) => new Date(venda.dataCriacao));
      effectiveStartDate = new Date(Math.min(...dates.map(date => date.getTime())));
      effectiveEndDate = new Date(Math.max(...dates.map(date => date.getTime())));
      effectiveStartDate.setHours(0, 0, 0, 0);
      effectiveEndDate.setHours(23, 59, 59, 999);
    } else {
      // Nenhum filtro de período e nenhum dado, retorna array vazio
      return [];
    }

    if (shouldGroupByHour) {
      // Agrupa por intervalo personalizado (15, 30 ou 60 minutos)
      let currentTime = new Date(effectiveStartDate);
      
      // Arredonda para o intervalo mais próximo (para baixo)
      const currentMinutes = currentTime.getMinutes();
      let roundedMinutes: number;
      
      if (intervaloMinutos === 15) {
        // Arredonda para o intervalo de 15 minutos mais próximo (para baixo)
        roundedMinutes = Math.floor(currentMinutes / 15) * 15;
      } else if (intervaloMinutos === 30) {
        // Arredonda para o intervalo de 30 minutos mais próximo (para baixo)
        roundedMinutes = currentMinutes >= 30 ? 30 : 0;
      } else if (intervaloMinutos === 60) {
        // Arredonda para a hora completa
        roundedMinutes = 0;
      } else {
        // Fallback para 30 minutos
        roundedMinutes = currentMinutes >= 30 ? 30 : 0;
      }
      
      currentTime.setMinutes(roundedMinutes, 0, 0);
      
      while (currentTime <= effectiveEndDate) {
        const year = currentTime.getFullYear();
        const month = (currentTime.getMonth() + 1).toString().padStart(2, '0');
        const day = currentTime.getDate().toString().padStart(2, '0');
        const hour = currentTime.getHours().toString().padStart(2, '0');
        const minutes = currentTime.getMinutes().toString().padStart(2, '0');
        const timeKey = `${year}-${month}-${day} ${hour}:${minutes}`;
        
        // Label formatado: "DD/MM HH:MM"
        const label = `${day}/${month} ${hour}:${minutes}`;
        
        evolucaoDiaria.push(DashboardEvolucao.create({
          data: timeKey,
          label: label,
          valorFinalizadas: finalizadasDailyMap.get(timeKey) || 0,
          valorCanceladas: canceladasDailyMap.get(timeKey) || 0,
        }));
        
        // Avança pelo intervalo definido
        currentTime.setMinutes(currentTime.getMinutes() + intervaloMinutos);
      }
    } else {
      // Agrupa por dia (comportamento original)
      let currentDay = new Date(effectiveStartDate);
      // Garante que começa no início do dia
      currentDay.setHours(0, 0, 0, 0);
      
      while (currentDay <= effectiveEndDate) {
        const year = currentDay.getFullYear();
        const month = (currentDay.getMonth() + 1).toString().padStart(2, '0');
        const day = currentDay.getDate().toString().padStart(2, '0');
        const dayKey = `${year}-${month}-${day}`;
        const label = currentDay.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        
        evolucaoDiaria.push(DashboardEvolucao.create({
          data: dayKey,
          label: label,
          valorFinalizadas: finalizadasDailyMap.get(dayKey) || 0,
          valorCanceladas: canceladasDailyMap.get(dayKey) || 0,
        }));
        currentDay.setDate(currentDay.getDate() + 1);
      }
    }

    return evolucaoDiaria;
  }
}

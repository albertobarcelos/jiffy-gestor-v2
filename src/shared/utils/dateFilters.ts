/**
 * @file Funções utilitárias para cálculo de períodos de data.
 */

/**
 * Calcula o período de datas (início e fim) com base em uma opção de string.
 *
 * @param opcao A string que representa o período (ex: 'Hoje', 'Últimos 7 Dias', 'Todos').
 * @returns Um objeto contendo `inicio` e `fim` como objetos Date, ou `null` se a opção for 'Todos'.
 */
export const calculatePeriodo = (opcao: string): { inicio: Date | null; fim: Date | null } => {
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);

  switch (opcao) {
    case 'Hoje': {
      const inicio = new Date();
      inicio.setHours(0, 0, 0, 0);
      return { inicio, fim: hoje };
    }
    case 'Ontem': {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 1);
      inicio.setHours(0, 0, 0, 0);
      const fim = new Date(inicio);
      fim.setHours(23, 59, 59, 999);
      return { inicio, fim };
    }
    case 'Últimos 7 Dias': {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 6);
      inicio.setHours(0, 0, 0, 0);
      return { inicio, fim: hoje };
    }
    case 'Mês Atual': {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      inicio.setHours(0, 0, 0, 0);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      fim.setHours(23, 59, 59, 999);
      return { inicio, fim };
    }
    case 'Mês Passado': {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      inicio.setHours(0, 0, 0, 0);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      fim.setHours(23, 59, 59, 999);
      return { inicio, fim };
    }
    case 'Últimos 30 Dias': {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 29);
      inicio.setHours(0, 0, 0, 0);
      return { inicio, fim: hoje };
    }
    case 'Últimos 60 Dias': {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 59);
      inicio.setHours(0, 0, 0, 0);
      return { inicio, fim: hoje };
    }
    case 'Últimos 90 Dias': {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 89);
      inicio.setHours(0, 0, 0, 0);
      return { inicio, fim: hoje };
    }
    default:
      return { inicio: null, fim: null };
  }
};

/**
 * Indica se o intervalo entre data inicial e final (apenas calendário, dias inclusivos)
 * permite opções de agregação por hora (15/30/60 min) no dashboard.
 * Até 2 dias inclusivos: permite; mais de 2 dias: só agregação por dia.
 * Ex.: mesmo dia → 1 dia; dia 1 → dia seguinte → 2 dias; dia 1 → dois dias depois → 3 dias (não permite).
 */
export function permiteOpcoesIntervaloPorHora(inicio: Date, fim: Date): boolean {
  const start = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())
  const end = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate())
  if (end.getTime() < start.getTime()) return false
  const diasInclusivos = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  return diasInclusivos <= 2
}

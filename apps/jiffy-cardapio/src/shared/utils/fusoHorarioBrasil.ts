/**
 * Mapeia a sigla da UF (endereço cadastral) para o fuso IANA usado no agrupamento
 * de vendas por "dia civil" no dashboard.
 *
 * A maior parte do Brasil está em UTC−3 (`America/Sao_Paulo`). Estados listados
 * abaixo têm offset diferente em relação ao UTC (sem horário de verão vigente).
 * Valores ausentes ou inválidos → fallback seguro para o fuso mais comum.
 */
export function ufBrasilParaTimeZoneIANA(ufRaw: string | null | undefined): string {
  const uf = ufRaw?.trim().toUpperCase()
  if (!uf || uf.length !== 2) return 'America/Sao_Paulo'

  const porUf: Record<string, string> = {
    AC: 'America/Rio_Branco',
    AM: 'America/Manaus',
    RO: 'America/Porto_Velho',
    RR: 'America/Boa_Vista',
    MT: 'America/Cuiaba',
    MS: 'America/Campo_Grande',
  }

  return porUf[uf] ?? 'America/Sao_Paulo'
}

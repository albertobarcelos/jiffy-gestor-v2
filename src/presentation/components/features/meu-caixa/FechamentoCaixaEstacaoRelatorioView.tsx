'use client'

import type { OperacaoCaixaEstacaoDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import {
  formatarMoedaFechamentoCaixa,
  formatarMoedaFechamentoCaixaSinal,
  montarFechamentoCaixaEstacaoRelatorio,
  RODAPE_FECHAMENTO_CAIXA_TAGLINE,
} from '@/src/application/caixa-estacao/fechamentoCaixaEstacaoRelatorio'

function LinhaRelatorio({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-secondary-text">{label}</span>
      <span className="text-right font-bold tabular-nums text-primary-text">{valor}</span>
    </div>
  )
}

function SecaoRelatorio({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="h-px bg-primary-text/40" />
      <h3 className="text-sm font-semibold tracking-wide text-primary-text">{titulo}</h3>
      <div className="space-y-1.5 text-sm">{children}</div>
    </section>
  )
}

export function FechamentoCaixaEstacaoRelatorioView({
  operacao,
}: {
  operacao: OperacaoCaixaEstacaoDTO
}) {
  const relatorio = montarFechamentoCaixaEstacaoRelatorio(operacao)

  return (
    <div className="space-y-4 text-sm">
      <header className="space-y-2 text-center">
        <h2 className="text-base font-bold text-primary-text md:text-lg">{relatorio.titulo}</h2>
        <p className="text-sm text-primary-text">{relatorio.empresa}</p>
        <div className="border-t border-b border-primary-text/30 py-2">
          <p className="text-sm font-bold tracking-wide text-primary-text">{relatorio.subtitulo}</p>
        </div>
      </header>

      <div className="space-y-1.5">
        <LinhaRelatorio label="Abertura:" valor={relatorio.abertura} />
        <LinhaRelatorio label="Fechamento:" valor={relatorio.fechamento} />
        {relatorio.tempoOperacao ? (
          <LinhaRelatorio label="Tempo op.:" valor={relatorio.tempoOperacao} />
        ) : null}
      </div>

      {relatorio.resumoRecebimentos ? (
        <SecaoRelatorio titulo="RESUMO RECEBIMENTOS">
          {relatorio.resumoRecebimentos.meios.length === 0 ? (
            <LinhaRelatorio label="—:" valor={formatarMoedaFechamentoCaixa(0)} />
          ) : (
            relatorio.resumoRecebimentos.meios.map(meio => (
              <LinhaRelatorio
                key={`${meio.nome}-${meio.valor}`}
                label={`${meio.nome}:`}
                valor={formatarMoedaFechamentoCaixa(meio.valor)}
              />
            ))
          )}
          <div className="border-t border-dashed border-primary-text/25 pt-2">
            <LinhaRelatorio
              label="TOT. LIQUIDO:"
              valor={formatarMoedaFechamentoCaixa(relatorio.resumoRecebimentos.totalLiquido)}
            />
          </div>
        </SecaoRelatorio>
      ) : null}

      {relatorio.resumoCaixa ? (
        <SecaoRelatorio titulo="RESUMO CAIXA">
          <LinhaRelatorio
            label="RECEB. EM DIN.:"
            valor={formatarMoedaFechamentoCaixa(relatorio.resumoCaixa.recebimentosDinheiro)}
          />
          <LinhaRelatorio
            label="TOT. SANGRIAS:"
            valor={`-${formatarMoedaFechamentoCaixa(relatorio.resumoCaixa.totalSangrias)}`}
          />
          <LinhaRelatorio
            label="TOT. SUPRIMENTOS:"
            valor={`+${formatarMoedaFechamentoCaixa(relatorio.resumoCaixa.totalSuprimentos)}`}
          />
          <LinhaRelatorio
            label="TOT. TROCO:"
            valor={`-${formatarMoedaFechamentoCaixa(relatorio.resumoCaixa.totalTroco)}`}
          />
          <div className="border-t border-dashed border-primary-text/25 pt-2">
            <LinhaRelatorio
              label="SALDO ESPERADO:"
              valor={formatarMoedaFechamentoCaixa(relatorio.resumoCaixa.saldoEsperadoDinheiro)}
            />
          </div>
        </SecaoRelatorio>
      ) : null}

      {relatorio.conferencia ? (
        <SecaoRelatorio titulo="CONFERÊNCIA">
          <LinhaRelatorio
            label="Valor esperado:"
            valor={formatarMoedaFechamentoCaixa(relatorio.conferencia.valorEsperado)}
          />
          <LinhaRelatorio
            label="Valor contado:"
            valor={formatarMoedaFechamentoCaixa(relatorio.conferencia.valorContado)}
          />
          <LinhaRelatorio
            label="Diferença:"
            valor={formatarMoedaFechamentoCaixaSinal(relatorio.conferencia.diferenca)}
          />
        </SecaoRelatorio>
      ) : null}

      <footer className="space-y-1 border-t border-primary-text/30 pt-3 text-center text-xs text-secondary-text">
        <p className="font-semibold text-primary-text">Caixa: {relatorio.nomeCaixa}</p>
        <p>{RODAPE_FECHAMENTO_CAIXA_TAGLINE}</p>
      </footer>
    </div>
  )
}

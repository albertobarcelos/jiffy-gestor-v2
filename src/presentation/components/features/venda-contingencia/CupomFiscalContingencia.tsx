import type { VendaContingenciaPublica } from '@/src/infrastructure/api/fetchVendaContingenciaPublica'
import { CupomRodapeDanfe80 } from '@/src/presentation/components/features/venda-contingencia/CupomRodapeDanfe80'

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '0,00'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatCurrencyBrl(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function linhaTotalItem(
  q: number | undefined,
  vu: number | undefined
): number | null {
  if (q == null || vu == null) return null
  return q * vu
}

interface CupomFiscalContingenciaProps {
  data: VendaContingenciaPublica
  /** URL do proxy PNG 80mm; só preencher quando nota emitida (página calcula). */
  rodapeDanfeSrc?: string | null
}

/**
 * Cupom estilo térmico (alinhado ao visual de DetalhesFechamento).
 */
export function CupomFiscalContingencia({ data, rodapeDanfeSrc }: CupomFiscalContingenciaProps) {
  const textoPuro =
    data.cupomFiscal?.trim() ||
    data.textoCupom?.trim() ||
    data.cupomContingencia?.trim()

  if (textoPuro) {
    return (
      <>
        <pre
          className="whitespace-pre-wrap break-words text-sm leading-relaxed"
          style={{ fontFamily: "'Roboto Mono', 'Courier New', monospace" }}
        >
          {textoPuro}
        </pre>
        <CupomRodapeDanfe80 src={rodapeDanfeSrc} />
      </>
    )
  }

  const empresa =
    data.nomeEmpresa || data.empresa?.nome || 'Estabelecimento'
  const cnpj = data.empresa?.cnpj

  const produtos = (data.produtosLancados || []).filter((p) => !p.removido)
  const pagamentos = (data.pagamentos || []).filter((p) => !p.cancelado)

  return (
    <div className="space-y-2 text-sm" style={{ fontFamily: "'Roboto Mono', 'Courier New', monospace" }}>
      <h1 className="text-base md:text-lg font-bold text-center">CUPOM FISCAL — CONTINGÊNCIA</h1>
      <div className="h-px bg-black/40 my-2" />

      <div className="space-y-0.5">
        <div className="font-bold">{empresa}</div>
        {cnpj && <div>CNPJ: {cnpj}</div>}
        {data.codigoVenda != null && <div>Cód. venda: {data.codigoVenda}</div>}
        {data.numeroVenda != null && <div>Nº venda: {data.numeroVenda}</div>}
        {data.codigoTerminal && <div>Terminal: {data.codigoTerminal}</div>}
        {data.identificacao && <div>Cliente / identif.: {data.identificacao}</div>}
        <div>Abertura: {formatDateTime(data.dataCriacao)}</div>
        <div>Finalização: {formatDateTime(data.dataFinalizacao)}</div>
      </div>

      <div className="h-px bg-black/40 my-2" />

      <div className="space-y-1">
        <div className="font-bold">DOCUMENTO FISCAL</div>
        {data.tipoDocFiscal && <div>Tipo: {data.tipoDocFiscal}</div>}
        {data.statusFiscal && <div>Status: {data.statusFiscal}</div>}
        {data.numeroFiscal != null && (
          <div>
            Nº doc.: {data.numeroFiscal}
            {data.serieFiscal ? ` / Série ${data.serieFiscal}` : ''}
          </div>
        )}
        {data.dataEmissaoFiscal && <div>Emissão: {formatDateTime(data.dataEmissaoFiscal)}</div>}
        {data.retornoSefaz && (
          <div className="text-xs break-words opacity-90">SEFAZ: {data.retornoSefaz}</div>
        )}
      </div>

      {produtos.length > 0 && (
        <>
          <div className="h-px bg-black/40 my-2" />
          <div className="font-bold mb-1">ITENS</div>
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="text-left py-1 font-bold" style={{ padding: '2px' }}>
                  Descrição
                </th>
                <th className="text-right py-1 font-bold" style={{ padding: '2px' }}>
                  Qtd
                </th>
                <th className="text-right py-1 font-bold" style={{ padding: '2px' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p, i) => {
                const q = p.quantidade ?? 0
                const vu = p.valorUnitario ?? 0
                const total = linhaTotalItem(q, vu)
                return (
                  <tr key={i}>
                    <td style={{ padding: '2px', verticalAlign: 'top' }}>
                      <div>{p.nomeProduto || 'Item'}</div>
                      {(p.complementos || []).map((c, j) => (
                        <div key={j} className="text-[11px] opacity-80 pl-1">
                          + {c.nomeComplemento} x{c.quantidade ?? 1}{' '}
                          {c.valorUnitario != null ? `(${formatCurrencyBrl(c.valorUnitario)})` : ''}
                        </div>
                      ))}
                    </td>
                    <td className="text-right whitespace-nowrap" style={{ padding: '2px' }}>
                      {formatMoney(q)}
                    </td>
                    <td className="text-right whitespace-nowrap" style={{ padding: '2px' }}>
                      {total != null ? formatCurrencyBrl(total) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}

      <div className="h-px bg-black/40 my-2" />

      <div className="space-y-1">
        {data.totalDesconto != null && data.totalDesconto > 0 && (
          <div className="flex justify-between">
            <span>Descontos</span>
            <span>- {formatCurrencyBrl(data.totalDesconto)}</span>
          </div>
        )}
        {data.totalAcrescimo != null && data.totalAcrescimo > 0 && (
          <div className="flex justify-between">
            <span>Acréscimos</span>
            <span>+ {formatCurrencyBrl(data.totalAcrescimo)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold">
          <span>TOTAL</span>
          <span>{formatCurrencyBrl(data.valorFinal)}</span>
        </div>
        {data.troco != null && data.troco > 0 && (
          <div className="flex justify-between">
            <span>Troco</span>
            <span>{formatCurrencyBrl(data.troco)}</span>
          </div>
        )}
      </div>

      {pagamentos.length > 0 && (
        <>
          <div className="h-px bg-black/40 my-2" />
          <div className="font-bold mb-1">PAGAMENTOS</div>
          <ul className="space-y-1 text-xs">
            {pagamentos.map((pg, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="break-words">
                  {pg.nomeMeioPagamento || pg.meioPagamentoId || 'Pagamento'}
                </span>
                <span className="shrink-0">{formatCurrencyBrl(pg.valor)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="h-px bg-black/40 my-3" />
      <p className="text-center text-xs leading-snug">
        Documento emitido em contingência. Troque pela via definitiva quando disponível, conforme legislação.
      </p>
      <CupomRodapeDanfe80 src={rodapeDanfeSrc} />
    </div>
  )
}

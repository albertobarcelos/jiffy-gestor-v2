'use client'

import type { VendaPainelDetalheDTO } from '@/src/application/dto/VendaPainelDetalheDTO'
import { formatCurrencyBrl } from '@/src/presentation/utils/vendas/detalhesVendaExibicao'

type Props = {
  venda: VendaPainelDetalheDTO
}

export function DetalhesVendaRodizioSection({ venda }: Props) {
  const rodizio = venda.rodizioSessao
  if (!rodizio) return null
  const faixasRodizio = (rodizio.faixasLancadas ?? []).filter(faixa => faixa.removida !== true)
  const rodadasRodizio = (rodizio.rodadas ?? []).filter(rodada => !rodada.canceladaEm)
  const formatCurrency = formatCurrencyBrl

  return (
                <div className="mb-2 p-2">
                  <h2 className="text-lg font-semibold text-primary-text">Rodízio</h2>
                  <div className="mb-2 border-t border-dashed border-gray-400" />
                  <div className="space-y-2 md:px-2">
                    <div className="flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>{rodizio.nomeRodizio || 'Rodízio'}</span>
                      <span>{rodizio.status || (rodizio.encerradaEm ? 'Encerrado' : 'Aberto')}</span>
                    </div>
                    {faixasRodizio.map((faixa, index) => (
                      <div
                        key={faixa.id || index}
                        className="flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm"
                      >
                        <span>
                          {faixa.quantidade}x {faixa.nomeFaixa}
                        </span>
                        <span>{formatCurrency(faixa.valorUnitario * faixa.quantidade)}</span>
                      </div>
                    ))}
                    {rodadasRodizio.map((rodada, index) => (
                      <div
                        key={rodada.id || index}
                        className="rounded-lg bg-white px-1 py-1 text-xs text-primary-text md:text-sm"
                      >
                        <div className="flex justify-between">
                          <span>Rodada {rodada.numeroRodada}</span>
                          <span>{rodada.status || 'Aberta'}</span>
                        </div>
                        {(rodada.itens ?? []).map((item, itemIndex) => (
                          <div key={item.id || itemIndex} className="text-secondary-text">
                            {item.quantidade}x {item.nomeItem}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
  )
}

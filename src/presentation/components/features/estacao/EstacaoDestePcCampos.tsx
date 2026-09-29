'use client'

import { useEffect, useState } from 'react'
import Tooltip from '@mui/material/Tooltip'
import { MdAdd, MdCheck, MdComputer, MdDeliveryDining, MdEdit, MdInfo } from 'react-icons/md'
import type { EstacaoImpressaoResumo } from '@/src/domain/estacao-impressao/EstacaoImpressao'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { cn } from '@/src/shared/utils/cn'
import { nomeEstacaoImpressaoPadrao } from './nomeEstacaoImpressaoPadrao'

function CampoInfo({ texto, ariaLabel }: { texto: string; ariaLabel: string }) {
  return (
    <Tooltip title={texto} arrow placement="top">
      <span
        className="inline-flex cursor-help text-secondary-text transition-colors hover:text-primary-text"
        aria-label={ariaLabel}
      >
        <MdInfo className="h-4 w-4" aria-hidden />
      </span>
    </Tooltip>
  )
}

type EstacaoDestePcCamposProps = {
  estacoes: EstacaoImpressaoResumo[]
  estacaoId: string
  receptoraEstacaoId?: string | null
  /** Coluna Principal do delivery. No balcão fica oculta. */
  mostrarReceptora?: boolean
  disabled?: boolean
  ocupado?: boolean
  onReceptoraChange?: (estacaoId: string | null) => void
  onSelecionar: (estacaoId: string) => void
  onCriar: (nome: string) => Promise<EstacaoImpressaoResumo | void | undefined>
  onRenomear: (nome: string) => Promise<void>
}

export function EstacaoDestePcCampos({
  estacoes,
  estacaoId,
  receptoraEstacaoId = null,
  mostrarReceptora = true,
  disabled = false,
  ocupado = false,
  onReceptoraChange,
  onSelecionar,
  onCriar,
  onRenomear,
}: EstacaoDestePcCamposProps) {
  const [modoCriar, setModoCriar] = useState(false)
  const [modoRenomear, setModoRenomear] = useState(false)
  const [nomeNovo, setNomeNovo] = useState('')
  const [nomeEdicao, setNomeEdicao] = useState('')

  const selecionada = estacoes.find(e => e.id === estacaoId) ?? null
  const bloqueado = disabled || ocupado

  useEffect(() => {
    setModoRenomear(false)
    setNomeEdicao(selecionada?.nome ?? '')
  }, [estacaoId, selecionada?.nome])

  const handleCriar = async () => {
    const nome = nomeNovo.trim()
    if (!nome) return
    await onCriar(nome)
    setModoCriar(false)
    setNomeNovo('')
  }

  const handleRenomear = async () => {
    const nome = nomeEdicao.trim()
    if (!nome || !estacaoId) return
    await onRenomear(nome)
    setModoRenomear(false)
  }

  const handleToggleReceptora = (id: string, next: boolean) => {
    if (bloqueado || !onReceptoraChange) return
    if (next) {
      onReceptoraChange(id)
      return
    }
    if (receptoraEstacaoId === id) onReceptoraChange(null)
  }

  const gradeEstacao = mostrarReceptora
    ? 'grid-cols-[minmax(0,1fr)_3.75rem_5.75rem]'
    : 'grid-cols-[minmax(0,1fr)_3.75rem]'
  const textoAjuda = mostrarReceptora
    ? 'Em Deste PC, marque qual estação este computador configura. Em Principal, escolha a estação do delivery (só uma por loja). Salve para aplicar.'
    : 'Delivery e balcão usam esta estação para registrar os lançamentos do caixa.'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-semibold text-primary-text">Estações de impressão</p>
        <CampoInfo texto={textoAjuda} ariaLabel="Estações de impressão" />
      </div>

      {modoCriar ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="estacao-deste-pc-nome-novo"
            type="text"
            value={nomeNovo}
            disabled={bloqueado}
            onChange={e => setNomeNovo(e.target.value)}
            placeholder={nomeEstacaoImpressaoPadrao()}
            className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-secondary disabled:opacity-60"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={bloqueado || !nomeNovo.trim()}
              onClick={() => void handleCriar()}
              className="h-9 rounded-lg bg-secondary px-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Criar
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => {
                setModoCriar(false)
                setNomeNovo('')
              }}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-primary-text"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          {estacoes.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100 p-0.5">
              <div
                className={cn(
                  'grid items-center gap-x-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-text',
                  gradeEstacao
                )}
              >
                <span>Estação</span>
                <span className="whitespace-nowrap text-center">Deste PC</span>
                {mostrarReceptora ? (
                  <span className="flex items-center justify-center gap-0.5">
                    Principal
                    <CampoInfo
                      texto="Estação principal do delivery: pedidos finalizados, caixa e impressão. Só uma por loja — ao ligar em uma, a outra desliga. Salve alterações para aplicar."
                      ariaLabel="Estação principal do delivery"
                    />
                  </span>
                ) : null}
              </div>
              <div role="radiogroup" aria-label="Estação de impressão deste PC" className="space-y-0.5">
                {estacoes.map(estacao => {
                  const ativa = estacaoId === estacao.id
                  const ehReceptora = receptoraEstacaoId === estacao.id
                  return (
                    <div
                      key={estacao.id}
                      className={cn(
                        'grid items-center gap-x-1 rounded-md border px-3 transition-all',
                        gradeEstacao,
                        ativa
                          ? 'border-secondary/30 bg-white shadow-sm ring-1 ring-secondary/20'
                          : 'border-transparent bg-transparent opacity-80'
                      )}
                    >
                      <button
                        id={ativa ? 'estacao-deste-pc-select' : undefined}
                        type="button"
                        role="radio"
                        aria-checked={ativa}
                        disabled={bloqueado}
                        onClick={() => onSelecionar(estacao.id)}
                        className={cn(
                          'flex min-w-0 items-center gap-2 truncate py-2 pr-2 text-left text-sm transition-colors',
                          ativa
                            ? 'font-semibold text-primary-text'
                            : 'text-secondary-text hover:text-primary-text'
                        )}
                      >
                        {ativa ? (
                          <span className="inline-flex shrink-0 items-center rounded bg-secondary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary">
                            Ativa
                          </span>
                        ) : null}
                        <span className="truncate">
                          {estacao.nome || 'Estação sem nome'}
                          {!estacao.ativo ? ' (inativa)' : ''}
                        </span>
                      </button>
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={ativa}
                          aria-label={`${estacao.nome || 'Estação'} neste computador`}
                          disabled={bloqueado}
                          onClick={() => onSelecionar(estacao.id)}
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors',
                            ativa
                              ? 'border-secondary bg-secondary text-white shadow-sm'
                              : 'border-gray-300 bg-white text-transparent hover:border-secondary/40'
                          )}
                        >
                          {ativa ? <MdCheck className="h-4 w-4" aria-hidden /> : null}
                        </button>
                      </div>
                      {mostrarReceptora ? (
                        <div
                          className="flex items-center justify-end gap-1 py-1 pr-1"
                          onClick={e => e.stopPropagation()}
                        >
                          <JiffyIconSwitch
                            checked={ehReceptora}
                            onChange={e => handleToggleReceptora(estacao.id, e.target.checked)}
                            disabled={bloqueado}
                            size="xs"
                            inputProps={{
                              'aria-label': `${estacao.nome || 'Estação'} como principal do delivery`,
                            }}
                          />
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                            {ehReceptora ? (
                              <MdDeliveryDining
                                className="h-5 w-5 text-secondary"
                                aria-hidden
                              />
                            ) : null}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-secondary-text">Nenhuma estação cadastrada.</p>
          )}

          {estacaoId && selecionada ? (
            <div className="flex items-start gap-2 rounded-lg border border-secondary/25 bg-secondary/[0.06] px-3 py-2.5">
              <MdComputer className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden />
              <p className="text-xs leading-relaxed text-primary-text">
                {mostrarReceptora ? (
                  <>
                    Você está configurando{' '}
                    <span className="font-semibold text-secondary">{selecionada.nome}</span> neste
                    computador. Os vínculos de impressora abaixo valem só para esta estação.
                  </>
                ) : (
                  <>
                    Este computador está na estação{' '}
                    <span className="font-semibold text-secondary">{selecionada.nome}</span>.
                    Delivery e balcão usam esta estação para registrar os lançamentos do caixa.
                  </>
                )}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              disabled={bloqueado}
              onClick={() => {
                setModoCriar(true)
                setNomeNovo(nomeEstacaoImpressaoPadrao())
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-secondary disabled:opacity-50"
            >
              <MdAdd className="h-3.5 w-3.5" aria-hidden />
              Nova estação
            </button>
            {estacaoId && selecionada && !modoRenomear ? (
              <button
                type="button"
                disabled={bloqueado}
                onClick={() => setModoRenomear(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-secondary disabled:opacity-50"
              >
                <MdEdit className="h-3.5 w-3.5" aria-hidden />
                Renomear
              </button>
            ) : null}
          </div>
        </>
      )}

      {estacaoId && selecionada && modoRenomear && !modoCriar ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="estacao-deste-pc-nome-edicao"
            type="text"
            value={nomeEdicao}
            disabled={bloqueado}
            onChange={e => setNomeEdicao(e.target.value)}
            className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-secondary disabled:opacity-60"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={bloqueado || !nomeEdicao.trim()}
              onClick={() => void handleRenomear()}
              className="h-9 rounded-lg bg-secondary px-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Salvar
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => {
                setModoRenomear(false)
                setNomeEdicao(selecionada.nome)
              }}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-primary-text"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

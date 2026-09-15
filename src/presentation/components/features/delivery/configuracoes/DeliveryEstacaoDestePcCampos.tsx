'use client'

import { useEffect, useState } from 'react'
import { MdAdd, MdEdit } from 'react-icons/md'
import type { EstacaoImpressaoResumo } from '@/src/infrastructure/api/estacoesImpressaoApi'
import { nomeEstacaoImpressaoPadrao } from '@/src/infrastructure/api/estacoesImpressaoApi'
import { CupomCampoInfo } from './DeliveryModoPapelToggle'

type DeliveryEstacaoDestePcCamposProps = {
  estacoes: EstacaoImpressaoResumo[]
  estacaoId: string
  disabled?: boolean
  ocupado?: boolean
  onSelecionar: (estacaoId: string) => void
  onCriar: (nome: string) => Promise<void>
  onRenomear: (nome: string) => Promise<void>
}

export function DeliveryEstacaoDestePcCampos({
  estacoes,
  estacaoId,
  disabled = false,
  ocupado = false,
  onSelecionar,
  onCriar,
  onRenomear,
}: DeliveryEstacaoDestePcCamposProps) {
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

  return (
    <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/90 p-2.5">
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-semibold text-primary-text">Estação deste computador</p>
        <CupomCampoInfo
          texto="Cada PC usa uma estação para saber quais impressoras físicas recebem o cupom. Crie uma ou escolha uma já cadastrada."
          ariaLabel="Estação deste computador"
        />
      </div>

      {modoCriar ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="delivery-estacao-nome-novo"
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            id="delivery-estacao-select"
            value={estacaoId}
            disabled={bloqueado}
            onChange={e => onSelecionar(e.target.value)}
            className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-secondary disabled:opacity-60"
          >
            <option value="">Selecione uma estação</option>
            {estacoes.map(estacao => (
              <option key={estacao.id} value={estacao.id}>
                {estacao.nome || 'Estação sem nome'}
                {estacao.ativo ? '' : ' (inativa)'}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={bloqueado}
            onClick={() => {
              setModoCriar(true)
              setNomeNovo(nomeEstacaoImpressaoPadrao())
            }}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-primary-text disabled:opacity-50"
          >
            <MdAdd className="h-4 w-4" aria-hidden />
            Nova
          </button>
        </div>
      )}

      {estacaoId && selecionada && !modoCriar ? (
        modoRenomear ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id="delivery-estacao-nome-edicao"
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
                Salvar nome
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
        ) : (
          <button
            type="button"
            disabled={bloqueado}
            onClick={() => setModoRenomear(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-secondary disabled:opacity-50"
          >
            <MdEdit className="h-3.5 w-3.5" aria-hidden />
            Renomear estação
          </button>
        )
      ) : null}

      {!estacaoId && estacoes.length === 0 && !modoCriar ? (
        <p className="text-xs text-secondary-text">
          Nenhuma estação cadastrada. Crie uma para vincular as impressoras deste PC.
        </p>
      ) : null}
    </div>
  )
}

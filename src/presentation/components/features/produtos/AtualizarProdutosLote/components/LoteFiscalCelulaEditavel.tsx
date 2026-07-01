'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { Produto } from '@/src/domain/entities/Produto'
import {
  indicadoresProducao,
  origensMercadoria,
  tiposProduto,
} from '@/src/presentation/components/features/produtos/NovoProduto/fiscalSelectOptions'
import type { FiscalColunaGridId } from '../types'
import type { FiscalInlineEditApi } from '../hooks/useFiscalInlineEdit'
import { COLUNAS_FISCAL_GRID } from '../utils/fiscalLoteDisplay'

const COLUNAS_TEXTO_LONGO = new Set<FiscalColunaGridId>(['origem', 'tipo', 'indicador'])

type TipoControleCelula = 'text' | 'select'

const CONFIG_COLUNA: Record<
  FiscalColunaGridId,
  { tipo: TipoControleCelula; opcoes?: { value: string; label: string }[]; maxLength?: number }
> = {
  ncm: { tipo: 'text', maxLength: 8 },
  cest: { tipo: 'text', maxLength: 7 },
  origem: { tipo: 'select', opcoes: origensMercadoria },
  tipo: { tipo: 'select', opcoes: tiposProduto },
  indicador: { tipo: 'select', opcoes: indicadoresProducao },
}

export interface LoteFiscalCelulaEditavelProps {
  produto: Produto
  coluna: FiscalColunaGridId
  className: string
  textoExibicao: string
  tituloExibicao?: string
  fiscalInline: FiscalInlineEditApi
  layout?: 'grid' | 'mobile'
}

export function LoteFiscalCelulaEditavel({
  produto,
  coluna,
  className,
  textoExibicao,
  tituloExibicao,
  fiscalInline,
  layout = 'grid',
}: LoteFiscalCelulaEditavelProps) {
  const produtoId = produto.getId()
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)
  const config = CONFIG_COLUNA[coluna]

  const ativa = fiscalInline.isCelulaAtiva(produtoId, coluna)
  const salvando = fiscalInline.isCelulaSalvando(produtoId, coluna)
  const erro = fiscalInline.getErroCelula(produtoId, coluna)
  const draft = fiscalInline.getDraft()

  useEffect(() => {
    if (ativa) {
      inputRef.current?.focus()
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      }
    }
  }, [ativa])

  const handleAbrir = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation()
      if (!fiscalInline.enabled || salvando) return
      fiscalInline.abrirCelula(produto, coluna)
    },
    [coluna, fiscalInline, produto, salvando]
  )

  const handleKeyDownTexto = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        void fiscalInline.salvarCelulaAtiva()
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        fiscalInline.cancelarCelulaAtiva()
      }
    },
    [fiscalInline]
  )

  const handleBlurTexto = useCallback(() => {
    void fiscalInline.salvarCelulaAtiva()
  }, [fiscalInline])

  const handleChangeSelect = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const valor = event.target.value
      fiscalInline.setDraft(valor)
      void fiscalInline.salvarCelulaAtiva(valor)
    },
    [fiscalInline]
  )

  const handleChangeTexto = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value
      const valor =
        coluna === 'ncm' || coluna === 'cest' ? raw.replace(/\D/g, '') : raw
      fiscalInline.setDraft(valor)
    },
    [coluna, fiscalInline]
  )

  const colunaConfig = COLUNAS_FISCAL_GRID.find((c) => c.id === coluna)
  const alinharEsquerda = colunaConfig?.align === 'left'

  const baseClass =
    layout === 'grid'
      ? `hidden md:flex shrink-0 min-w-0 px-0.5 ${alinharEsquerda ? 'justify-start' : 'justify-center'} ${className}`
      : `flex flex-col gap-0.5 min-w-0 ${className}`

  const borderErro = erro ? 'ring-1 ring-red-500 border-red-400' : 'border-gray-200 focus:border-primary'
  const editavel = fiscalInline.enabled && !salvando

  if (!fiscalInline.enabled) {
    if (layout === 'mobile') {
      return (
        <div className={baseClass}>
          <span className="text-[10px] font-semibold uppercase text-secondary-text">
            {coluna === 'ncm'
              ? 'NCM'
              : coluna === 'cest'
                ? 'CEST'
                : coluna === 'origem'
                  ? 'Origem'
                  : coluna === 'tipo'
                    ? 'Tipo'
                    : 'Ind. Produção em Escala'}
          </span>
          <span
            className="font-mono text-xs text-primary-text truncate"
            title={tituloExibicao ?? (textoExibicao !== 'Nenhum' ? textoExibicao : undefined)}
          >
            {textoExibicao}
          </span>
        </div>
      )
    }

    return (
      <div className={`${baseClass} font-mono text-[11px] text-primary-text`}>
        <span
          className="truncate"
          title={tituloExibicao ?? (textoExibicao !== 'Nenhum' ? textoExibicao : undefined)}
        >
          {textoExibicao}
        </span>
      </div>
    )
  }

  if (ativa && config.tipo === 'select') {
    return (
      <div className={baseClass}>
        {layout === 'mobile' ? (
          <span className="text-[10px] font-semibold uppercase text-secondary-text">
            {coluna === 'origem' ? 'Origem' : coluna === 'tipo' ? 'Tipo' : 'Ind. Produção em Escala'}
          </span>
        ) : null}
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={draft}
          onChange={handleChangeSelect}
          onBlur={() => {
            window.setTimeout(() => {
              if (fiscalInline.isCelulaAtiva(produtoId, coluna) && !salvando) {
                fiscalInline.cancelarCelulaAtiva()
              }
            }, 200)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              fiscalInline.cancelarCelulaAtiva()
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full min-w-0 h-7 px-0.5 rounded border bg-white text-[10px] leading-tight text-primary-text focus:outline-none ${borderErro}`}
          disabled={salvando}
        >
          <option value="">Nenhum</option>
          {config.opcoes?.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (ativa && config.tipo === 'text') {
    return (
      <div className={baseClass}>
        {layout === 'mobile' ? (
          <span className="text-[10px] font-semibold uppercase text-secondary-text">
            {coluna === 'ncm' ? 'NCM' : 'CEST'}
          </span>
        ) : null}
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          inputMode="numeric"
          value={draft}
          maxLength={config.maxLength}
          onChange={handleChangeTexto}
          onKeyDown={handleKeyDownTexto}
          onBlur={handleBlurTexto}
          onClick={(e) => e.stopPropagation()}
          disabled={salvando}
          className={`w-full h-7 px-1 rounded border bg-white font-mono text-[11px] text-primary-text focus:outline-none ${borderErro}`}
          title={erro}
        />
      </div>
    )
  }

  const fonteCelula = COLUNAS_TEXTO_LONGO.has(coluna)
    ? 'text-[10px] leading-tight font-normal'
    : 'font-mono text-[11px]'

  const botaoExibicaoClass = `w-full min-w-0 h-7 px-0.5 rounded ${fonteCelula} text-primary-text transition-colors ${
    alinharEsquerda ? 'text-left' : 'text-center'
  } ${editavel ? 'hover:bg-primary/10 cursor-pointer' : 'cursor-default'} ${
    erro ? 'ring-1 ring-red-400' : ''
  }`

  if (layout === 'mobile') {
    return (
      <div className={baseClass}>
        <button
          type="button"
          onClick={handleAbrir}
          disabled={!editavel}
          className={`${botaoExibicaoClass} text-left py-0.5 ${
            !editavel ? 'opacity-70' : ''
          }`}
          title={erro ?? tituloExibicao ?? (textoExibicao !== 'Nenhum' ? textoExibicao : 'Clique para editar')}
        >
          <span className="text-[10px] font-semibold uppercase text-secondary-text block">
            {coluna === 'ncm'
              ? 'NCM'
              : coluna === 'cest'
                ? 'CEST'
                : coluna === 'origem'
                  ? 'Origem'
                  : coluna === 'tipo'
                    ? 'Tipo'
                    : 'Ind. Produção em Escala'}
          </span>
          <span className={`truncate block ${COLUNAS_TEXTO_LONGO.has(coluna) ? '' : 'font-mono text-xs'}`}>
            {salvando ? <span className="text-primary animate-pulse">… </span> : null}
            {textoExibicao}
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className={baseClass}>
      <button
        type="button"
        onClick={handleAbrir}
        disabled={!editavel}
        className={botaoExibicaoClass}
        title={erro ?? tituloExibicao ?? (textoExibicao !== 'Nenhum' ? textoExibicao : 'Clique para editar')}
      >
        <span className="block truncate">
          {salvando ? <span className="text-primary animate-pulse">… </span> : null}
          {textoExibicao}
        </span>
      </button>
    </div>
  )
}

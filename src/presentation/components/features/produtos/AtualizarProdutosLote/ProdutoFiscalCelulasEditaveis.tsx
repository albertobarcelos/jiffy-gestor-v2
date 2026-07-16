'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Produto } from '@/src/domain/entities/Produto'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  indicadoresProducao,
  origensMercadoria,
  tiposProduto,
} from '@/src/presentation/components/features/produtos/NovoProduto/fiscalSelectOptions'

export type FiscalCampoLinha =
  | 'ncm'
  | 'cest'
  | 'origemMercadoria'
  | 'tipoProduto'
  | 'indicadorProducaoEscala'

export type FiscalLinhaDraft = {
  ncm: string
  cest: string
  origemMercadoria: string
  tipoProduto: string
  indicadorProducaoEscala: string
}

type CestPorNcmItem = {
  codigo: string
  descricao: string
  segmento?: string
}

type ProdutoFiscalCelulasEditaveisProps = {
  produto: Produto
  variant: 'desktop' | 'mobile'
  disabled?: boolean
  salvando?: boolean
  onSalvarCampo: (produto: Produto, campo: FiscalCampoLinha, valor: string) => Promise<boolean>
}

const LABEL_OPCAO_MAX = 30

const inputClass =
  'h-9 w-full rounded-lg border border-secondary/20 bg-white px-2 font-mono text-xs text-primary-text shadow-sm transition-colors placeholder:text-secondary-text/50 hover:border-alternate/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60'

const selectClass =
  'h-9 w-full truncate rounded-lg border border-secondary/20 bg-white px-2 text-xs text-primary-text shadow-sm transition-colors hover:border-alternate/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60'

/** NCM 8 dígitos → `XXXX.XX.XX` */
export function formatarNcmExibicao(raw: string): string {
  const d = String(raw ?? '')
    .replace(/\D/g, '')
    .slice(0, 8)
  if (d.length <= 4) return d
  if (d.length <= 6) return `${d.slice(0, 4)}.${d.slice(4)}`
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`
}

/** CEST 7 dígitos → `XX.XXX.XX` */
export function formatarCestExibicao(raw: string): string {
  const d = String(raw ?? '')
    .replace(/\D/g, '')
    .slice(0, 7)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
}

function truncarLabelOpcao(label: string, max: number | null = LABEL_OPCAO_MAX): string {
  const t = label.trim()
  if (max == null || max <= 0 || t.length <= max) return t
  return `${t.slice(0, max)}…`
}

function labelCestOpcao(item: CestPorNcmItem): string {
  const base = `${item.codigo}${item.descricao ? ` — ${item.descricao}` : ''}`
  return truncarLabelOpcao(base, 40)
}

function valorCampo(produto: Produto, campo: FiscalCampoLinha): string {
  switch (campo) {
    case 'ncm':
      return produto.getNcm()
    case 'cest':
      return produto.getCest()
    case 'origemMercadoria':
      return produto.getOrigemMercadoria()
    case 'tipoProduto':
      return produto.getTipoProduto()
    case 'indicadorProducaoEscala':
      return produto.getIndicadorProducaoEscala() ?? ''
  }
}

function soDigitos(raw: string, maxLength: number): string {
  return String(raw ?? '')
    .replace(/\D/g, '')
    .slice(0, maxLength)
}

const cestsPorNcmCache = new Map<string, CestPorNcmItem[]>()
const cestsPorNcmInflight = new Map<string, Promise<CestPorNcmItem[]>>()

async function buscarCestsPorNcm(ncm: string, token: string): Promise<CestPorNcmItem[]> {
  const cached = cestsPorNcmCache.get(ncm)
  if (cached) return cached

  const inflight = cestsPorNcmInflight.get(ncm)
  if (inflight) return inflight

  const promise = (async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    try {
      const response = await fetch(
        `/api/v1/fiscal/configuracoes/cests/por-ncm/${encodeURIComponent(ncm)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        }
      )
      if (!response.ok) {
        cestsPorNcmCache.set(ncm, [])
        return []
      }
      const result = await response.json()
      const list = (Array.isArray(result) ? result : [])
        .map((item: Record<string, unknown>) => ({
          codigo: String(item.codigo ?? '')
            .replace(/\D/g, '')
            .slice(0, 7),
          descricao: String(item.descricao ?? '').trim(),
          segmento: item.segmento != null ? String(item.segmento) : undefined,
        }))
        .filter((item: CestPorNcmItem) => item.codigo.length === 7)
      cestsPorNcmCache.set(ncm, list)
      return list
    } catch {
      cestsPorNcmCache.set(ncm, [])
      return []
    } finally {
      clearTimeout(timeoutId)
      cestsPorNcmInflight.delete(ncm)
    }
  })()

  cestsPorNcmInflight.set(ncm, promise)
  return promise
}

/**
 * Máscara visual: estado interno só com dígitos (evita perder caracteres ao digitar).
 * Commit no blur apenas se completo ou se limpou; parcial restaura o valor anterior.
 */
function DigitosMascaradosInput({
  value,
  maxLength,
  disabled,
  ariaLabel,
  formatar,
  placeholder,
  onCommit,
}: {
  value: string
  maxLength: number
  disabled?: boolean
  ariaLabel: string
  formatar: (digits: string) => string
  placeholder?: string
  onCommit: (valor: string) => void
}) {
  const [digits, setDigits] = useState(() => soDigitos(value, maxLength))

  useEffect(() => {
    setDigits(soDigitos(value, maxLength))
  }, [value, maxLength])

  const commit = useCallback(() => {
    const atual = soDigitos(value, maxLength)
    const digitado = soDigitos(digits, maxLength)

    if (digitado === atual) {
      setDigits(atual)
      return
    }

    if (digitado.length > 0 && digitado.length < maxLength) {
      setDigits(atual)
      return
    }

    setDigits(digitado)
    onCommit(digitado)
  }, [digits, maxLength, onCommit, value])

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      aria-label={ariaLabel}
      value={formatar(digits)}
      disabled={disabled}
      placeholder={
        placeholder ?? (maxLength === 8 ? '0000.00.00' : '00.000.00')
      }
      className={inputClass}
      onClick={e => e.stopPropagation()}
      onChange={e => setDigits(soDigitos(e.target.value, maxLength))}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      onPaste={e => {
        e.preventDefault()
        const texto = e.clipboardData.getData('text') ?? ''
        setDigits(soDigitos(texto, maxLength))
      }}
    />
  )
}

function SelectFiscal({
  value,
  options,
  disabled,
  ariaLabel,
  emptyLabel = '—',
  maxLabelLength = LABEL_OPCAO_MAX,
  onCommit,
}: {
  value: string
  options: { value: string; label: string; title?: string }[]
  disabled?: boolean
  ariaLabel: string
  emptyLabel?: string
  /** `null` = texto completo (igual cadastro). */
  maxLabelLength?: number | null
  onCommit: (valor: string) => void
}) {
  const selecionada = options.find(o => o.value === value)
  const valorSelect =
    value && !options.some(o => o.value === value) ? value : value

  return (
    <select
      aria-label={ariaLabel}
      value={valorSelect}
      disabled={disabled}
      title={selecionada?.title || selecionada?.label || emptyLabel}
      className={selectClass}
      onClick={e => e.stopPropagation()}
      onChange={e => {
        const next = e.target.value
        if (next === value) return
        void onCommit(next)
      }}
    >
      <option value="">{emptyLabel}</option>
      {value && !options.some(o => o.value === value) ? (
        <option value={value} title={value}>
          {formatarCestExibicao(value)}
        </option>
      ) : null}
      {options.map(opt => (
        <option key={opt.value} value={opt.value} title={opt.title || opt.label}>
          {truncarLabelOpcao(opt.label, maxLabelLength)}
        </option>
      ))}
    </select>
  )
}

function useCestsPorNcm(ncmRaw: string) {
  const { auth } = useAuthStore()
  const ncm = soDigitos(ncmRaw, 8)
  const [cests, setCests] = useState<CestPorNcmItem[]>(() =>
    ncm.length === 8 ? cestsPorNcmCache.get(ncm) ?? [] : []
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (ncm.length !== 8) {
      setCests([])
      setLoading(false)
      return
    }

    const cached = cestsPorNcmCache.get(ncm)
    if (cached) {
      setCests(cached)
      setLoading(false)
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      setCests([])
      return
    }

    let cancelled = false
    setLoading(true)
    void buscarCestsPorNcm(ncm, token).then(list => {
      if (cancelled) return
      setCests(list)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [ncm, auth])

  return { cests, loading, ncmValido: ncm.length === 8 }
}

function CestCampoLinha({
  produto,
  busy,
  onSalvar,
  wide = false,
}: {
  produto: Produto
  busy: boolean
  onSalvar: (valor: string) => void
  wide?: boolean
}) {
  const ncm = produto.getNcm()
  const cest = produto.getCest()
  const { cests, loading, ncmValido } = useCestsPorNcm(ncm)
  const temLista = cests.length > 0

  if (temLista) {
    return (
      <SelectFiscal
        value={soDigitos(cest, 7)}
        options={cests.map(item => ({
          value: item.codigo,
          label: labelCestOpcao(item),
          title: `${item.codigo}${item.descricao ? ` — ${item.descricao}` : ''}${
            item.segmento ? ` — ${item.segmento}` : ''
          }`,
        }))}
        disabled={busy || !ncmValido}
        ariaLabel={`CEST do produto ${produto.getNome()}`}
        onCommit={onSalvar}
      />
    )
  }

  return (
    <DigitosMascaradosInput
      value={cest}
      maxLength={7}
      disabled={busy || loading || !ncmValido}
      ariaLabel={`CEST do produto ${produto.getNome()}`}
      formatar={formatarCestExibicao}
      placeholder={
        loading ? '...' : !ncmValido ? 'NCM primeiro' : wide ? '00.000.00' : '00.000.00'
      }
      onCommit={onSalvar}
    />
  )
}

function CampoMobile({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-alternate">
        {label}
      </label>
      {children}
    </div>
  )
}

export function ProdutoFiscalCelulasEditaveis({
  produto,
  variant,
  disabled = false,
  salvando = false,
  onSalvarCampo,
}: ProdutoFiscalCelulasEditaveisProps) {
  const busy = disabled || salvando

  const salvar = useCallback(
    (campo: FiscalCampoLinha, valor: string) => onSalvarCampo(produto, campo, valor),
    [onSalvarCampo, produto]
  )

  if (variant === 'mobile') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoMobile label="NCM">
          <DigitosMascaradosInput
            value={valorCampo(produto, 'ncm')}
            maxLength={8}
            disabled={busy}
            ariaLabel={`NCM do produto ${produto.getNome()}`}
            formatar={formatarNcmExibicao}
            onCommit={v => void salvar('ncm', v)}
          />
        </CampoMobile>
        <CampoMobile label="CEST">
          <CestCampoLinha
            produto={produto}
            busy={busy}
            wide
            onSalvar={v => void salvar('cest', v)}
          />
        </CampoMobile>
        <CampoMobile label="Origem">
          <SelectFiscal
            value={valorCampo(produto, 'origemMercadoria')}
            options={origensMercadoria}
            disabled={busy}
            ariaLabel={`Origem do produto ${produto.getNome()}`}
            onCommit={v => void salvar('origemMercadoria', v)}
          />
        </CampoMobile>
        <CampoMobile label="Tipo">
          <SelectFiscal
            value={valorCampo(produto, 'tipoProduto')}
            options={tiposProduto}
            disabled={busy}
            ariaLabel={`Tipo do produto ${produto.getNome()}`}
            onCommit={v => void salvar('tipoProduto', v)}
          />
        </CampoMobile>
        <CampoMobile label="Indicador">
          <SelectFiscal
            value={valorCampo(produto, 'indicadorProducaoEscala')}
            options={indicadoresProducao}
            disabled={busy}
            ariaLabel={`Indicador de produção do produto ${produto.getNome()}`}
            maxLabelLength={null}
            onCommit={v => void salvar('indicadorProducaoEscala', v)}
          />
        </CampoMobile>
      </div>
    )
  }

  return (
    <>
      <div className="hidden md:flex w-[108px] shrink-0 px-0.5">
        <DigitosMascaradosInput
          value={valorCampo(produto, 'ncm')}
          maxLength={8}
          disabled={busy}
          ariaLabel={`NCM do produto ${produto.getNome()}`}
          formatar={formatarNcmExibicao}
          onCommit={v => void salvar('ncm', v)}
        />
      </div>
      <div className="hidden lg:flex w-[168px] shrink-0 px-0.5">
        <CestCampoLinha
          produto={produto}
          busy={busy}
          onSalvar={v => void salvar('cest', v)}
        />
      </div>
      <div className="hidden lg:flex w-[200px] shrink-0 px-0.5">
        <SelectFiscal
          value={valorCampo(produto, 'origemMercadoria')}
          options={origensMercadoria}
          disabled={busy}
          ariaLabel={`Origem do produto ${produto.getNome()}`}
          onCommit={v => void salvar('origemMercadoria', v)}
        />
      </div>
      <div className="hidden lg:flex w-[200px] shrink-0 px-0.5">
        <SelectFiscal
          value={valorCampo(produto, 'tipoProduto')}
          options={tiposProduto}
          disabled={busy}
          ariaLabel={`Tipo do produto ${produto.getNome()}`}
          onCommit={v => void salvar('tipoProduto', v)}
        />
      </div>
      <div className="hidden lg:flex w-[240px] shrink-0 px-0.5">
        <SelectFiscal
          value={valorCampo(produto, 'indicadorProducaoEscala')}
          options={indicadoresProducao}
          disabled={busy}
          ariaLabel={`Indicador de produção do produto ${produto.getNome()}`}
          maxLabelLength={null}
          onCommit={v => void salvar('indicadorProducaoEscala', v)}
        />
      </div>
    </>
  )
}

'use client'

import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { Autocomplete, Popover, TextField, Tooltip } from '@mui/material'
import { MdList, MdNotes, MdStar, MdStarBorder } from 'react-icons/md'
import { useGruposComplementos } from '@/src/presentation/hooks/useGruposComplementos'
import { cn } from '@/src/shared/utils/cn'
import type { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import type { MenuProduto, UpdateMenuProdutoInput } from '@/src/shared/types/menus'

const ROW_ICON_BTN =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-secondary/60 bg-white text-secondary transition-colors hover:bg-secondary/10'

function RowIconButton({
  title,
  active,
  onClick,
  disabled,
  children,
}: {
  title: string
  active?: boolean
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip title={title} arrow placement="top">
      <button
        type="button"
        disabled={disabled}
        onClick={e => {
          e.stopPropagation()
          onClick(e)
        }}
        className={cn(
          ROW_ICON_BTN,
          active && 'border-secondary bg-secondary text-white hover:bg-secondary'
        )}
      >
        {children}
      </button>
    </Tooltip>
  )
}

function sameIdList(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((id, i) => id === sb[i])
}

export interface MenuProdutoRowQuickActionsProps {
  produto: MenuProduto
  disabled?: boolean
  /** Retorna `false` se o usuário cancelar ou se o patch falhar. */
  onPatch: (
    produtoId: string,
    input: UpdateMenuProdutoInput
  ) => boolean | Promise<boolean>
}

/** Ícones rápidos (complementos, descrição, favorito) na lista do cardápio. */
export function MenuProdutoRowQuickActions({
  produto,
  disabled,
  onPatch,
}: MenuProdutoRowQuickActionsProps) {
  const { data: gruposComplementos = [], isLoading: loadingComplementos } =
    useGruposComplementos()

  const complementosIniciais = useMemo(
    () => (produto.gruposComplementos ?? []).map(g => g.id).filter(Boolean),
    [produto.gruposComplementos]
  )

  const [favorito, setFavorito] = useState(produto.favorito)
  const [descricao, setDescricao] = useState(produto.descricao ?? '')
  const [gruposComplementosIds, setGruposComplementosIds] =
    useState<string[]>(complementosIniciais)
  const [complAnchor, setComplAnchor] = useState<HTMLElement | null>(null)
  const [descAnchor, setDescAnchor] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setFavorito(produto.favorito)
    setDescricao(produto.descricao ?? '')
    setGruposComplementosIds(complementosIniciais)
  }, [produto.favorito, produto.descricao, complementosIniciais])

  const complementosSelecionados = useMemo(() => {
    const byId = new Map(gruposComplementos.map(g => [g.getId(), g]))
    return gruposComplementosIds
      .map(id => byId.get(id))
      .filter((g): g is GrupoComplemento => Boolean(g))
  }, [gruposComplementos, gruposComplementosIds])

  const fecharComplementos = () => {
    setComplAnchor(null)
    if (sameIdList(gruposComplementosIds, complementosIniciais)) return
    void (async () => {
      const ok = await onPatch(produto.produtoId, { gruposComplementosIds })
      if (!ok) setGruposComplementosIds(complementosIniciais)
    })()
  }

  const fecharDescricao = () => {
    setDescAnchor(null)
    const next = descricao.trim() || null
    const prev = (produto.descricao ?? '').trim() || null
    if (next === prev) return
    void (async () => {
      const ok = await onPatch(produto.produtoId, { descricao: next })
      if (!ok) setDescricao(produto.descricao ?? '')
    })()
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <RowIconButton
          title={
            gruposComplementosIds.length > 0
              ? `Complementos (${gruposComplementosIds.length})`
              : 'Grupos de complementos'
          }
          active={gruposComplementosIds.length > 0}
          disabled={disabled}
          onClick={e => setComplAnchor(e.currentTarget)}
        >
          <MdList className="text-lg" />
        </RowIconButton>
        <RowIconButton
          title={descricao.trim() ? 'Editar descrição' : 'Adicionar descrição'}
          active={Boolean(descricao.trim())}
          disabled={disabled}
          onClick={e => setDescAnchor(e.currentTarget)}
        >
          <MdNotes className="text-lg" />
        </RowIconButton>
        <RowIconButton
          title={favorito ? 'Remover dos favoritos' : 'Marcar como favorito'}
          active={favorito}
          disabled={disabled}
          onClick={() => {
            const next = !favorito
            void (async () => {
              const ok = await onPatch(produto.produtoId, { favorito: next })
              if (ok) setFavorito(next)
            })()
          }}
        >
          {favorito ? <MdStar className="text-lg" /> : <MdStarBorder className="text-lg" />}
        </RowIconButton>
      </div>

      <Popover
        open={Boolean(complAnchor)}
        anchorEl={complAnchor}
        onClose={fecharComplementos}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <div className="w-[min(420px,92vw)] p-3" onClick={e => e.stopPropagation()}>
          <p className="mb-2 text-xs font-semibold text-primary-text">Grupos de complementos</p>
          <Autocomplete<GrupoComplemento, true, false, false>
            multiple
            size="small"
            options={gruposComplementos}
            loading={loadingComplementos}
            value={complementosSelecionados}
            onChange={(_, value) =>
              setGruposComplementosIds(value.map(g => g.getId()).filter(Boolean))
            }
            getOptionLabel={option => option.getNome()}
            getOptionKey={option => option.getId()}
            isOptionEqualToValue={(a, b) => a.getId() === b.getId()}
            disabled={disabled}
            renderInput={params => (
              <TextField {...params} placeholder="Selecionar grupos" size="small" />
            )}
          />
        </div>
      </Popover>

      <Popover
        open={Boolean(descAnchor)}
        anchorEl={descAnchor}
        onClose={fecharDescricao}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <div className="w-[min(420px,92vw)] p-3" onClick={e => e.stopPropagation()}>
          <p className="mb-2 text-xs font-semibold text-primary-text">Descrição neste cardápio</p>
          <TextField
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            disabled={disabled}
            multiline
            minRows={3}
            fullWidth
            size="small"
            placeholder="Descrição exibida neste menu"
          />
        </div>
      </Popover>
    </>
  )
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useCbenef } from '@/src/presentation/hooks/painel-contador/useCbenef'
import type { CbenefItemDTO } from '@/src/application/dto/painel-contador/PainelContadorDTO'
import {
  isCstIcmsBeneficio,
  isLiteralSemCbenef,
  LITERAL_SEM_CBENEF,
  normalizarCstIcms,
  UF_CBENEF_OBRIGATORIO,
} from '@/src/domain/entities/painel-contador/cbenefRegras'

interface BuscarCbenefModalProps {
  open: boolean
  onClose: () => void
  onSelect: (item: CbenefItemDTO) => void
  uf: string
  /** CST enviado ao backend — só CST de benefício (20/40/41/50/51). */
  cst?: string
  /** CST escolhido no formulário, mesmo quando não filtra a API. */
  cstSelecionado?: string
  /** Texto já digitado no campo — preenche o filtro ao abrir. */
  filtroInicial?: string
}

function opcaoSemCbenef(uf: string): CbenefItemDTO {
  const isSp = uf.trim().toUpperCase() === UF_CBENEF_OBRIGATORIO
  return {
    codigo: LITERAL_SEM_CBENEF,
    descricao: isSp
      ? 'Sem benefício fiscal. Em SP a SEFAZ exige código específico desde 01/07/2026.'
      : 'Sem código de benefício fiscal',
    uf,
  }
}

export function BuscarCbenefModal({
  open,
  onClose,
  onSelect,
  uf,
  cst,
  cstSelecionado,
  filtroInicial = '',
}: BuscarCbenefModalProps) {
  const { listQuery } = useCbenef(uf, cst, open)
  const [filtro, setFiltro] = useState('')
  const filtroInputRef = useRef<HTMLInputElement>(null)
  const itens = listQuery.data ?? []
  const cstForm = normalizarCstIcms(cstSelecionado)
  const cstNaoUsaCbenef = Boolean(cstForm) && !isCstIcmsBeneficio(cstForm)

  const focarFiltro = () => {
    const el = filtroInputRef.current
    if (!el) return
    el.focus()
    const fim = el.value.length
    el.setSelectionRange(fim, fim)
  }

  useEffect(() => {
    if (open) setFiltro(filtroInicial)
  }, [open, filtroInicial])

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(focarFiltro, 50)
    return () => window.clearTimeout(id)
  }, [open])

  const itensComSemCbenef = useMemo(() => {
    const sem = opcaoSemCbenef(uf)
    const catalogo = itens.filter((item) => !isLiteralSemCbenef(item.codigo))
    return [sem, ...catalogo]
  }, [itens, uf])

  const filtrados = useMemo(() => {
    const q = filtro.trim().toUpperCase()
    const catalogo = itensComSemCbenef.filter((item) => !isLiteralSemCbenef(item.codigo))
    const sem = itensComSemCbenef.find((item) => isLiteralSemCbenef(item.codigo))
    const catalogoFiltrado = q
      ? catalogo.filter(
          (item) =>
            item.codigo.toUpperCase().includes(q) || item.descricao.toUpperCase().includes(q)
        )
      : catalogo
    return sem ? [sem, ...catalogoFiltrado] : catalogoFiltrado
  }, [filtro, itensComSemCbenef])

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      maxWidth="md"
      fullWidth
      disableAutoFocus
      disableRestoreFocus
      slotProps={{
        transition: { onEntered: focarFiltro },
      }}
    >
      <DialogContent sx={{ p: 3, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <DialogTitle sx={{ p: 0, mb: 2, fontWeight: 600 }}>
          Códigos de Benefício Fiscal ({uf || '--'}
          {cst ? ` · CST ${cst}` : ''})
        </DialogTitle>

        {cstNaoUsaCbenef ? (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            CST {cstForm} (tributação integral ou sem benefício) não usa cBenef. A lista abaixo é
            da UF inteira, para consulta. Códigos de benefício existem para CST 20, 40, 41, 50 e 51.
          </p>
        ) : null}

        <Input
          size="small"
          inputRef={filtroInputRef}
          placeholder="Filtrar por código ou descrição"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-md border border-gray-200">
          {listQuery.isError && itens.length === 0 ? (
            <div>
              <TabelaCbenef
                itens={[opcaoSemCbenef(uf)]}
                onSelect={(item) => {
                  onSelect(item)
                  onClose()
                }}
              />
              <p className="p-4 text-sm text-red-700">
                Não foi possível carregar o restante da tabela cBenef.{' '}
                {listQuery.error.message || 'A rota ainda não está disponível no backend (404).'}
              </p>
            </div>
          ) : (
            <TabelaCbenef
              itens={filtrados}
              carregando={listQuery.isLoading}
              onSelect={(item) => {
                onSelect(item)
                onClose()
              }}
            />
          )}
        </div>

        <DialogFooter sx={{ mt: 2, p: 0 }}>
          <Button type="button" variant="outlined" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TabelaCbenef({
  itens,
  carregando,
  onSelect,
}: {
  itens: CbenefItemDTO[]
  carregando?: boolean
  onSelect: (item: CbenefItemDTO) => void
}) {
  return (
    <table className="w-full border-separate border-spacing-0 text-sm">
      <thead>
        <tr>
          <th className="sticky top-0 z-10 bg-white px-3 py-2 text-left font-semibold text-alternate shadow-[inset_0_-1px_0_#e5e7eb]">
            Código
          </th>
          <th className="sticky top-0 z-10 bg-white px-3 py-2 text-left font-semibold text-alternate shadow-[inset_0_-1px_0_#e5e7eb]">
            Descrição
          </th>
          <th className="sticky top-0 z-10 bg-white px-3 py-2 text-left font-semibold text-alternate shadow-[inset_0_-1px_0_#e5e7eb]">
            CST
          </th>
        </tr>
      </thead>
      <tbody>
        {itens.map((item) => (
            <tr
              key={item.codigo}
              className="cursor-pointer hover:bg-alternate/10"
              onClick={() => onSelect(item)}
            >
              <td className="border-t border-gray-100 px-3 py-2 font-medium whitespace-nowrap">
                {item.codigo}
              </td>
              <td className="border-t border-gray-100 px-3 py-2">{item.descricao}</td>
              <td className="border-t border-gray-100 px-3 py-2 whitespace-nowrap">
                {item.cstIcmsCompativel || item.cstIcms || '--'}
              </td>
            </tr>
        ))}
        {carregando ? (
          <tr>
            <td colSpan={3} className="py-8">
              <div className="flex justify-center">
                <JiffyLoading />
              </div>
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  )
}

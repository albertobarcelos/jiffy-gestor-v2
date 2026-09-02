'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import type { AreaEntregaDTO } from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import {
  areaEntregaFormValidator,
  areaEntregaToFormValues,
  type AreaEntregaFormValues,
} from '@/src/application/dto/delivery/CoberturaEntregaDTO'

type AreaEntregaFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  area?: AreaEntregaDTO | null
  salvando?: boolean
  onSubmit: (values: AreaEntregaFormValues) => Promise<void>
}

const VALORES_PADRAO: AreaEntregaFormValues = {
  nome: '',
  valorTaxa: 8,
  tempoEntregaInMinutes: 45,
  ativo: true,
}

function parseNumeroInput(value: string): number | undefined {
  const normalizado = value.replace(',', '.').trim()
  if (!normalizado) return undefined
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : undefined
}

export function AreaEntregaFormModal({
  open,
  onOpenChange,
  area,
  salvando = false,
  onSubmit,
}: AreaEntregaFormModalProps) {
  const editando = Boolean(area)
  const [values, setValues] = useState<AreaEntregaFormValues>(VALORES_PADRAO)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setErro(null)
    setValues(area ? areaEntregaToFormValues(area) : VALORES_PADRAO)
  }, [open, area])

  const handleSubmit = useCallback(async () => {
    const parsed = areaEntregaFormValidator.safeParse(values)
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    setErro(null)
    await onSubmit(parsed.data)
  }, [onSubmit, values])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar área de entrega' : 'Nova área de entrega'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!editando ? (
            <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              A forma desenhada no mapa será salva junto com a taxa e o tempo abaixo.
            </p>
          ) : null}

          <div>
            <label htmlFor="area-nome" className="mb-1 block text-xs font-semibold text-secondary-text">
              Nome (opcional)
            </label>
            <input
              id="area-nome"
              type="text"
              value={values.nome ?? ''}
              onChange={e => setValues(v => ({ ...v, nome: e.target.value }))}
              placeholder="Ex.: Bairro Centro"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
              disabled={salvando}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="area-taxa"
                className="mb-1 block text-xs font-semibold text-secondary-text"
              >
                Taxa de entrega (R$)
              </label>
              <input
                id="area-taxa"
                type="number"
                min={0}
                step={0.01}
                value={values.valorTaxa}
                onChange={e =>
                  setValues(v => ({
                    ...v,
                    valorTaxa: parseNumeroInput(e.target.value) ?? v.valorTaxa,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                disabled={salvando}
              />
            </div>

            <div>
              <label
                htmlFor="area-tempo"
                className="mb-1 block text-xs font-semibold text-secondary-text"
              >
                Tempo (min)
              </label>
              <input
                id="area-tempo"
                type="number"
                min={0}
                step={1}
                value={values.tempoEntregaInMinutes}
                onChange={e =>
                  setValues(v => ({
                    ...v,
                    tempoEntregaInMinutes:
                      parseNumeroInput(e.target.value) ?? v.tempoEntregaInMinutes,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                disabled={salvando}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-primary-text">Área ativa</p>
              <p className="text-xs text-secondary-text">
                Apenas áreas ativas entram na cotação de frete.
              </p>
            </div>
            <JiffyIconSwitch
              checked={values.ativo}
              onChange={e => setValues(v => ({ ...v, ativo: e.target.checked }))}
              disabled={salvando}
              inputProps={{ 'aria-label': 'Área ativa' }}
            />
          </div>

          {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-secondary-text hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={salvando}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar área'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

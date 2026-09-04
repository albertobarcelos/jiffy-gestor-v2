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
import type { RaioEntregaDTO } from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import {
  raioEntregaFormValidator,
  raioEntregaFormToCreateInput,
  raioEntregaFormToUpdateInput,
  raioEntregaToFormValues,
  type RaioEntregaFormValues,
} from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import { formatBRLFromMaskedInput, parseBRLToNumber } from '@/src/shared/utils/formatters'

type RaioEntregaFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  raio?: RaioEntregaDTO | null
  salvando?: boolean
  onSubmit: (values: RaioEntregaFormValues) => Promise<void>
}

const VALORES_PADRAO: RaioEntregaFormValues = {
  nome: '',
  distanciaMetros: 1000,
  valorTaxa: 8,
  tempoEntregaInMinutes: 45,
  ativo: true,
}

function parseInteiroPositivoInput(value: string): number | undefined {
  const digitos = value.replace(/\D/g, '')
  if (!digitos) return undefined
  const n = Number(digitos)
  return Number.isFinite(n) ? n : undefined
}

function parseNumeroInput(value: string): number | undefined {
  const normalizado = value.replace(',', '.').trim()
  if (!normalizado) return undefined
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : undefined
}

export function RaioEntregaFormModal({
  open,
  onOpenChange,
  raio,
  salvando = false,
  onSubmit,
}: RaioEntregaFormModalProps) {
  const editando = Boolean(raio)
  const [values, setValues] = useState<RaioEntregaFormValues>(VALORES_PADRAO)
  const [valorTaxaTexto, setValorTaxaTexto] = useState(() =>
    formatBRLFromMaskedInput(VALORES_PADRAO.valorTaxa)
  )
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setErro(null)
    const next = raio ? raioEntregaToFormValues(raio) : VALORES_PADRAO
    setValues(next)
    setValorTaxaTexto(formatBRLFromMaskedInput(next.valorTaxa))
  }, [open, raio])

  const handleTaxaChange = useCallback((raw: string) => {
    const formatado = formatBRLFromMaskedInput(raw)
    setValorTaxaTexto(formatado)
    const parsed = parseBRLToNumber(formatado)
    setValues(v => ({
      ...v,
      valorTaxa: parsed != null && parsed >= 0 ? parsed : 0,
    }))
  }, [])

  const handleSubmit = useCallback(async () => {
    const parsed = raioEntregaFormValidator.safeParse(values)
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    setErro(null)
    if (editando) {
      raioEntregaFormToUpdateInput(parsed.data)
    } else {
      raioEntregaFormToCreateInput(parsed.data)
    }
    await onSubmit(parsed.data)
  }, [editando, onSubmit, values])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar raio de entrega' : 'Novo raio de entrega'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label htmlFor="raio-nome" className="mb-1 block text-xs font-semibold text-secondary-text">
              Nome (opcional)
            </label>
            <input
              id="raio-nome"
              type="text"
              value={values.nome ?? ''}
              onChange={e => setValues(v => ({ ...v, nome: e.target.value }))}
              placeholder="Ex.: Região central"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
              disabled={salvando}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="raio-distancia"
                className="mb-1 block text-xs font-semibold text-secondary-text"
              >
                Distância máxima (m)
              </label>
              <input
                id="raio-distancia"
                type="text"
                inputMode="numeric"
                value={String(values.distanciaMetros)}
                onChange={e => {
                  const parsed = parseInteiroPositivoInput(e.target.value)
                  setValues(v => ({
                    ...v,
                    distanciaMetros: parsed ?? 0,
                  }))
                }}
                onFocus={e => e.target.select()}
                placeholder="1000"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                disabled={salvando}
                aria-label="Distância máxima em metros"
              />
            </div>

            <div>
              <label
                htmlFor="raio-tempo"
                className="mb-1 block text-xs font-semibold text-secondary-text"
              >
                Tempo (min)
              </label>
              <input
                id="raio-tempo"
                type="number"
                min={0}
                step={5}
                value={values.tempoEntregaInMinutes}
                onChange={e =>
                  setValues(v => ({
                    ...v,
                    tempoEntregaInMinutes:
                      parseNumeroInput(e.target.value) ?? v.tempoEntregaInMinutes,
                  }))
                }
                onFocus={e => e.target.select()}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                disabled={salvando}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="raio-taxa"
              className="mb-1 block text-xs font-semibold text-secondary-text"
            >
              Taxa de entrega
            </label>
            <input
              id="raio-taxa"
              type="text"
              inputMode="numeric"
              value={valorTaxaTexto}
              onChange={e => handleTaxaChange(e.target.value)}
              onFocus={e => e.target.select()}
              onClick={e => e.currentTarget.select()}
              onMouseUp={e => e.preventDefault()}
              placeholder="R$ 0,00"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
              disabled={salvando}
              aria-label="Taxa de entrega em reais"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-primary-text">Raio ativo</p>
              <p className="text-xs text-secondary-text">
                Apenas raios ativos entram na cotação de frete.
              </p>
            </div>
            <JiffyIconSwitch
              checked={values.ativo}
              onChange={e => setValues(v => ({ ...v, ativo: e.target.checked }))}
              disabled={salvando}
              inputProps={{ 'aria-label': 'Raio ativo' }}
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
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar raio'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

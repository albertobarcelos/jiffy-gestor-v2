'use client'

import { useCallback } from 'react'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import {
  useFuncionamentoDelivery,
  useToggleFuncionamentoManual,
} from '@/src/presentation/hooks/useFuncionamentoDelivery'
import { showToast } from '@/src/shared/utils/toast'
import { LABEL_MOTIVO_DISPONIBILIDADE } from '@/src/shared/utils/funcionamentoDelivery'
import { cn } from '@/src/shared/utils/cn'

type LojaAbertaToggleProps = {
  className?: string
}

/**
 * Toggle operacional de abrir/fechar a loja (delivery) na tela de pedidos.
 */
export function LojaAbertaToggle({ className }: LojaAbertaToggleProps) {
  const empresaQuery = useEmpresaDeliveryMe()
  const configurada = empresaQuery.data != null
  const funcionamentoQuery = useFuncionamentoDelivery({ enabled: configurada })
  const toggleMutation = useToggleFuncionamentoManual()

  const handleToggle = useCallback(async () => {
    try {
      const result = await toggleMutation.mutateAsync()
      showToast.success(result.aberta ? 'Loja aberta manualmente.' : 'Loja fechada manualmente.')
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Não foi possível alterar o status da loja.'
      showToast.error(msg)
    }
  }, [toggleMutation])

  if (!configurada || funcionamentoQuery.isPending || funcionamentoQuery.isError) {
    return null
  }

  const aberta = funcionamentoQuery.data?.aberta ?? true
  const motivo = funcionamentoQuery.data?.motivo
  const motivoLabel = motivo ? LABEL_MOTIVO_DISPONIBILIDADE[motivo] : undefined
  const title = motivoLabel
    ? `${aberta ? 'Loja aberta' : 'Loja fechada'} — ${motivoLabel}`
    : aberta
      ? 'Loja aberta'
      : 'Loja fechada'

  return (
    <div className={cn('flex h-8 items-center rounded-lg border border-gray-200 bg-white px-2', className)}>
      <JiffyIconSwitch
        checked={aberta}
        onChange={() => void handleToggle()}
        disabled={toggleMutation.isPending}
        size="xs"
        labelPosition="end"
        label={
          <span className="whitespace-nowrap text-xs font-semibold text-primary-text">
            {toggleMutation.isPending ? 'Alterando...' : aberta ? 'Loja aberta' : 'Loja fechada'}
          </span>
        }
        inputProps={{
          'aria-label': aberta ? 'Fechar loja agora' : 'Abrir loja agora',
          title,
        }}
      />
    </div>
  )
}

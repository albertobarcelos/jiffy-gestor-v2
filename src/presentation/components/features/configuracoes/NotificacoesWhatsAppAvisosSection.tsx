'use client'

import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { showToast } from '@/src/shared/utils/toast'
import {
  LABEL_NOTIFICACAO_WHATSAPP,
  type TipoNotificacaoWhatsAppDelivery,
} from '@/src/application/dto/delivery/NotificacaoWhatsAppDeliveryDTO'
import {
  useNotificacoesWhatsAppDelivery,
  useUpsertNotificacaoWhatsAppDelivery,
} from '@/src/presentation/hooks/useNotificacoesWhatsAppDelivery'

export function NotificacoesWhatsAppAvisosSection({
  canalConectado,
}: {
  canalConectado: boolean
}) {
  const listaQuery = useNotificacoesWhatsAppDelivery({ enabled: true })
  const upsert = useUpsertNotificacaoWhatsAppDelivery()

  const alterar = (tipo: TipoNotificacaoWhatsAppDelivery, ativo: boolean) => {
    if (!canalConectado || upsert.isPending) return
    upsert.mutate(
      { tipo, ativo },
      {
        onError: erro => {
          showToast.error(erro instanceof Error ? erro.message : 'Não foi possível salvar o aviso.')
        },
      }
    )
  }

  if (listaQuery.isPending) {
    return (
      <div className="flex justify-center py-6">
        <JiffyLoading size={40} className="py-4" />
      </div>
    )
  }

  if (listaQuery.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <p>{listaQuery.error.message}</p>
        <button
          type="button"
          onClick={() => void listaQuery.refetch()}
          className="mt-2 text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  const lista = listaQuery.data ?? []

  return (
    <div className="mt-4">
      {!canalConectado ? (
        <p className="mb-3 text-xs font-medium text-secondary">
          Conecte o WhatsApp acima para ligar ou desligar os avisos.
        </p>
      ) : null}
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
        {lista.map(item => {
          const label = LABEL_NOTIFICACAO_WHATSAPP[item.tipoNotificacao]
          return (
            <li
              key={item.tipoNotificacao}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <span className="text-sm text-primary-text">{label}</span>
              <JiffyIconSwitch
                checked={item.ativo}
                disabled={!canalConectado || upsert.isPending}
                size="sm"
                onChange={e => alterar(item.tipoNotificacao, e.target.checked)}
                inputProps={{ 'aria-label': label }}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

import type { AvisoNotificacaoWhatsApp } from '@/src/application/mappers/avisoNotificacaoWhatsAppEtapa'

export function AvisoNotificacaoWhatsAppPedido({
  aviso,
}: {
  aviso: AvisoNotificacaoWhatsApp | null
}) {
  if (!aviso) return null

  return (
    <p
      className={
        aviso.resultado === 'sucesso'
          ? 'px-1 text-center text-[11px] leading-tight font-medium text-green-700'
          : 'px-1 text-center text-[11px] leading-tight font-medium text-amber-700'
      }
    >
      {aviso.texto}
    </p>
  )
}

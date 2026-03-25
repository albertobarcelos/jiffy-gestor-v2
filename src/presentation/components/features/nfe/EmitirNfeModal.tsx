'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogFooter } from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { useEmitirNfe, useEmitirNfeGestor } from '@/src/presentation/hooks/useVendas'
import { showToast } from '@/src/shared/utils/toast'
import { MdClose } from 'react-icons/md'

/** Aplica máscara de CPF (000.000.000-00) durante a digitação — apenas UI. */
function formatarCpfMascara(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11)
  if (digitos.length <= 3) return digitos
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`
  if (digitos.length <= 9) {
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`
  }
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`
}

interface EmitirNfeModalProps {
  open: boolean
  onClose: () => void
  vendaId: string
  vendaNumero?: string
  /** Origem comercial da venda (ex.: PDV, GESTOR) — exibida antes do código */
  origemVenda?: string | null
  codigoVenda?: string
  /** Nome do cliente para exibição */
  clienteNome?: string | null
  /** ID do cliente vinculado — NF-e (modelo 55) exige cliente cadastrado */
  clienteId?: string | null
  tabelaOrigem?: 'venda' | 'venda_gestor'
}

export function EmitirNfeModal({
  open,
  onClose,
  vendaId,
  vendaNumero,
  origemVenda,
  codigoVenda,
  clienteNome,
  clienteId,
  tabelaOrigem = 'venda',
}: EmitirNfeModalProps) {
  const emitirNfePdv = useEmitirNfe()
  const emitirNfeGestor = useEmitirNfeGestor()

  const emitirNfe = tabelaOrigem === 'venda_gestor' ? emitirNfeGestor : emitirNfePdv
  const [emissaoEmProcessamento, setEmissaoEmProcessamento] = useState(false)
  const [modeloEmitindo, setModeloEmitindo] = useState<55 | 65 | null>(null)
  /** CPF do consumidor para NFC-e (UI preparada; envio ao backend pendente). */
  const [cpfNfce, setCpfNfce] = useState('')

  useEffect(() => {
    if (!open) setCpfNfce('')
  }, [open])

  const temClienteCadastrado = useMemo(
    () => Boolean(clienteId && String(clienteId).trim() !== ''),
    [clienteId]
  )

  const nomeClienteExibicao = clienteNome?.trim() || 'Sem cliente'

  const emitirPorModelo = useCallback(
    async (modelo: 55 | 65) => {
      if (emissaoEmProcessamento || emitirNfe.isPending) return

      if (modelo === 55 && !temClienteCadastrado) {
        showToast.error(
          'Para emitir NF-e (modelo 55) é obrigatório que a venda tenha um cliente cadastrado. Associe um cliente à venda e tente novamente.'
        )
        return
      }

      setEmissaoEmProcessamento(true)
      setModeloEmitindo(modelo)

      try {
        await emitirNfe.mutateAsync({
          id: vendaId,
          modelo,
        })
        onClose()
      } catch (error) {
        console.error('Erro ao emitir NFe:', error)
      } finally {
        setEmissaoEmProcessamento(false)
        setModeloEmitindo(null)
      }
    },
    [emissaoEmProcessamento, emitirNfe, onClose, temClienteCadastrado, vendaId]
  )

  const bloqueado = emissaoEmProcessamento || emitirNfe.isPending

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent sx={{ maxWidth: 520, padding: '0px 24px 24px 24px' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-primary font-exo font-bold text-lg sm:text-2xl py-4">Emitir Nota</h1>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: '50%',
                border: 'none',
                background: 'transparent',
              }}
            >
              <MdClose size={20} />
            </button>
        </div>

        <div className="space-y-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-2 text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-800">
              {vendaNumero != null && vendaNumero !== '' && (
                <span>
                  <span className="font-medium text-gray-600">Nº da venda:</span> {vendaNumero}
                </span>
              )}
              {origemVenda != null && String(origemVenda).trim() !== '' && (
                <span>
                  <span className="font-medium text-gray-600">Origem:</span> {origemVenda}
                </span>
              )}
              {codigoVenda != null && codigoVenda !== '' && (
                <span>
                  <span className="font-medium text-gray-600">Código:</span> #{codigoVenda}
                </span>
              )}
            </div>
            <p className="mt-2 text-gray-800">
              <span className="font-medium text-gray-600">Cliente:</span> {nomeClienteExibicao}
            </p>
          </div>

          {!temClienteCadastrado && (
            <div
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950"
              role="alert"
            >
              <p className="font-semibold text-amber-900">NF-e não pode ser emitida.</p>
              <p className="mt-1 leading-relaxed">
                O modelo <strong>NF-e</strong> exige que a venda
                possua um <strong>cliente vinculado à venda</strong>. 
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              disabled={bloqueado || !temClienteCadastrado}
              onClick={() => void emitirPorModelo(55)}
              title={
                !temClienteCadastrado
                  ? 'Cadastre um cliente na venda para emitir NF-e'
                  : 'Emitir NF-e'
              }
              className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border-2 border-primary bg-primary p-6 text-center shadow-sm transition-all hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-3xl font-extrabold tracking-tight text-info sm:text-4xl">
                NF-e
              </span>
              <span className="mt-2 max-w-[12rem] text-xs font-medium leading-snug text-gray-200 sm:text-sm">
                Nota Fiscal eletrônica
              </span>
              {bloqueado && modeloEmitindo === 55 && (
                <span className="mt-2 text-xs font-medium text-primary">Emitindo...</span>
              )}
            </button>

            <div className="flex min-h-[160px] flex-col rounded-xl border-2 border-primary bg-white p-4 text-center shadow-sm sm:p-5">
              <div className="flex flex-1 flex-col items-center justify-center">
                <span className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
                  NFC-e
                </span>
                <span className="mt-2 max-w-[14rem] text-xs font-medium leading-snug text-gray-600 sm:text-sm">
                  Nota Fiscal de Consumidor Eletrônica
                </span>
              </div>
              <div className="mt-4 w-full text-left">
                <Input
                  label="CPF do consumidor"
                  placeholder="000.000.000-00"
                  size="small"
                  value={cpfNfce}
                  onChange={e => setCpfNfce(formatarCpfMascara(e.target.value))}
                  inputProps={{ inputMode: 'numeric', autoComplete: 'off' }}
                  disabled={bloqueado}
                />
              </div>
              <button
                type="button"
                disabled={bloqueado}
                onClick={() => void emitirPorModelo(65)}
                title="Emitir NFC-e"
                className="mt-4 w-full rounded-lg border-2 border-primary bg-primary py-2.5 text-sm font-semibold text-info shadow-sm transition-all hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bloqueado && modeloEmitindo === 65 ? 'Emitindo...' : 'Emitir NFC-e'}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter sx={{ mt: 2, justifyContent: 'flex-end' }}>
          <Button type="button" variant="outlined" onClick={onClose} disabled={bloqueado}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

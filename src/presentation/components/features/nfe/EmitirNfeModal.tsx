'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogFooter } from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { useEmitirNfe, useEmitirNfeGestor, useVincularClienteNaVenda } from '@/src/presentation/hooks/useVendas'
import { showToast } from '@/src/shared/utils/toast'
import { MdClose } from 'react-icons/md'
import { SeletorClienteModal } from '@/src/presentation/components/features/nfe/SeletorClienteModal'
import { Cliente } from '@/src/domain/entities/Cliente'

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
  const vincularCliente = useVincularClienteNaVenda()
  const [emissaoEmProcessamento, setEmissaoEmProcessamento] = useState(false)
  const [modeloEmitindo, setModeloEmitindo] = useState<55 | 65 | null>(null)
  /** CPF do consumidor para NFC-e (UI preparada; envio ao backend pendente). */
  const [cpfNfce, setCpfNfce] = useState('')
  const [seletorClienteOpen, setSeletorClienteOpen] = useState(false)
  /** Após vincular no modal, atualiza exibição até o pai refetch (props). */
  const [clienteVinculadoLocal, setClienteVinculadoLocal] = useState<{
    id: string
    nome: string
  } | null>(null)

  useEffect(() => {
    if (!open) {
      setCpfNfce('')
      setClienteVinculadoLocal(null)
    }
  }, [open])

  const temClienteCadastrado = useMemo(() => {
    const id = clienteVinculadoLocal?.id ?? clienteId
    return Boolean(id && String(id).trim() !== '')
  }, [clienteId, clienteVinculadoLocal])

  const nomeClienteExibicao =
    clienteVinculadoLocal?.nome?.trim() || clienteNome?.trim() || 'Sem cliente'

  const handleClienteSelecionado = async (cliente: Cliente) => {
    try {
      await vincularCliente.mutateAsync({
        vendaId,
        clienteId: cliente.getId(),
        tabelaOrigem,
      })
      setClienteVinculadoLocal({
        id: cliente.getId(),
        nome: cliente.getNome(),
      })
      setSeletorClienteOpen(false)
    } catch {
      // Toast de erro vem do hook
    }
  }

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

  const bloqueado =
    emissaoEmProcessamento || emitirNfe.isPending || vincularCliente.isPending

  return (
    <>
      <SeletorClienteModal
        open={seletorClienteOpen}
        onClose={() => setSeletorClienteOpen(false)}
        onSelect={c => void handleClienteSelecionado(c)}
        title="Vincular cliente à venda"
      />
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex min-h-[160px] flex-col rounded-xl border-2 border-primary bg-primary p-4 text-center shadow-sm sm:p-5">
              <div className="flex flex-1 flex-col items-center justify-center">
                <span className="text-3xl font-extrabold tracking-tight text-info sm:text-4xl">
                  NF-e
                </span>
                <span className="mt-2 max-w-[12rem] text-xs font-medium leading-snug text-gray-200 sm:text-sm">
                  Nota Fiscal eletrônica
                </span>
              </div>
              {!temClienteCadastrado && (
                <div className="mt-4 w-full text-left">
                  <p className="mb-2 text-xs leading-relaxed text-gray-200 text-center">
                    A NF-e exige um <strong className="text-gray-100">cliente vinculado</strong> à venda.
                  </p>
                  <Button
                    type="button"
                    variant="outlined"
                    disabled={bloqueado}
                    onClick={() => setSeletorClienteOpen(true)}
                    className="w-full border-white/80 text-info hover:bg-white/10"
                    sx={{
                      borderColor: 'rgba(255,255,255,0.7)',
                      color: '#fff',
                    }}
                  >
                    {vincularCliente.isPending ? 'Vinculando...' : 'Vincular cliente'}
                  </Button>
                </div>
              )}
              <button
                type="button"
                disabled={bloqueado || !temClienteCadastrado}
                onClick={() => void emitirPorModelo(55)}
                title={
                  !temClienteCadastrado
                    ? 'Vincule um cliente à venda para emitir NF-e'
                    : 'Emitir NF-e'
                }
                className="mt-4 w-full rounded-lg border-2 border-white/50 bg-white/10 py-2.5 text-sm font-semibold text-info shadow-sm transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bloqueado && modeloEmitindo === 55 ? 'Emitindo...' : 'Emitir NF-e'}
              </button>
            </div>
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
    </>
  )
}

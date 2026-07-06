'use client'

import React, { useEffect, useState } from 'react'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { Label } from '@/src/presentation/components/ui/label'
import { useChaveIbpt } from '@/src/presentation/hooks/painel-contador/useChaveIbpt'
import { InfoHint } from '@/src/presentation/components/ui/InfoHint'
import {
  MdCheckCircle,
  MdDelete,
  MdDeleteOutline,
  MdSave,
  MdVisibility,
  MdVisibilityOff,
  MdWarning,
} from 'react-icons/md'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'

export const IBPT_INFO_HINT =
  'IBPT (Impostos Básicos sobre Produtos e Serviços) é a tabela de alíquotas aproximadas de tributos. A chave de acesso é fornecida pelo contador e permite ao sistema consultar esses dados na emissão de notas.'

export function IbptInfoHint() {
  return <InfoHint text={IBPT_INFO_HINT} />
}

interface Etapa5TabelaIbptProps {
  embedded?: boolean
}

export function Etapa5TabelaIbpt({ embedded = false }: Etapa5TabelaIbptProps) {
  const { statusQuery, salvarMutation, removerMutation } = useChaveIbpt()
  const [chaveIbpt, setChaveIbpt] = useState('')
  const isSalvando = salvarMutation.isPending || removerMutation.isPending
  const acaoEmAndamento = salvarMutation.isPending
    ? 'salvar'
    : removerMutation.isPending
      ? 'remover'
      : null
  /** Exibe a chave em texto claro apenas enquanto o usuário mantém o ícone pressionado */
  const [revelarChavePressionando, setRevelarChavePressionando] = useState(false)
  const [modalRemoverAberto, setModalRemoverAberto] = useState(false)
  /** Evita autofill do navegador ao montar o campo (readonly removido no foco). */
  const [bloquearAutofill, setBloquearAutofill] = useState(true)
  const ibptTokenStatus = statusQuery.data?.ibptTokenStatus ?? null
  const isCarregandoStatusIbpt = statusQuery.isLoading
  const chaveCadastrada = ibptTokenStatus === 'CADASTRADO'

  useEffect(() => {
    if (!chaveCadastrada && !isCarregandoStatusIbpt) {
      setBloquearAutofill(true)
    }
  }, [chaveCadastrada, isCarregandoStatusIbpt])

  const handleSalvar = async () => {
    const chave = chaveIbpt.trim()
    if (!chave) return
    await salvarMutation.mutateAsync(chave)
    setChaveIbpt('')
  }

  const handleAbrirModalRemover = () => {
    setModalRemoverAberto(true)
  }

  const handleConfirmarRemocaoIbpt = async () => {
    await removerMutation.mutateAsync()
    setModalRemoverAberto(false)
  }

  const podeSalvar = chaveIbpt.trim().length > 0

  const handlersRevelar = {
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault()
      setRevelarChavePressionando(true)
    },
    onMouseUp: () => setRevelarChavePressionando(false),
    onMouseLeave: () => setRevelarChavePressionando(false),
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault()
      setRevelarChavePressionando(true)
    },
    onTouchEnd: () => setRevelarChavePressionando(false),
    onTouchCancel: () => setRevelarChavePressionando(false),
  }

  const fecharModalRemover = (aberto: boolean) => {
    if (!aberto && isSalvando && acaoEmAndamento === 'remover') return
    setModalRemoverAberto(aberto)
  }

  return (
    <>
      <Dialog
        open={modalRemoverAberto}
        onOpenChange={fecharModalRemover}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent sx={{ p: 3 }}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
                <MdWarning className="text-red-600" size={24} aria-hidden />
              </div>
              <DialogTitle sx={{ fontSize: '1.25rem', fontWeight: 600, color: '#dc2626' }}>
                Remover chave IBPT
              </DialogTitle>
            </div>
            <DialogDescription>
              <span className="mt-2 block text-sm leading-relaxed text-secondary-text">
                Tem certeza de que deseja remover a chave IBPT? Para cadastrar outra chave, remova a
                atual e informe a nova em seguida.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter sx={{ mt: 3, gap: 2 }}>
            <Button
              type="button"
              onClick={() => setModalRemoverAberto(false)}
              disabled={isSalvando && acaoEmAndamento === 'remover'}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              sx={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
                '&:hover': { backgroundColor: '#e5e7eb' },
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmarRemocaoIbpt()}
              disabled={isSalvando && acaoEmAndamento === 'remover'}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white"
              sx={{
                backgroundColor: '#dc2626',
                '&:hover': { backgroundColor: '#b91c1c' },
                '&:disabled': { backgroundColor: '#fca5a5' },
              }}
            >
              <MdDeleteOutline className="mr-2" size={18} />
              {isSalvando && acaoEmAndamento === 'remover' ? 'Removendo...' : 'Confirmar remoção'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className={embedded ? 'space-y-4' : 'space-y-4 md:p-4 p-2'}>
      <div
        className={
          embedded
            ? 'space-y-4'
            : 'rounded-lg border border-primary/20 bg-white p-4 space-y-4'
        }
      >
        {!embedded && (
          <div>
            <h1 className="font-exo font-semibold text-alternate text-base mb-2">
              Chave de acesso IBPT
            </h1>
            <p className="text-sm text-secondary-text leading-relaxed">
              Informe a <strong>chave de acesso</strong> fornecida pelo seu contador. O
              fiscal utiliza essa chave para consultar os dados da tabela IBPT (Impostos Básicos sobre
              Produtos e Serviços) junto ao provedor.
            </p>
          </div>
        )}

        {!embedded && (
          <div className="rounded-lg border border-gray-200 bg-gray-100 p-4 text-black space-y-4">
            <div className="text-sm space-y-1.5">
              <p className="font-inter font-medium text-black">Onde obter a chave</p>
              <ul className="list-disc pl-4 space-y-1 text-black">
                <li>Solicite ao <strong>contador</strong> ou ao <strong>escritório contábil</strong> da empresa.</li>
                <li>Guarde a chave em local seguro; quem possui a chave pode vincular o acesso aos dados fiscais da base IBPT.</li>
              </ul>
            </div>
          </div>
        )}

        {isCarregandoStatusIbpt ? (
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 sm:text-sm">
            <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-alternate border-t-transparent" />
            Verificando chave IBPT...
          </div>
        ) : chaveCadastrada ? (
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-800 sm:text-sm">
            <MdCheckCircle className="shrink-0" size={18} />
            Chave IBPT cadastrada
          </div>
        ) : null}

        {!chaveCadastrada && !isCarregandoStatusIbpt && (
          <div className="space-y-2 w-full md:max-w-md">
            <Label htmlFor="jiffy-ibpt-token" className="text-sm font-medium text-secondary-text">
              Chave IBPT
            </Label>
            <Input
              id="jiffy-ibpt-token"
              type="text"
              placeholder="Cole a chave fornecida pelo contador"
              value={chaveIbpt}
              onChange={e => setChaveIbpt(e.target.value)}
              size="small"
              disabled={isSalvando}
              autoComplete="off"
              sx={{
                '& input:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 100px #fff inset',
                  WebkitTextFillColor: 'inherit',
                },
              }}
              inputProps={{
                'aria-describedby': 'chave-ibpt-dica',
                autoComplete: 'one-time-code',
                name: 'jiffy-ibpt-token',
                readOnly: bloquearAutofill,
                onFocus: () => setBloquearAutofill(false),
                style: revelarChavePressionando
                  ? undefined
                  : ({ WebkitTextSecurity: 'disc' } as React.CSSProperties),
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      type="button"
                      aria-label={
                        revelarChavePressionando
                          ? 'Solte para ocultar a chave'
                          : 'Segure para exibir a chave'
                      }
                      edge="end"
                      size="small"
                      tabIndex={-1}
                      {...handlersRevelar}
                    >
                      {revelarChavePressionando ? (
                        <MdVisibilityOff className="text-secondary-text" size={20} />
                      ) : (
                        <MdVisibility className="text-secondary-text" size={20} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </div>
        )}

        <div className="flex flex-row items-center gap-3">
          {chaveCadastrada ? (
            <Button
              type="button"
              onClick={handleAbrirModalRemover}
              disabled={isSalvando || isCarregandoStatusIbpt}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white"
              sx={{
                backgroundColor: '#dc2626',
                '&:hover': { backgroundColor: '#b91c1c' },
                '&:disabled': { backgroundColor: '#fca5a5', cursor: 'not-allowed' },
              }}
            >
              <MdDelete size={18} />
              {isSalvando && acaoEmAndamento === 'remover' ? 'Removendo...' : 'Remover chave'}
            </Button>
          ) : (
            !isCarregandoStatusIbpt && (
              <Button
                type="button"
                onClick={() => void handleSalvar()}
                disabled={isSalvando || !podeSalvar}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white"
                sx={{
                  backgroundColor: 'var(--color-secondary)',
                  '&:hover': { backgroundColor: 'var(--color-alternate)' },
                  '&:disabled': { backgroundColor: '#ccc', cursor: 'not-allowed' },
                }}
              >
                <MdSave size={16} />
                {isSalvando && acaoEmAndamento === 'salvar' ? 'Salvando...' : 'Cadastrar chave'}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
    </>
  )
}

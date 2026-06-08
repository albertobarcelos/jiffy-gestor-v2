'use client'

import React, { useState } from 'react'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { Label } from '@/src/presentation/components/ui/label'
import { useChaveIbpt } from '@/src/presentation/hooks/painel-contador/useChaveIbpt'
import {
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

export function Etapa5TabelaIbpt() {
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
  const ibptTokenStatus = statusQuery.data?.ibptTokenStatus ?? null
  const isCarregandoStatusIbpt = statusQuery.isLoading

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
                Tem certeza de que deseja remover a chave IBPT da configuração fiscal?
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

      <div className="space-y-4 md:p-4 p-2">
      <div className="rounded-lg border border-primary/20 bg-white p-4 space-y-4">
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

        <div className="rounded-lg border border-gray-200 bg-gray-100 p-4 text-black space-y-4">
          <div className="text-sm space-y-1.5">
            <p className="font-inter font-medium text-black">Onde obter a chave</p>
            <ul className="list-disc pl-4 space-y-1 text-black">
              <li>Solicite ao <strong>contador</strong> ou ao <strong>escritório contábil</strong> da empresa.</li>
              <li>Guarde a chave em local seguro; quem possui a chave pode vincular o acesso aos dados fiscais da base IBPT.</li>
            </ul>
          </div>
          <div className="text-sm space-y-1.5 pt-3 border-t border-gray-300">
            <p className="font-inter font-medium text-black">Atenção</p>
            <ul className="list-disc pl-4 space-y-1 text-black">
              <li>Chave <strong>incorreta</strong> ou <strong>expirada</strong> impede a consulta correta aos dados IBPT.</li>
              <li>
                Use <strong>Remover chave</strong> se precisar retirar o token salvo; será pedida
                confirmação antes de enviar.
              </li>
              <li>Não compartilhe a chave com pessoas fora do seu controle; trate como credencial sensível.</li>
            </ul>
          </div>
        </div>

        <div className="space-y-2 w-full md:max-w-md">
          {isCarregandoStatusIbpt ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-secondary-text">
              Verificando status da chave IBPT...
            </div>
          ) : ibptTokenStatus === 'CADASTRADO' ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Já existe chave IBPT cadastrada para esta empresa.
            </div>
          ) : ibptTokenStatus === 'NAO_CADASTRADO' ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-secondary-text">
              Nenhuma chave IBPT cadastrada. Informe a chave abaixo para habilitar a consulta da tabela.
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-secondary-text">
              Não foi possível verificar o status da chave IBPT no momento.
            </div>
          )}
        </div>

        <div className="space-y-2 w-full md:max-w-md">
          <Label htmlFor="chave-ibpt" className="text-sm font-medium text-secondary-text">
            Chave IBPT
          </Label>
          <Input
            id="chave-ibpt"
            type={revelarChavePressionando ? 'text' : 'password'}
            name="chave-ibpt"
            autoComplete="off"
            placeholder="Cole a chave fornecida pelo contador"
            value={chaveIbpt}
            onChange={e => setChaveIbpt(e.target.value)}
            size="small"
            disabled={isSalvando}
            inputProps={{ 'aria-describedby': 'chave-ibpt-dica' }}
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

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Button
            type="button"
            onClick={() => void handleSalvar()}
            disabled={isSalvando || !podeSalvar}
            className="rounded-lg px-4 py-2 text-white text-sm font-medium"
            sx={{
              backgroundColor: 'var(--color-secondary)',
              '&:hover': { backgroundColor: 'var(--color-alternate)' },
              '&:disabled': { backgroundColor: '#ccc', cursor: 'not-allowed' },
            }}
          >
            <MdSave className="mr-2" size={16} />
            {isSalvando && acaoEmAndamento === 'salvar' ? 'Salvando...' : 'Salvar chave'}
          </Button>

          <Button
            type="button"
            variant="outlined"
            onClick={handleAbrirModalRemover}
            disabled={isSalvando}
            className="rounded-lg px-4 py-2 text-sm font-medium border-red-300 text-red-700 hover:bg-red-50"
            sx={{
              borderColor: 'rgba(185, 28, 28, 0.45)',
              color: 'rgb(185, 28, 28)',
              '&:hover': { borderColor: 'rgb(185, 28, 28)', backgroundColor: 'rgba(254, 226, 226, 0.5)' },
              '&:disabled': { borderColor: '#ccc', color: '#999' },
            }}
          >
            <MdDeleteOutline className="mr-2" size={18} />
            {isSalvando && acaoEmAndamento === 'remover' ? 'Removendo...' : 'Remover chave'}
          </Button>
        </div>
      </div>
    </div>
    </>
  )
}

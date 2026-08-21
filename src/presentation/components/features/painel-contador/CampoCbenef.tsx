'use client'

import { useEffect, useRef, useState } from 'react'
import IconButton from '@mui/material/IconButton'
import { MdSearch } from 'react-icons/md'
import { Input } from '@/src/presentation/components/ui/input'
import { Label } from '@/src/presentation/components/ui/label'
import { useCbenef } from '@/src/presentation/hooks/painel-contador/useCbenef'
import { BuscarCbenefModal } from './BuscarCbenefModal'
import {
  codigoCbenefTemTamanhoValido,
  normalizarCodigoCbenefParaValidacao,
} from '@/src/domain/entities/painel-contador/cbenefRegras'

type CbenefFeedback = {
  status: 'idle' | 'loading' | 'valid' | 'invalid'
  descricao?: string
  mensagem?: string
}

interface CampoCbenefProps {
  value: string
  onChange: (codigo: string) => void
  uf: string
  cst?: string
  onBuscaAbertaChange?: (aberto: boolean) => void
}

export function CampoCbenef({
  value,
  onChange,
  uf,
  cst,
  onBuscaAbertaChange,
}: CampoCbenefProps) {
  const { validarMutation } = useCbenef(uf)
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [filtroInicial, setFiltroInicial] = useState('')
  const ignorarBlurRef = useRef(false)
  const [feedback, setFeedback] = useState<CbenefFeedback>({ status: 'idle' })

  useEffect(() => {
    return () => onBuscaAbertaChange?.(false)
  }, [onBuscaAbertaChange])

  const abrirBusca = (filtro: string) => {
    ignorarBlurRef.current = true
    setFiltroInicial(filtro)
    setBuscaAberta(true)
    onBuscaAbertaChange?.(true)
  }

  const fecharBusca = () => {
    setBuscaAberta(false)
    onBuscaAbertaChange?.(false)
  }

  const validar = async (codigo: string) => {
    const normalizado = normalizarCodigoCbenefParaValidacao(codigo)
    if (!normalizado) {
      setFeedback({ status: 'idle' })
      return
    }
    if (!codigoCbenefTemTamanhoValido(normalizado)) {
      setFeedback({
        status: 'invalid',
        mensagem: 'Formato de código inválido. Use 8 ou 10 caracteres, ou SEM CBENEF.',
      })
      return
    }
    setFeedback({ status: 'loading' })
    try {
      const resultado = await validarMutation.mutateAsync(normalizado)
      setFeedback(
        resultado.valido
          ? {
              status: 'valid',
              descricao: resultado.descricao ?? undefined,
              mensagem: resultado.mensagem ?? undefined,
            }
          : { status: 'invalid', mensagem: resultado.mensagem ?? undefined }
      )
    } catch {
      setFeedback({ status: 'invalid' })
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="codigoBeneficioFiscal">Código de Benefício Fiscal (cBenef)</Label>
      <div className="flex items-center gap-1">
        <Input
          id="codigoBeneficioFiscal"
          value={value}
          onChange={(e) => {
            const proximo = e.target.value.toUpperCase().slice(0, 10)
            onChange(proximo)
            setFeedback({ status: 'idle' })
            abrirBusca(proximo)
          }}
          onBlur={() => {
            if (ignorarBlurRef.current || buscaAberta) {
              ignorarBlurRef.current = false
              return
            }
            const normalizado = normalizarCodigoCbenefParaValidacao(value)
            onChange(normalizado)
            void validar(normalizado)
          }}
          placeholder="Digite para buscar ou SP070060"
          inputProps={{ maxLength: 10, autoComplete: 'off', spellCheck: 'false' }}
          size="small"
        />
        <IconButton
          type="button"
          aria-label="Buscar cBenef"
          onClick={() => abrirBusca(value)}
          size="small"
          disabled={!uf}
          sx={{ flexShrink: 0 }}
        >
          <MdSearch size={22} />
        </IconButton>
      </div>
      <p className="text-xs text-secondary-text/70">
        Ao digitar, abre a lista da UF. Inclui a opção SEM CBENEF. Opcional fora de SP.
      </p>
      {feedback.status === 'loading' ? (
        <p className="text-xs text-secondary-text">Validando código...</p>
      ) : null}
      {feedback.status === 'valid' ? (
        <p className="text-xs text-green-700">
          ✅ {feedback.mensagem || feedback.descricao || 'Código válido e vigente.'}
        </p>
      ) : null}
      {feedback.status === 'invalid' ? (
        <p className="text-xs text-amber-700">
          ⚠️ {feedback.mensagem || 'código não encontrado na tabela da UF'}
        </p>
      ) : null}

      <BuscarCbenefModal
        open={buscaAberta}
        onClose={fecharBusca}
        uf={uf}
        cst={cst}
        cstSelecionado={cst}
        filtroInicial={filtroInicial}
        onSelect={(item) => {
          onChange(item.codigo)
          setFeedback({ status: 'valid', descricao: item.descricao })
        }}
      />
    </div>
  )
}

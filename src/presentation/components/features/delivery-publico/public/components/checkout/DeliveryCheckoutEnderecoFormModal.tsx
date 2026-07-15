'use client'

import { useState } from 'react'
import { ChevronDown, Home, LocateFixed } from 'lucide-react'
import {
  consultarCepViaApi,
  formatarCepMascara,
  normalizarDigitosCep,
} from '@/src/shared/utils/consultaCep'
import { obterEnderecoPorGps } from '@/src/shared/utils/geolocalizacaoEndereco'
import { showToast } from '@/src/shared/utils/toast'
import type { CheckoutFormData } from '../../../shared/utils/montarPedidoPublico'
import { DeliveryCheckoutStepModal } from './DeliveryCheckoutStepModal'

type DeliveryCheckoutEnderecoFormModalProps = {
  form: CheckoutFormData
  onChange: <K extends keyof CheckoutFormData>(key: K, value: CheckoutFormData[K]) => void
  onClose: () => void
  onCancelar: () => void
  onConfirmar: () => Promise<void>
}

export function DeliveryCheckoutEnderecoFormModal({
  form,
  onChange,
  onClose,
  onCancelar,
  onConfirmar,
}: DeliveryCheckoutEnderecoFormModalProps) {
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [buscandoGps, setBuscandoGps] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const buscarCep = async () => {
    const digitos = normalizarDigitosCep(form.cep)
    if (digitos.length !== 8) {
      showToast.error('Informe um CEP com 8 dígitos')
      return
    }
    setBuscandoCep(true)
    try {
      const dados = await consultarCepViaApi(digitos)
      onChange('cep', formatarCepMascara(dados.cep))
      if (dados.logradouro) onChange('rua', dados.logradouro)
      if (dados.bairro) onChange('bairro', dados.bairro)
      if (dados.localidade) onChange('cidade', dados.localidade)
      if (dados.uf) onChange('estado', dados.uf)
      if (dados.complemento && !form.complemento.trim()) {
        onChange('complemento', dados.complemento)
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao consultar CEP')
    } finally {
      setBuscandoCep(false)
    }
  }

  const usarLocalizacaoAtual = async () => {
    setBuscandoGps(true)
    try {
      const dados = await obterEnderecoPorGps()
      if (dados.cep) onChange('cep', dados.cep)
      if (dados.rua) onChange('rua', dados.rua)
      if (dados.numero) onChange('numero', dados.numero)
      if (dados.bairro) onChange('bairro', dados.bairro)
      if (dados.cidade) onChange('cidade', dados.cidade)
      if (dados.estado) onChange('estado', dados.estado)
      showToast.success('Localização aplicada. Confira o número e o complemento.')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao obter localização')
    } finally {
      setBuscandoGps(false)
    }
  }

  const handleConfirmar = async () => {
    if (!form.rua.trim() || !form.numero.trim() || !form.bairro.trim()) {
      showToast.error('Preencha rua, número e bairro')
      return
    }
    if (!form.cidade.trim()) {
      showToast.error('Informe a cidade')
      return
    }
    setSalvando(true)
    try {
      await onConfirmar()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar endereço')
    } finally {
      setSalvando(false)
    }
  }

  const fieldClass =
    'w-full rounded-xl border bg-transparent px-3 py-3 text-sm outline-none delivery-text-primary'
  const fieldStyle = { borderColor: 'var(--delivery-border)' } as const

  return (
    <DeliveryCheckoutStepModal
      title="Confirme seu endereço"
      onClose={onClose}
      showBack
      onBack={onCancelar}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            disabled={salvando}
            onClick={onCancelar}
            className="min-h-[48px] flex-1 rounded-xl border px-3 text-sm font-semibold uppercase tracking-wide delivery-text-primary disabled:opacity-60"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={salvando}
            onClick={() => void handleConfirmar()}
            className="min-h-[48px] flex-1 rounded-xl px-3 text-sm font-semibold uppercase tracking-wide disabled:opacity-60"
            style={{
              backgroundColor: 'var(--delivery-primary-dark)',
              color: 'var(--delivery-btn-text, #ffffff)',
            }}
          >
            {salvando ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <button
          type="button"
          disabled={buscandoGps}
          onClick={() => void usarLocalizacaoAtual()}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold delivery-text-primary disabled:opacity-60"
          style={{ borderColor: 'var(--delivery-border)' }}
        >
          <LocateFixed className="h-4 w-4" aria-hidden />
          {buscandoGps ? 'Obtendo localização...' : 'Usar localização atual'}
        </button>

        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
              CEP
            </span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={9}
              placeholder="00000-000"
              value={form.cep}
              onChange={e => onChange('cep', formatarCepMascara(e.target.value))}
              onBlur={() => {
                if (normalizarDigitosCep(form.cep).length === 8) void buscarCep()
              }}
              className={fieldClass}
              style={fieldStyle}
            />
          </label>
          <button
            type="button"
            disabled={buscandoCep || normalizarDigitosCep(form.cep).length !== 8}
            onClick={() => void buscarCep()}
            className="shrink-0 self-stretch rounded-xl border px-3 text-xs font-semibold uppercase disabled:opacity-50"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            {buscandoCep ? '...' : 'Buscar'}
          </button>
        </div>

        <label className="relative block">
          <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
            Cidade
          </span>
          <div className="relative">
            <input
              type="text"
              value={
                form.cidade && form.estado
                  ? `${form.cidade} - ${form.estado}`
                  : form.cidade
              }
              onChange={e => {
                const raw = e.target.value
                const parts = raw.split('-').map(p => p.trim())
                if (parts.length >= 2 && parts[parts.length - 1].length <= 2) {
                  onChange('estado', parts.pop()!.toUpperCase())
                  onChange('cidade', parts.join(' - '))
                } else {
                  onChange('cidade', raw)
                }
              }}
              className={`${fieldClass} pr-9`}
              style={fieldStyle}
              placeholder="Cidade - UF"
            />
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40"
              aria-hidden
            />
          </div>
        </label>

        <label className="relative block">
          <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
            Rua/Av.
          </span>
          <input
            type="text"
            value={form.rua}
            onChange={e => onChange('rua', e.target.value)}
            className={fieldClass}
            style={fieldStyle}
          />
        </label>

        <label className="relative block">
          <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
            Bairro
          </span>
          <input
            type="text"
            value={form.bairro}
            onChange={e => onChange('bairro', e.target.value)}
            placeholder="Selecione seu bairro"
            className={fieldClass}
            style={fieldStyle}
          />
        </label>

        <div className="flex gap-2">
          <label className="relative w-[38%] shrink-0">
            <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
              Número
            </span>
            <input
              type="text"
              value={form.numero}
              onChange={e => onChange('numero', e.target.value)}
              className={fieldClass}
              style={fieldStyle}
            />
          </label>
          <label className="relative min-w-0 flex-1">
            <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
              Complemento
            </span>
            <input
              type="text"
              value={form.complemento}
              onChange={e => onChange('complemento', e.target.value)}
              className={fieldClass}
              style={fieldStyle}
            />
          </label>
        </div>

        <label className="relative block">
          <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
            Ponto de referência
          </span>
          <input
            type="text"
            value={form.pontoReferencia}
            onChange={e => onChange('pontoReferencia', e.target.value)}
            className={fieldClass}
            style={fieldStyle}
          />
        </label>

        <div>
          <p className="mb-2 text-sm font-semibold delivery-text-primary">
            Salvar endereço como:
          </p>
          <div
            className="flex items-center gap-2 rounded-xl border px-3 py-2.5"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            <Home className="h-4 w-4 shrink-0" style={{ color: 'var(--delivery-text-muted)' }} />
            <select
              value={form.etiquetaEndereco}
              onChange={e => {
                const etiqueta = e.target.value as CheckoutFormData['etiquetaEndereco']
                onChange('etiquetaEndereco', etiqueta)
                const labels = { casa: 'Casa', trabalho: 'Trabalho', outro: 'Outro' } as const
                onChange('apelidoEndereco', labels[etiqueta])
              }}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none delivery-text-primary"
            >
              <option value="casa">Casa</option>
              <option value="trabalho">Trabalho</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>
      </div>
    </DeliveryCheckoutStepModal>
  )
}

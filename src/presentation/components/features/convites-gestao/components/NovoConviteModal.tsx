'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { Input } from '@/src/presentation/components/ui/input'

const CONVITE_FORM_ID = 'novo-convite-gestor-form'

type PerfilOption = { id: string; role: string }

export function NovoConviteModal({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: { email: string; perfilGestorId: string }) => Promise<void>
}) {
  const auth = useAuthStore(s => s.auth)
  const [email, setEmail] = useState('')
  const [perfilGestorId, setPerfilGestorId] = useState('')
  const [perfis, setPerfis] = useState<PerfilOption[]>([])
  const [loadingPerfis, setLoadingPerfis] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [erroLocal, setErroLocal] = useState<string | null>(null)

  const prevOpenRef = useRef(false)

  /** Nova sessão ao abrir o painel — sem e-mail/perfil pré-preenchidos. */
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setEmail('')
      setPerfilGestorId('')
      setErroLocal(null)
    }
    prevOpenRef.current = open
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }
    let cancelado = false
    const token = auth?.getAccessToken()
    if (!token) {
      setPerfis([])
      return
    }
    setLoadingPerfis(true)
    void (async () => {
      try {
        const res = await fetch('/api/pessoas/perfis-gestor?limit=100&offset=0', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        const data = await res.json().catch(() => ({}))
        const items = Array.isArray(data.items) ? data.items : []
        const opts: PerfilOption[] = items
          .map((p: { id?: unknown; role?: unknown }) => ({
            id: String(p.id ?? ''),
            role: String(p.role ?? ''),
          }))
          .filter((p: PerfilOption) => p.id.length > 0)
        if (!cancelado) {
          setPerfis(opts)
        }
      } catch {
        if (!cancelado) {
          setPerfis([])
        }
      } finally {
        if (!cancelado) {
          setLoadingPerfis(false)
        }
      }
    })()
    return () => {
      cancelado = true
    }
  }, [open, auth])

  const emailTrim = email.trim()
  const canSubmit =
    Boolean(emailTrim && perfilGestorId) &&
    !loadingPerfis &&
    perfis.length > 0

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    const disabledFooter = !canSubmit || submitting
    return {
      barActionOrder: ['cancel', 'save'],
      showCancel: true,
      cancelLabel: 'Fechar',
      cancelVariant: 'primaryTint10',
      onCancel: () => onOpenChange(false),
      showSave: true,
      saveLabel: submitting ? 'Enviando…' : 'Criar convite',
      saveFormId: CONVITE_FORM_ID,
      saveLoading: submitting,
      saveDisabled: disabledFooter,
    }
  }, [canSubmit, submitting, onOpenChange])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErroLocal(null)
    if (!emailTrim || !perfilGestorId) {
      setErroLocal('Preencha e-mail e perfil.')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ email: emailTrim, perfilGestorId })
      setEmail('')
      setPerfilGestorId('')
      onOpenChange(false)
    } catch (err) {
      setErroLocal(err instanceof Error ? err.message : 'Erro ao criar convite')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <JiffySidePanelModal
      open={open}
      onClose={() => onOpenChange(false)}
      title="Novo convite"
      scrollableBody={false}
      footerVariant="bar"
      panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,45vw)]"
      footerActions={footerActions}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide md:px-6">
          <form id={CONVITE_FORM_ID} onSubmit={handleSubmit} className="space-y-6">
            <p className="font-['Nunito',sans-serif] text-sm text-secondary-text">
              Informe o e-mail do convidado e o perfil gestor vinculado ao convite.
            </p>

            {erroLocal ? (
              <p className="text-sm text-red-600" role="alert">
                {erroLocal}
              </p>
            ) : null}

            <div className="bg-white">
              <div className="mb-4 flex items-center gap-5">
                <h2 className="shrink-0 text-sm font-semibold text-primary md:text-xl">
                  Dados do convite
                </h2>
                <div className="h-px min-w-0 flex-1 bg-primary/70" aria-hidden />
              </div>

              <div className="space-y-4">
                <Input
                  label="E-mail"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={submitting}
                  required
                  placeholder="usuario@empresa.com"
                  className="bg-white"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-input': {
                      padding: '10px 12px',
                    },
                  }}
                />

                {/* Mesmo modelo visual do Input (Outlined): label na borda superior */}
                <TextField
                  id="convite-perfil"
                  name="perfilGestorId"
                  select
                  label="Perfil gestor"
                  value={perfilGestorId}
                  onChange={e => setPerfilGestorId(String(e.target.value))}
                  disabled={submitting || loadingPerfis || perfis.length === 0}
                  required
                  fullWidth
                  variant="outlined"
                  size="small"
                  className="bg-white"
                  /** Com valor vazio, sem shrink o label outlined fica no meio e sobrepõe o placeholder */
                  InputLabelProps={{ shrink: true }}
                  SelectProps={{ displayEmpty: true }}
                  sx={{
                    '& .MuiOutlinedInput-input': {
                      padding: '10px 12px',
                    },
                  }}
                >
                  {loadingPerfis ? (
                    <MenuItem value="" disabled>
                      Carregando perfis…
                    </MenuItem>
                  ) : perfis.length === 0 ? (
                    <MenuItem value="" disabled>
                      Nenhum perfil disponível
                    </MenuItem>
                  ) : (
                    [
                      <MenuItem key="__convite-perfil-placeholder" value="">
                        <span className="text-secondary-text">Selecione o perfil</span>
                      </MenuItem>,
                      ...perfis.map(p => (
                        <MenuItem key={p.id} value={String(p.id)}>
                          {p.role || p.id}
                        </MenuItem>
                      )),
                    ]
                  )}
                </TextField>
              </div>
            </div>
          </form>
        </div>
      </div>
    </JiffySidePanelModal>
  )
}

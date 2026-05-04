'use client'

import { useSyncExternalStore } from 'react'
import { Box, Paper, Typography } from '@mui/material'
import { MdAutorenew, MdHourglassEmpty, MdDescription } from 'react-icons/md'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import {
  finishDocumentoFiscalPdfRetryModal,
  getDocumentoFiscalPdfRetryModalServerSnapshot,
  getDocumentoFiscalPdfRetryModalSnapshot,
  subscribeDocumentoFiscalPdfRetryModal,
} from '@/src/presentation/utils/documentoFiscalPdfRetryModalStore'

/**
 * Modal global para escolha entre regenerar DANFE/DANFCE ou aguardar retry automático.
 * Montado uma vez no layout raiz.
 */
export function DocumentoFiscalPdfRetryModal() {
  const modalState = useSyncExternalStore(
    subscribeDocumentoFiscalPdfRetryModal,
    getDocumentoFiscalPdfRetryModalSnapshot,
    getDocumentoFiscalPdfRetryModalServerSnapshot
  )

  const open = modalState.open
  const errorMessage = open ? modalState.errorMessage : ''
  const documentoLabel = open ? modalState.documentoLabel : 'DANFE'

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) finishDocumentoFiscalPdfRetryModal(null)
      }}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, overflow: 'hidden' },
      }}
    >
      {open && (
        <>
          <DialogHeader sx={{ px: 2.5, pt: 2.5, pb: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                }}
              >
                <MdDescription size={26} />
              </Box>
              <Box>
                <DialogTitle sx={{ mb: 0, fontSize: '1.15rem' }}>
                  {documentoLabel} indisponível no momento
                </DialogTitle>
                <DialogDescription className="mt-0.5">
                  O PDF ainda pode estar sendo gerado no servidor fiscal.
                </DialogDescription>
              </Box>
            </Box>
          </DialogHeader>

          <DialogContent sx={{ px: 2.5, pt: 2, pb: 1 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="body2"
                sx={{ fontFamily: 'Nunito, sans-serif', color: 'text.primary', lineHeight: 1.6 }}
              >
                {errorMessage}
              </Typography>
            </Paper>
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 2, color: 'text.secondary', fontFamily: 'Nunito, sans-serif' }}
            >
              Escolha como deseja prosseguir:
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1.5 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 1,
                  },
                }}
                onClick={() => finishDocumentoFiscalPdfRetryModal('regenerar')}
              >
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Box sx={{ color: 'primary.main', display: 'flex', mt: 0.5, flexShrink: 0 }}>
                    <MdAutorenew size={22} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontFamily: 'Exo, sans-serif' }}>
                      Regenerar {documentoLabel} agora
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontFamily: 'Nunito, sans-serif' }}>
                      Solicita uma nova geração do PDF ao backend e, em seguida, tenta abrir automaticamente.
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 1,
                  },
                }}
                onClick={() => finishDocumentoFiscalPdfRetryModal('aguardar')}
              >
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Box sx={{ color: 'primary.main', display: 'flex', mt: 0.5, flexShrink: 0 }}>
                    <MdHourglassEmpty size={22} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontFamily: 'Exo, sans-serif' }}>
                      Aguardar e tentar de novo
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontFamily: 'Nunito, sans-serif' }}>
                      O sistema consulta o servidor algumas vezes (a cada poucos segundos) até o PDF ficar pronto.
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
          </DialogContent>

          <DialogFooter sx={{ px: 2.5, pb: 2, pt: 0, justifyContent: 'flex-end' }}>
            <Button variant="text" onClick={() => finishDocumentoFiscalPdfRetryModal(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </>
      )}
    </Dialog>
  )
}

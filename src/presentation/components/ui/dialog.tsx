'use client'

import * as React from 'react'
import {
  Dialog as MuiDialog,
  DialogProps as MuiDialogProps,
  DialogTitle as MuiDialogTitle,
  DialogContent as MuiDialogContent,
  DialogActions as MuiDialogActions,
  Typography,
  Box,
} from '@mui/material'

export interface DialogProps extends Omit<MuiDialogProps, 'open'> {
  open: boolean
  onOpenChange?: (open: boolean) => void
}

export const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({ open, onOpenChange, children, ...props }, ref) => {
    return (
      <MuiDialog
        ref={ref}
        open={open}
        onClose={() => onOpenChange?.(false)}
        {...props}
      >
        {children}
      </MuiDialog>
    )
  }
)

Dialog.displayName = 'Dialog'

export const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <Box ref={ref} sx={{ p: 3, pb: 2 }} {...props}>
        {children}
      </Box>
    )
  }
)

DialogHeader.displayName = 'DialogHeader'

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  sx?: any
}

export const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, children, sx, ...props }, ref) => {
    return (
      <MuiDialogTitle
        ref={ref}
        sx={{ p: 0, fontFamily: 'Exo, sans-serif', fontWeight: 600, ...sx }}
        {...props}
      >
        {children}
      </MuiDialogTitle>
    )
  }
)

DialogTitle.displayName = 'DialogTitle'

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  return (
    <Typography
      ref={ref}
      variant="body2"
      color="text.secondary"
      sx={{ mt: 1, fontFamily: 'Nunito, sans-serif' }}
      {...props}
    >
      {children}
    </Typography>
  )
})

DialogDescription.displayName = 'DialogDescription'

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  sx?: any
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, sx, ...props }, ref) => {
    return (
      <MuiDialogContent ref={ref} sx={{ p: 3, ...sx }} {...props}>
        {children}
      </MuiDialogContent>
    )
  }
)

DialogContent.displayName = 'DialogContent'

export const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <MuiDialogActions ref={ref} sx={{ p: 3, pt: 2 }} {...props}>
        {children}
      </MuiDialogActions>
    )
  }
)

DialogFooter.displayName = 'DialogFooter'

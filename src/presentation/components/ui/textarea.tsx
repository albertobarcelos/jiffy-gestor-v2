'use client'

import * as React from 'react'
import { TextField, TextFieldProps } from '@mui/material'

export interface TextareaProps extends Omit<TextFieldProps, 'multiline' | 'rows'> {
  rows?: number
}

/**
 * Componente Textarea usando Material UI TextField
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ rows = 4, ...props }, ref) => {
    return <TextField ref={ref as any} multiline rows={rows} fullWidth {...props} />
  }
)

Textarea.displayName = 'Textarea'

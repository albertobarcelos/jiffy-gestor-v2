'use client'

import * as React from 'react'
import { Checkbox as MuiCheckbox, CheckboxProps as MuiCheckboxProps } from '@mui/material'

export interface CheckboxProps extends MuiCheckboxProps {}

/**
 * Componente Checkbox usando Material UI
 */
export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>((props, ref) => {
  return <MuiCheckbox ref={ref} {...props} />
})

Checkbox.displayName = 'Checkbox'

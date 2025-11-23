'use client'

import * as React from 'react'
import { Switch as MuiSwitch, SwitchProps as MuiSwitchProps } from '@mui/material'

export interface SwitchProps extends MuiSwitchProps {}

/**
 * Componente Switch usando Material UI
 */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>((props, ref) => {
  return <MuiSwitch ref={ref} {...props} />
})

Switch.displayName = 'Switch'

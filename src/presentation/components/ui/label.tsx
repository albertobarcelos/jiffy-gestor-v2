'use client'

import * as React from 'react'
import { InputLabel, InputLabelProps } from '@mui/material'

export interface LabelProps extends InputLabelProps {}

/**
 * Componente Label usando Material UI InputLabel
 */
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>((props, ref) => {
  return <InputLabel ref={ref} {...props} />
})

Label.displayName = 'Label'

'use client'

import * as React from 'react'
import {
  Select as MuiSelect,
  MenuItem,
  FormControl,
  InputLabel,
  SelectProps as MuiSelectProps,
} from '@mui/material'

export interface SelectProps extends Omit<MuiSelectProps, 'variant'> {
  options?: Array<{ value: string | number; label: string }>
}

/**
 * Componente Select usando Material UI
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, children, label, ...props }, ref) => {
    return (
      <FormControl fullWidth>
        {label && <InputLabel>{label}</InputLabel>}
        <MuiSelect ref={ref} label={label} {...props}>
          {options
            ? options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))
            : children}
        </MuiSelect>
      </FormControl>
    )
  }
)

Select.displayName = 'Select'

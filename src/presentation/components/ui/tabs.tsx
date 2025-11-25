'use client'

import * as React from 'react'
import {
  Tabs as MuiTabs,
  Tab,
  TabProps,
  TabsProps as MuiTabsProps,
  Box,
} from '@mui/material'

export interface TabsProps extends Omit<MuiTabsProps, 'onChange'> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ defaultValue, value, onValueChange, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || value || '0')

    const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
      setInternalValue(newValue)
      onValueChange?.(newValue)
    }

    return (
      <MuiTabs
        ref={ref}
        value={value || internalValue}
        onChange={handleChange}
        {...props}
      >
        {children}
      </MuiTabs>
    )
  }
)

Tabs.displayName = 'Tabs'

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(({ children, ...props }, ref) => {
  return (
    <Box ref={ref} {...props}>
      {children}
    </Box>
  )
})

TabsList.displayName = 'TabsList'

export interface TabsTriggerProps extends TabProps {
  value: string
}

export const TabsTrigger = React.forwardRef<HTMLDivElement, TabsTriggerProps>((props, ref) => {
  return <Tab ref={ref as any} {...props} />
})

TabsTrigger.displayName = 'TabsTrigger'

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, children, ...props }, ref) => {
    return (
      <Box ref={ref} role="tabpanel" hidden={false} {...props}>
        {children}
      </Box>
    )
  }
)

TabsContent.displayName = 'TabsContent'

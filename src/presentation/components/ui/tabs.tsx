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
  ({ defaultValue, value: controlledValue, onValueChange, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || controlledValue || '0')

    const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
      setInternalValue(newValue)
      onValueChange?.(newValue)
    }

    const activeValue = controlledValue || internalValue; // Determina o valor ativo

    return (
      <MuiTabs
        ref={ref}
        value={activeValue}
        onChange={handleChange}
        {...props}
      >
        {React.Children.map(children, child => {
          // Injeta activeTabValue em TabsContent
          if (React.isValidElement(child) && (child.type as any).displayName === 'TabsContent') {
            return React.cloneElement(child as React.ReactElement<TabsContentProps>, { activeTabValue: activeValue });
          }
          return child;
        })}
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

export interface TabsTriggerProps extends Omit<TabProps, 'fullWidth' | 'indicator' | 'selectionFollowsFocus' | 'textColor'> {
  value: string
  label?: React.ReactNode // Adicionar prop label
}

export const TabsTrigger = React.forwardRef<HTMLDivElement, TabsTriggerProps>(({ label, value, disabled, icon, iconPosition, wrapped, sx, ...props }, ref) => {
  return <Tab ref={ref as any} label={label} value={value} disabled={disabled} icon={icon} iconPosition={iconPosition} wrapped={wrapped} sx={sx} {...props} />
})

TabsTrigger.displayName = 'TabsTrigger'

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  activeTabValue?: string; // Adicionar prop para o valor da aba ativa
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, activeTabValue, children, ...props }, ref) => {
    const isHidden = value !== activeTabValue;
    return (
      <Box ref={ref} role="tabpanel" hidden={isHidden} {...props}>
        {children}
      </Box>
    )
  }
)

TabsContent.displayName = 'TabsContent'

'use client'

import * as React from 'react'
import {
  Menu,
  MenuItem as MuiMenuItem,
  MenuProps,
  IconButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material'

export interface DropdownMenuProps extends Omit<MenuProps, 'open'> {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// Context para compartilhar estado entre Trigger e Content
const DropdownMenuContext = React.createContext<{
  anchorEl: HTMLElement | null
  setAnchorEl: (el: HTMLElement | null) => void
  open: boolean
  onClose: () => void
} | null>(null)

export const DropdownMenu = React.forwardRef<HTMLDivElement, DropdownMenuProps>(
  ({ trigger, open, onOpenChange, children, ...props }, ref) => {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
    const isOpen = open !== undefined ? open : Boolean(anchorEl)

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget)
      onOpenChange?.(true)
    }

    const handleClose = () => {
      setAnchorEl(null)
      onOpenChange?.(false)
    }

    return (
      <DropdownMenuContext.Provider
        value={{
          anchorEl,
          setAnchorEl,
          open: isOpen,
          onClose: handleClose,
        }}
      >
        {trigger && (
          <div onClick={handleClick}>
            {trigger}
          </div>
        )}
        <Menu
          ref={ref}
          anchorEl={anchorEl}
          open={isOpen}
          onClose={handleClose}
          {...props}
        >
          {children}
        </Menu>
      </DropdownMenuContext.Provider>
    )
  }
)

DropdownMenu.displayName = 'DropdownMenu'

// DropdownMenuTrigger - Componente para o botão que abre o menu
export interface DropdownMenuTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLDivElement,
  DropdownMenuTriggerProps
>(({ asChild, children, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext)
  
  if (!context) {
    // Se não estiver dentro de DropdownMenu, retorna children sem wrapper
    return <>{children}</>
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    context.setAnchorEl(event.currentTarget)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: handleClick,
      ref,
    } as any)
  }

  return (
    <div ref={ref} onClick={handleClick} {...props}>
      {children}
    </div>
  )
})

DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

// DropdownMenuContent - Componente para o conteúdo do menu
export interface DropdownMenuContentProps extends Omit<MenuProps, 'open' | 'anchorEl'> {
  align?: 'start' | 'end' | 'center'
  children: React.ReactNode
}

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(({ align, children, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext)
  
  if (!context) {
    return null
  }

  return (
    <Menu
      ref={ref}
      anchorEl={context.anchorEl}
      open={context.open}
      onClose={context.onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: align === 'end' ? 'right' : align === 'start' ? 'left' : 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: align === 'end' ? 'right' : align === 'start' ? 'left' : 'center',
      }}
      {...props}
    >
      {children}
    </Menu>
  )
})

DropdownMenuContent.displayName = 'DropdownMenuContent'

export interface DropdownMenuItemProps extends React.ComponentPropsWithoutRef<typeof MuiMenuItem> {
  icon?: React.ReactNode
}

export const DropdownMenuItem = React.forwardRef<HTMLLIElement, DropdownMenuItemProps>(
  ({ icon, children, ...props }, ref) => {
    return (
      <MuiMenuItem ref={ref} {...props}>
        {icon && <ListItemIcon>{icon}</ListItemIcon>}
        <ListItemText>{children}</ListItemText>
      </MuiMenuItem>
    )
  }
)

DropdownMenuItem.displayName = 'DropdownMenuItem'

export const DropdownMenuSeparator = () => {
  return <Divider />
}

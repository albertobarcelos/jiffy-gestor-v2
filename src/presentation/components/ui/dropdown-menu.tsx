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
      <>
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
      </>
    )
  }
)

DropdownMenu.displayName = 'DropdownMenu'

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
